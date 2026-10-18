package store

type Bug struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Fixed       bool    `json:"fixed"`
	FixedAt     *string `json:"fixed_at"`
}

type BugPatch struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Fixed       *bool   `json:"fixed"`
}

// Bugs are reported in the order they were found; the page keeps the fixed ones
// out of the way itself.
func (s *Store) Bugs() ([]Bug, error) {
	rows, err := s.db.Query(`SELECT id, title, description, fixed, fixed_at FROM bugs ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bugs := []Bug{}
	for rows.Next() {
		var b Bug
		if err := rows.Scan(&b.ID, &b.Title, &b.Description, &b.Fixed, &b.FixedAt); err != nil {
			return nil, err
		}
		bugs = append(bugs, b)
	}
	return bugs, rows.Err()
}

func (s *Store) CreateBug(in TitledInput) (int64, error) {
	title, err := required("title", in.Title)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO bugs (title, description) VALUES (?, ?)`, title, in.Description)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateBug(id int64, p BugPatch) error {
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
	if p.Fixed != nil {
		fields["fixed"] = *p.Fixed
		fields["fixed_at"] = nil
		if *p.Fixed {
			fields["fixed_at"] = nowUTC()
		}
	}
	return s.patch("bugs", id, fields)
}

func (s *Store) DeleteBug(id int64) error {
	return s.remove("bugs", id)
}
