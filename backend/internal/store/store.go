// Package store holds every database access of the application.
package store

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid request")
)

type Store struct {
	db *sql.DB
}

func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// Move is the body of every reorder endpoint: the index the row ends up at.
type Move struct {
	To *int `json:"to"`
}

// group identifies the rows a position is counted within: all milestones, the
// tasks of one milestone, the assets of one category, ...
type group struct {
	table string
	where string
	args  []any
}

func (s *Store) appendPosition(g group) (int, error) {
	var pos int
	q := fmt.Sprintf("SELECT COALESCE(MAX(position) + 1, 0) FROM %s WHERE %s", g.table, g.where)
	if err := s.db.QueryRow(q, g.args...).Scan(&pos); err != nil {
		return 0, err
	}
	return pos, nil
}

// move puts one row at the given index inside its group. Positions are
// rewritten gap-free afterwards, which also repairs any older ordering.
func (s *Store) move(g group, id int64, m Move) error {
	if m.To == nil || *m.To < 0 {
		return fmt.Errorf("%w: to must be a position", ErrInvalid)
	}

	q := fmt.Sprintf("SELECT id FROM %s WHERE %s ORDER BY position, id", g.table, g.where)
	rows, err := s.db.Query(q, g.args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var rowID int64
		if err := rows.Scan(&rowID); err != nil {
			return err
		}
		ids = append(ids, rowID)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	at := -1
	for i, rowID := range ids {
		if rowID == id {
			at = i
			break
		}
	}
	if at < 0 {
		return ErrNotFound
	}
	to := min(*m.To, len(ids)-1)
	if to == at {
		return nil
	}
	ids = append(ids[:at], ids[at+1:]...)
	ids = append(ids[:to], append([]int64{id}, ids[to:]...)...)

	return s.tx(func(tx *sql.Tx) error {
		update := fmt.Sprintf("UPDATE %s SET position = ? WHERE id = ?", g.table)
		for pos, rowID := range ids {
			if _, err := tx.Exec(update, pos, rowID); err != nil {
				return err
			}
		}
		return nil
	})
}

// patch writes the given columns and reports ErrNotFound for an unknown id.
func (s *Store) patch(table string, id int64, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}

	cols := make([]string, 0, len(fields))
	for col := range fields {
		cols = append(cols, col)
	}
	sort.Strings(cols)

	sets := make([]string, 0, len(cols))
	args := make([]any, 0, len(cols)+1)
	for _, col := range cols {
		sets = append(sets, col+" = ?")
		args = append(args, fields[col])
	}
	args = append(args, id)

	q := fmt.Sprintf("UPDATE %s SET %s WHERE id = ?", table, strings.Join(sets, ", "))
	return s.exec(q, args...)
}

func (s *Store) remove(table string, id int64) error {
	return s.exec(fmt.Sprintf("DELETE FROM %s WHERE id = ?", table), id)
}

func (s *Store) exec(query string, args ...any) error {
	res, err := s.db.Exec(query, args...)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) tx(fn func(*sql.Tx) error) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func required(name, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("%w: %s must not be empty", ErrInvalid, name)
	}
	return trimmed, nil
}

// orEmpty keeps JSON arrays as [] instead of null.
func orEmpty[T any](items []T) []T {
	if items == nil {
		return []T{}
	}
	return items
}

func nowUTC() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05")
}
