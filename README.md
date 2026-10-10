# Game Roadmap

Personal tracker for a game project: milestones, asset checklists and notes.

## Run

```sh
docker compose up -d --build
```

The site is on http://localhost:8080. Set `WEB_PORT` to use another port.

Only the web container publishes a port; the API is reachable through it and
not from the outside.

### Surviving a reboot

Both containers run with `restart: always`, so Docker starts them again after a
reboot, a crash or a daemon restart. That only works if the Docker service
itself starts with the system:

```sh
sudo systemctl enable --now docker
systemctl is-enabled docker    # must print "enabled"
```

A reboot cannot damage the database either: sqlite runs in WAL mode with
`synchronous=FULL`, so every committed change is on disk before the API
answers, and an interrupted run is recovered on the next start.

### No login

The app has no authentication, because it is built for a single person. On a
machine that is reachable from the internet, put it behind something that
restricts access - a reverse proxy with basic auth, a VPN, or a firewall rule.

### If the server user is not uid 1000

The backend runs as uid 1000 so the database file stays owned by a normal user.
When the account that owns `data/` has a different id:

```sh
APP_UID=$(id -u) APP_GID=$(id -g) docker compose up -d --build
```

Without it the backend stops on start and says which directory it cannot write.

## Deploying an update

```sh
git pull
docker compose up -d --build
```

The database is not part of this. See below.

## Development

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

The site is then on http://localhost:5173 with hot reload, the API on
http://localhost:8081. Backend changes need the command again, frontend changes
are picked up live.

Adding a frontend dependency: `docker compose exec frontend npm install <name>`
(`node_modules` lives in a container volume, a host install would not reach it).

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
| An older build on a newer database | the backend refuses to start instead of touching it |
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
  nginx.conf       serves the build, proxies /api
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
