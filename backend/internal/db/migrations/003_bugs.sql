CREATE TABLE IF NOT EXISTS bugs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    fixed       INTEGER NOT NULL DEFAULT 0,
    -- Follows the flag, so the archive can show when a bug was fixed.
    fixed_at    TEXT
);
