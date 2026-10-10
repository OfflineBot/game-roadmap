# Game Roadmap

Personal tracker for a game project: milestones, asset checklists and notes.

## Run

```sh
docker compose up -d
```

- http://localhost:5173 - the site
- http://localhost:8080 - the API

Stop with `docker compose down`.

## Deploying an update

```sh
git pull
docker compose up -d --build
```

The database is never part of this. See below.

## The database is safe

The sqlite file lives in `data/roadmap.db` and is created by the backend on
first start. Everything that could overwrite it is ruled out:

| Risk | Why it cannot happen |
|---|---|
| `git pull` / `git push` | `data/` is git-ignored, only the empty `.gitkeep` is tracked |
| Rebuilding the images | the database is a bind mount on the host, not part of any image |
| `docker compose down -v` | `-v` removes volumes, and a bind mount is not one |
| Restarting the app | the schema is applied through migrations that only ever add |
| A future schema change | migrations run once, in a transaction, after a backup is written |
| Copying the file while it runs | the server closes the database on SIGTERM, which folds the write-ahead log back into the single file |

### Migrations

`backend/internal/db/migrations/` holds numbered `.sql` files. On start the
backend compares their count with `PRAGMA user_version` and applies only what is
missing, each one in a transaction. Before the first of them runs, a complete
copy of the existing database is written to `data/backups/`.

To change the schema, add a new file - never edit an applied one:

```sh
# backend/internal/db/migrations/002_add_something.sql
ALTER TABLE assets ADD COLUMN tag TEXT NOT NULL DEFAULT '';
```

### Backup and restore

```sh
docker compose stop backend          # closes the database cleanly
cp data/roadmap.db ~/roadmap-backup.db
docker compose start backend
```

Restoring is the same the other way round, with the backend stopped.

## Layout

```
backend/           Go + Fiber
  main.go          start-up, shutdown
  internal/db      database file and migrations
  internal/store   all SQL, all validation
  internal/api     HTTP handlers and the route table
frontend/          React + Vite + TypeScript
  src/api.ts       typed client for the API
  src/progress.ts  every derived number (done states, progress bars)
  src/pages/       one file per page
  src/components/  shared building blocks
  src/styles/      Catppuccin Mocha theme and styles
```

## Notes

- Milestone and task numbers come from their order. Deleting or reordering
  renumbers everything below automatically.
- A milestone is done when all of its tasks are done; it cannot be set by hand.
- The todo columns of the item list belong to a top-level category and apply to
  every asset inside it, including its subcategories.
- Pages under General Information are saved explicitly with the Save button or
  Ctrl+S. A page with unsaved edits is marked with a dot in the list and keeps
  its edits when you switch away.
- The frontend container runs the Vite dev server, so changes under `frontend/`
  are live. Backend changes need `docker compose up -d --build backend`.
- Adding a frontend dependency: `docker compose exec frontend npm install <name>`
  (`node_modules` lives in a container volume, a host install would not reach it).
