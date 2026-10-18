// Package db opens the local database and keeps its schema up to date without
// ever touching existing rows.
package db

import (
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/hex"
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
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	if err := writable(dir); err != nil {
		return nil, err
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
	if err := report(conn, path); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

// writable turns the driver's unhelpful "unable to open database file" into a
// message that names the real problem.
func writable(dir string) error {
	probe := filepath.Join(dir, ".write-probe")
	file, err := os.OpenFile(probe, os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("the data directory %s is not writable for uid %d:%d - "+
			"either chown it or set APP_UID/APP_GID: %w", dir, os.Getuid(), os.Getgid(), err)
	}
	file.Close()
	return os.Remove(probe)
}

// migrate applies every migration file the database has not seen yet. Applied
// files are recorded with a checksum, so changing one after the fact is caught
// instead of silently leaving the schema behind.
func migrate(conn *sql.DB, path string, existing bool) error {
	files, err := fs.ReadDir(migrations, "migrations")
	if err != nil {
		return err
	}

	if _, err := conn.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        checksum   TEXT NOT NULL,
        applied_at TEXT NOT NULL
    )`); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}

	applied, err := appliedMigrations(conn)
	if err != nil {
		return err
	}
	if len(applied) == 0 {
		if applied, err = adoptVersionCounter(conn, files); err != nil {
			return err
		}
	}

	known := map[string]bool{}
	var pending []fs.DirEntry
	for _, file := range files {
		known[file.Name()] = true

		statements, err := migrations.ReadFile("migrations/" + file.Name())
		if err != nil {
			return err
		}
		sum := checksum(statements)

		recorded, ok := applied[file.Name()]
		if !ok {
			pending = append(pending, file)
			continue
		}
		if recorded != sum {
			return fmt.Errorf("migration %s was changed after it had been applied - "+
				"restore the file and add a new migration instead", file.Name())
		}
	}
	for name := range applied {
		if !known[name] {
			return fmt.Errorf("the database has migration %s applied, which this build does not contain - "+
				"deploy a newer build", name)
		}
	}
	if len(pending) == 0 {
		return nil
	}

	if existing {
		if err := backup(conn, path, len(applied)); err != nil {
			return err
		}
	}

	for _, file := range pending {
		statements, err := migrations.ReadFile("migrations/" + file.Name())
		if err != nil {
			return err
		}
		if err := apply(conn, file.Name(), statements, len(applied)+1); err != nil {
			return fmt.Errorf("migration %s: %w", file.Name(), err)
		}
		applied[file.Name()] = checksum(statements)
		log.Printf("applied migration %s", file.Name())
	}
	return nil
}

func appliedMigrations(conn *sql.DB) (map[string]string, error) {
	rows, err := conn.Query(`SELECT name, checksum FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := map[string]string{}
	for rows.Next() {
		var name, sum string
		if err := rows.Scan(&name, &sum); err != nil {
			return nil, err
		}
		applied[name] = sum
	}
	return applied, rows.Err()
}

// adoptVersionCounter takes over databases from before schema_migrations
// existed, which counted their progress in PRAGMA user_version.
func adoptVersionCounter(conn *sql.DB, files []fs.DirEntry) (map[string]string, error) {
	var version int
	if err := conn.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return nil, err
	}
	applied := map[string]string{}
	if version == 0 {
		return applied, nil
	}
	if version > len(files) {
		return nil, fmt.Errorf("the database is at schema version %d, this build only knows %d - "+
			"deploy a newer build", version, len(files))
	}

	for _, file := range files[:version] {
		statements, err := migrations.ReadFile("migrations/" + file.Name())
		if err != nil {
			return nil, err
		}
		sum := checksum(statements)
		if _, err := conn.Exec(`INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)`,
			file.Name(), sum, nowUTC()); err != nil {
			return nil, err
		}
		applied[file.Name()] = sum
	}
	log.Printf("recorded %d migration(s) that this database already had", version)
	return applied, nil
}

func apply(conn *sql.DB, name string, statements []byte, version int) error {
	tx, err := conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(string(statements)); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)`,
		name, checksum(statements), nowUTC()); err != nil {
		return err
	}
	// Kept in sync so an older build still recognises a newer database.
	if _, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", version)); err != nil {
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

// report makes it visible in the deployment log that the content is still there.
func report(conn *sql.DB, path string) error {
	var milestones, tasks, assets, documents, crates, bugs int
	err := conn.QueryRow(`SELECT
        (SELECT COUNT(*) FROM milestones),
        (SELECT COUNT(*) FROM tasks),
        (SELECT COUNT(*) FROM assets),
        (SELECT COUNT(*) FROM documents),
        (SELECT COUNT(*) FROM crates),
        (SELECT COUNT(*) FROM bugs WHERE fixed = 0)`).Scan(&milestones, &tasks, &assets, &documents, &crates, &bugs)
	if err != nil {
		return err
	}
	log.Printf("%s ready: %d milestones, %d tasks, %d assets, %d pages, %d crates, %d open bugs",
		path, milestones, tasks, assets, documents, crates, bugs)
	return nil
}

func checksum(statements []byte) string {
	sum := sha256.Sum256(statements)
	return hex.EncodeToString(sum[:])
}

func nowUTC() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05")
}
