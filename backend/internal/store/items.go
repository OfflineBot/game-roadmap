package store

import (
	"database/sql"
	"errors"
	"fmt"
)

// Categories are at most two levels deep. The checklist belongs to the
// top-level category and applies to every asset inside it and its children.
type Category struct {
	ID        int64           `json:"id"`
	ParentID  *int64          `json:"parent_id"`
	Name      string          `json:"name"`
	Checklist []ChecklistItem `json:"checklist"`
	Assets    []Asset         `json:"assets"`
	Children  []Category      `json:"children"`
}

type ChecklistItem struct {
	ID    int64  `json:"id"`
	Label string `json:"label"`
}

type Asset struct {
	ID     int64   `json:"id"`
	Name   string  `json:"name"`
	Notes  string  `json:"notes"`
	Checks []int64 `json:"checks"`
}

type CategoryInput struct {
	Name     string `json:"name"`
	ParentID *int64 `json:"parent_id"`
}

type NamePatch struct {
	Name *string `json:"name"`
}

type LabelInput struct {
	Label string `json:"label"`
}

type LabelPatch struct {
	Label *string `json:"label"`
}

type AssetInput struct {
	Name string `json:"name"`
}

type AssetPatch struct {
	Name  *string `json:"name"`
	Notes *string `json:"notes"`
}

type CheckInput struct {
	ChecklistItemID int64 `json:"checklist_item_id"`
	Checked         bool  `json:"checked"`
}

func (s *Store) Categories() ([]Category, error) {
	checklists, err := s.checklistsByCategory()
	if err != nil {
		return nil, err
	}
	assets, err := s.assetsByCategory()
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(`SELECT id, parent_id, name FROM categories ORDER BY position, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flat []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.ParentID, &c.Name); err != nil {
			return nil, err
		}
		c.Checklist = orEmpty(checklists[c.ID])
		c.Assets = orEmpty(assets[c.ID])
		c.Children = []Category{}
		flat = append(flat, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	top := []Category{}
	indexByID := map[int64]int{}
	for _, c := range flat {
		if c.ParentID == nil {
			indexByID[c.ID] = len(top)
			top = append(top, c)
		}
	}
	for _, c := range flat {
		if c.ParentID == nil {
			continue
		}
		if i, ok := indexByID[*c.ParentID]; ok {
			top[i].Children = append(top[i].Children, c)
		}
	}
	return top, nil
}

func (s *Store) checklistsByCategory() (map[int64][]ChecklistItem, error) {
	rows, err := s.db.Query(`SELECT id, category_id, label FROM checklist_items ORDER BY category_id, position, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byCategory := map[int64][]ChecklistItem{}
	for rows.Next() {
		var (
			item       ChecklistItem
			categoryID int64
		)
		if err := rows.Scan(&item.ID, &categoryID, &item.Label); err != nil {
			return nil, err
		}
		byCategory[categoryID] = append(byCategory[categoryID], item)
	}
	return byCategory, rows.Err()
}

func (s *Store) assetsByCategory() (map[int64][]Asset, error) {
	checks, err := s.checksByAsset()
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(`SELECT id, category_id, name, notes FROM assets ORDER BY category_id, position, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byCategory := map[int64][]Asset{}
	for rows.Next() {
		var (
			a          Asset
			categoryID int64
		)
		if err := rows.Scan(&a.ID, &categoryID, &a.Name, &a.Notes); err != nil {
			return nil, err
		}
		a.Checks = orEmpty(checks[a.ID])
		byCategory[categoryID] = append(byCategory[categoryID], a)
	}
	return byCategory, rows.Err()
}

func (s *Store) checksByAsset() (map[int64][]int64, error) {
	rows, err := s.db.Query(`SELECT asset_id, checklist_item_id FROM asset_checks`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byAsset := map[int64][]int64{}
	for rows.Next() {
		var assetID, itemID int64
		if err := rows.Scan(&assetID, &itemID); err != nil {
			return nil, err
		}
		byAsset[assetID] = append(byAsset[assetID], itemID)
	}
	return byAsset, rows.Err()
}

func (s *Store) CreateCategory(in CategoryInput) (int64, error) {
	name, err := required("name", in.Name)
	if err != nil {
		return 0, err
	}

	g := group{table: "categories", where: "parent_id IS NULL"}
	if in.ParentID != nil {
		top, err := s.isTopLevel(*in.ParentID)
		if err != nil {
			return 0, err
		}
		if !top {
			return 0, fmt.Errorf("%w: categories support only two levels", ErrInvalid)
		}
		g = group{table: "categories", where: "parent_id = ?", args: []any{*in.ParentID}}
	}

	pos, err := s.appendPosition(g)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO categories (parent_id, name, position) VALUES (?, ?, ?)`, in.ParentID, name, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) isTopLevel(id int64) (bool, error) {
	var parentID sql.NullInt64
	err := s.db.QueryRow(`SELECT parent_id FROM categories WHERE id = ?`, id).Scan(&parentID)
	if errors.Is(err, sql.ErrNoRows) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, err
	}
	return !parentID.Valid, nil
}

func (s *Store) UpdateCategory(id int64, p NamePatch) error {
	fields := map[string]any{}
	if p.Name != nil {
		name, err := required("name", *p.Name)
		if err != nil {
			return err
		}
		fields["name"] = name
	}
	return s.patch("categories", id, fields)
}

func (s *Store) DeleteCategory(id int64) error {
	return s.remove("categories", id)
}

func (s *Store) MoveCategory(id int64, m Move) error {
	g := group{
		table: "categories",
		where: "parent_id IS (SELECT parent_id FROM categories WHERE id = ?)",
		args:  []any{id},
	}
	return s.move(g, id, m)
}

func (s *Store) CreateChecklistItem(categoryID int64, in LabelInput) (int64, error) {
	label, err := required("label", in.Label)
	if err != nil {
		return 0, err
	}
	top, err := s.isTopLevel(categoryID)
	if err != nil {
		return 0, err
	}
	if !top {
		return 0, fmt.Errorf("%w: a checklist belongs to a top-level category", ErrInvalid)
	}
	g := group{table: "checklist_items", where: "category_id = ?", args: []any{categoryID}}
	pos, err := s.appendPosition(g)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO checklist_items (category_id, label, position) VALUES (?, ?, ?)`, categoryID, label, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateChecklistItem(id int64, p LabelPatch) error {
	fields := map[string]any{}
	if p.Label != nil {
		label, err := required("label", *p.Label)
		if err != nil {
			return err
		}
		fields["label"] = label
	}
	return s.patch("checklist_items", id, fields)
}

func (s *Store) DeleteChecklistItem(id int64) error {
	return s.remove("checklist_items", id)
}

func (s *Store) MoveChecklistItem(id int64, m Move) error {
	g := group{
		table: "checklist_items",
		where: "category_id = (SELECT category_id FROM checklist_items WHERE id = ?)",
		args:  []any{id},
	}
	return s.move(g, id, m)
}

func (s *Store) CreateAsset(categoryID int64, in AssetInput) (int64, error) {
	name, err := required("name", in.Name)
	if err != nil {
		return 0, err
	}
	g := group{table: "assets", where: "category_id = ?", args: []any{categoryID}}
	pos, err := s.appendPosition(g)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO assets (category_id, name, position) VALUES (?, ?, ?)`, categoryID, name, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateAsset(id int64, p AssetPatch) error {
	fields := map[string]any{}
	if p.Name != nil {
		name, err := required("name", *p.Name)
		if err != nil {
			return err
		}
		fields["name"] = name
	}
	if p.Notes != nil {
		fields["notes"] = *p.Notes
	}
	return s.patch("assets", id, fields)
}

func (s *Store) DeleteAsset(id int64) error {
	return s.remove("assets", id)
}

func (s *Store) MoveAsset(id int64, m Move) error {
	g := group{
		table: "assets",
		where: "category_id = (SELECT category_id FROM assets WHERE id = ?)",
		args:  []any{id},
	}
	return s.move(g, id, m)
}

func (s *Store) SetAssetCheck(assetID int64, in CheckInput) error {
	if in.Checked {
		_, err := s.db.Exec(`INSERT OR IGNORE INTO asset_checks (asset_id, checklist_item_id) VALUES (?, ?)`,
			assetID, in.ChecklistItemID)
		return err
	}
	_, err := s.db.Exec(`DELETE FROM asset_checks WHERE asset_id = ? AND checklist_item_id = ?`,
		assetID, in.ChecklistItemID)
	return err
}
