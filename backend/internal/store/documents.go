package store

type Document struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updated_at"`
}

type DocumentInput struct {
	Title string `json:"title"`
}

type DocumentPatch struct {
	Title   *string `json:"title"`
	Content *string `json:"content"`
}

var documentGroup = group{table: "documents", where: "1 = 1"}

func (s *Store) Documents() ([]Document, error) {
	rows, err := s.db.Query(`SELECT id, title, content, updated_at FROM documents ORDER BY position, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := []Document{}
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Title, &d.Content, &d.UpdatedAt); err != nil {
			return nil, err
		}
		documents = append(documents, d)
	}
	return documents, rows.Err()
}

func (s *Store) CreateDocument(in DocumentInput) (int64, error) {
	title, err := required("title", in.Title)
	if err != nil {
		return 0, err
	}
	pos, err := s.appendPosition(documentGroup)
	if err != nil {
		return 0, err
	}
	res, err := s.db.Exec(`INSERT INTO documents (title, position) VALUES (?, ?)`, title, pos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateDocument(id int64, p DocumentPatch) error {
	fields := map[string]any{}
	if p.Title != nil {
		title, err := required("title", *p.Title)
		if err != nil {
			return err
		}
		fields["title"] = title
	}
	if p.Content != nil {
		fields["content"] = *p.Content
	}
	if len(fields) == 0 {
		return nil
	}
	fields["updated_at"] = nowUTC()
	return s.patch("documents", id, fields)
}

func (s *Store) DeleteDocument(id int64) error {
	return s.remove("documents", id)
}

func (s *Store) MoveDocument(id int64, m Move) error {
	return s.move(documentGroup, id, m)
}
