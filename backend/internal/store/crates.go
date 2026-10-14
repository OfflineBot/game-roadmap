package store

import (
	"fmt"
	"strings"
)

type Crate struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	DependsOn []int64 `json:"depends_on"`
}

type CrateInput struct {
	Name string `json:"name"`
}

type CratePatch struct {
	Name *string `json:"name"`
}

// Dependency is the body of both dependency endpoints.
type Dependency struct {
	DependsOnID int64 `json:"depends_on_id"`
}

func (s *Store) Crates() ([]Crate, error) {
	rows, err := s.db.Query(`SELECT id, name FROM crates ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	crates := []Crate{}
	at := map[int64]int{}
	for rows.Next() {
		var c Crate
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		c.DependsOn = []int64{}
		at[c.ID] = len(crates)
		crates = append(crates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	edges, err := s.db.Query(`SELECT d.crate_id, d.depends_on_id FROM crate_deps d
        JOIN crates c ON c.id = d.depends_on_id ORDER BY c.name`)
	if err != nil {
		return nil, err
	}
	defer edges.Close()

	for edges.Next() {
		var from, to int64
		if err := edges.Scan(&from, &to); err != nil {
			return nil, err
		}
		if index, ok := at[from]; ok {
			crates[index].DependsOn = append(crates[index].DependsOn, to)
		}
	}
	return crates, edges.Err()
}

func (s *Store) CreateCrate(in CrateInput) (int64, error) {
	name, err := required("name", in.Name)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO crates (name) VALUES (?)`, name)
	if err != nil {
		return 0, taken(err, name)
	}
	return res.LastInsertId()
}

func (s *Store) UpdateCrate(id int64, p CratePatch) error {
	if p.Name == nil {
		return nil
	}
	name, err := required("name", *p.Name)
	if err != nil {
		return err
	}
	return taken(s.patch("crates", id, map[string]any{"name": name}), name)
}

func (s *Store) DeleteCrate(id int64) error {
	return s.remove("crates", id)
}

// AddDependency records that one crate imports another, unless that would
// close a cycle - the thing this page exists to prevent.
func (s *Store) AddDependency(id int64, d Dependency) error {
	if id == d.DependsOnID {
		return fmt.Errorf("%w: a crate cannot import itself", ErrInvalid)
	}
	from, err := s.crateName(id)
	if err != nil {
		return err
	}
	to, err := s.crateName(d.DependsOnID)
	if err != nil {
		return err
	}

	circular, err := s.reaches(d.DependsOnID, id)
	if err != nil {
		return err
	}
	if circular {
		return fmt.Errorf("%w: %s already imports %s, so this would be circular", ErrInvalid, to, from)
	}

	_, err = s.db.Exec(`INSERT OR IGNORE INTO crate_deps (crate_id, depends_on_id) VALUES (?, ?)`,
		id, d.DependsOnID)
	return err
}

func (s *Store) RemoveDependency(id, dependsOnID int64) error {
	return s.exec(`DELETE FROM crate_deps WHERE crate_id = ? AND depends_on_id = ?`, id, dependsOnID)
}

func (s *Store) crateName(id int64) (string, error) {
	var name string
	err := s.db.QueryRow(`SELECT name FROM crates WHERE id = ?`, id).Scan(&name)
	if err != nil {
		return "", ErrNotFound
	}
	return name, nil
}

// reaches reports whether from imports to, directly or over any number of hops.
func (s *Store) reaches(from, to int64) (bool, error) {
	var hit int
	err := s.db.QueryRow(`WITH RECURSIVE imported(id) AS (
            SELECT depends_on_id FROM crate_deps WHERE crate_id = ?
            UNION
            SELECT d.depends_on_id FROM crate_deps d JOIN imported i ON d.crate_id = i.id
        )
        SELECT COUNT(*) FROM imported WHERE id = ?`, from, to).Scan(&hit)
	return hit > 0, err
}

// taken turns the unique index into a message that names the crate.
func taken(err error, name string) error {
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return fmt.Errorf("%w: there is already a crate called %s", ErrInvalid, name)
	}
	return err
}
