// Package db opens the local database and keeps its schema up to date without
// ever touching existing rows.
package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Open creates the database file and its directory if they do not exist yet and
// applies any migration the file has not seen. Existing data is never dropped.
func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	// Checked before opening, because opening creates the file.
	_, statErr := os.Stat(path)
	existing := statErr == nil

	dsn := path + "?_pragma=foreign_keys(1)&_pragma=journal_mode(wal)&_pragma=busy_timeout(5000)"
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Single user, single writer: one connection removes all lock contention.
	conn.SetMaxOpenConns(1)

	if err := migrate(conn, path, existing); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

// migrate applies every migration file beyond the version stored in the
// database. The version is the number of files applied so far.
func migrate(conn *sql.DB, path string, existing bool) error {
	files, err := fs.ReadDir(migrations, "migrations")
	if err != nil {
		return err
	}

	var version int
	if err := conn.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}
	if version > len(files) {
		return fmt.Errorf("database is at schema version %d, this build only knows %d", version, len(files))
	}
	if version == len(files) {
		return nil
	}

	if existing {
		if err := backup(conn, path, version); err != nil {
			return err
		}
	}

	for i := version; i < len(files); i++ {
		name := files[i].Name()
		statements, err := migrations.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if err := apply(conn, string(statements), i+1); err != nil {
			return fmt.Errorf("migration %s: %w", name, err)
		}
		log.Printf("applied migration %s", name)
	}
	return nil
}

func apply(conn *sql.DB, statements string, version int) error {
	tx, err := conn.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(statements); err != nil {
		tx.Rollback()
		return err
	}
	// PRAGMA does not take bound parameters, the value is our own counter.
	if _, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", version)); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

// backup writes a consistent copy next to the database before the schema is
// changed, so a failed migration can never cost data.
func backup(conn *sql.DB, path string, version int) error {
	dir := filepath.Join(filepath.Dir(path), "backups")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	name := fmt.Sprintf("%s-v%d-%s.db",
		strings.TrimSuffix(filepath.Base(path), filepath.Ext(path)),
		version,
		time.Now().UTC().Format("20060102-150405"))
	target := filepath.Join(dir, name)

	if _, err := conn.Exec("VACUUM INTO ?", target); err != nil {
		return fmt.Errorf("backup before migration: %w", err)
	}
	log.Printf("backed up the database to %s before migrating", target)
	return nil
}
