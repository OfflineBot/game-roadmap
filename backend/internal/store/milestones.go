package store

import "fmt"

// Number is derived from the row order, so deleting or reordering renumbers
// everything below automatically.
type Milestone struct {
	ID          int64  `json:"id"`
	Number      int    `json:"number"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Tasks       []Task `json:"tasks"`
}

type Task struct {
	ID          int64  `json:"id"`
	Number      string `json:"number"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Done        bool   `json:"done"`
}

// TitledInput creates anything that carries a title and a rich-text description.
type TitledInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type MilestonePatch struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
}

type TaskPatch struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Done        *bool   `json:"done"`
}

var milestoneGroup = group{table: "milestones", where: "1 = 1"}

func taskGroup(taskID int64) group {
	return group{
		table: "tasks",
		where: "milestone_id = (SELECT milestone_id FROM tasks WHERE id = ?)",
		args:  []any{taskID},
	}
}

func (s *Store) Milestones() ([]Milestone, error) {
	rows, err := s.db.Query(`SELECT id, title, description FROM milestones ORDER BY position, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	milestones := []Milestone{}
	indexByID := map[int64]int{}
	for rows.Next() {
		var m Milestone
		if err := rows.Scan(&m.ID, &m.Title, &m.Description); err != nil {
			return nil, err
		}
		m.Number = len(milestones)
		m.Tasks = []Task{}
		indexByID[m.ID] = len(milestones)
		milestones = append(milestones, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	taskRows, err := s.db.Query(`SELECT id, milestone_id, title, description, done FROM tasks ORDER BY milestone_id, position, id`)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	for taskRows.Next() {
		var (
			t           Task
			milestoneID int64
		)
		if err := taskRows.Scan(&t.ID, &milestoneID, &t.Title, &t.Description, &t.Done); err != nil {
			return nil, err
		}
		i, ok := indexByID[milestoneID]
		if !ok {
			continue
		}
		t.Number = fmt.Sprintf("%d.%d", milestones[i].Number, len(milestones[i].Tasks)+1)
		milestones[i].Tasks = append(milestones[i].Tasks, t)
	}
	return milestones, taskRows.Err()
}

func (s *Store) CreateMilestone(in TitledInput) (int64, error) {
	title, err := required("title", in.Title)
	if err != nil {
		return 0, err
	}
	pos, err := s.appendPosition(milestoneGroup)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO milestones (title, description, position) VALUES (?, ?, ?)`, title, in.Description, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateMilestone(id int64, p MilestonePatch) error {
	fields := map[string]any{}
	if p.Title != nil {
		title, err := required("title", *p.Title)
		if err != nil {
			return err
		}
		fields["title"] = title
	}
	if p.Description != nil {
		fields["description"] = *p.Description
	}
	return s.patch("milestones", id, fields)
}

func (s *Store) DeleteMilestone(id int64) error {
	return s.remove("milestones", id)
}

func (s *Store) MoveMilestone(id int64, m Move) error {
	return s.move(milestoneGroup, id, m)
}

func (s *Store) CreateTask(milestoneID int64, in TitledInput) (int64, error) {
	title, err := required("title", in.Title)
	if err != nil {
		return 0, err
	}
	g := group{table: "tasks", where: "milestone_id = ?", args: []any{milestoneID}}
	pos, err := s.appendPosition(g)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO tasks (milestone_id, title, description, position) VALUES (?, ?, ?, ?)`,
		milestoneID, title, in.Description, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateTask(id int64, p TaskPatch) error {
	fields := map[string]any{}
	if p.Title != nil {
		title, err := required("title", *p.Title)
		if err != nil {
			return err
		}
		fields["title"] = title
	}
	if p.Description != nil {
		fields["description"] = *p.Description
	}
	if p.Done != nil {
		fields["done"] = *p.Done
	}
	return s.patch("tasks", id, fields)
}

func (s *Store) DeleteTask(id int64) error {
	return s.remove("tasks", id)
}

func (s *Store) MoveTask(id int64, m Move) error {
	return s.move(taskGroup(id), id, m)
}
