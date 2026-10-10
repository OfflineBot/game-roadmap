CREATE TABLE IF NOT EXISTS milestones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    position    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    done         INTEGER NOT NULL DEFAULT 0,
    position     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id, position);

CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name      TEXT    NOT NULL,
    position  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id, position);

-- Belongs to a top-level category and applies to every asset below it.
CREATE TABLE IF NOT EXISTS checklist_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    label       TEXT    NOT NULL,
    position    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checklist_category ON checklist_items(category_id, position);

CREATE TABLE IF NOT EXISTS assets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    notes       TEXT    NOT NULL DEFAULT '',
    position    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id, position);

-- A row means "checked"; absence means "open".
CREATE TABLE IF NOT EXISTS asset_checks (
    asset_id          INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, checklist_item_id)
);

CREATE TABLE IF NOT EXISTS documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    content    TEXT    NOT NULL DEFAULT '',
    position   INTEGER NOT NULL,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
