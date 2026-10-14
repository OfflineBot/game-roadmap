CREATE TABLE IF NOT EXISTS crates (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

-- One row per import: crate_id has depends_on_id in its Cargo.toml.
CREATE TABLE IF NOT EXISTS crate_deps (
    crate_id      INTEGER NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
    depends_on_id INTEGER NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
    PRIMARY KEY (crate_id, depends_on_id)
);
CREATE INDEX IF NOT EXISTS idx_crate_deps_target ON crate_deps(depends_on_id);
