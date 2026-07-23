---
name: docker-compose-ops
description: Use when running, debugging, or changing the Dockerized stack (docker-compose.yml, backend/Api/Dockerfile, frontend/Dockerfile) for the MGH Travel Portal — startup failures, migration/seed issues, port conflicts, or image rebuilds.
---

# Docker Compose stack (docker-compose.yml)

Four moving pieces, one command: `docker compose up --build`. See `docs/TRD.md` §6 for
the topology diagram and reasoning. This skill is the operational/debugging companion.

## Services

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:16-alpine` | Source of truth. Named volume `pgdata`. Healthcheck via `pg_isready`. |
| `migrate` | built from `backend/Api/Dockerfile` | One-shot: `dotnet Api.dll --migrate` — applies EF Core migrations, then idempotently seeds demo data, then exits. Gated on `db` being healthy. |
| `api` | built from `backend/Api/Dockerfile` | The Web API, port 8080. Gated on `migrate` completing successfully (`condition: service_completed_successfully`). |
| `web` | built from `frontend/Dockerfile` | Next.js standalone server, port 3000. Talks to `api` at `http://localhost:8080` (`NEXT_PUBLIC_API_URL`, baked in at build time via `ARG`). |

## Common operations

```bash
docker compose up --build              # full stack, rebuilding images that changed
docker compose up --build api migrate  # rebuild + restart just the backend after a code change
docker compose logs -f api             # tail one service's logs
docker compose down                    # stop everything, keep the data volume
docker compose down -v                 # stop + wipe the Postgres volume (forces a clean reseed next `up`)
docker compose exec db psql -U mgh -d mgh_travel   # get a psql shell into the running db
```

## Debugging checklist, roughly in order

1. **`migrate` exits non-zero / `api` never becomes healthy** — check
   `docker compose logs migrate`. Almost always either (a) `db` wasn't actually ready
   yet despite the healthcheck (rare, but re-running `docker compose up` fixes it), or
   (b) a migration references a column/table that doesn't match `AppDbContext`'s current
   model (regenerate the migration).
2. **Frontend can't reach the API / CORS errors in the browser console** — `api`'s CORS
   policy (`Program.cs`) only allows the origin in `Cors:AllowedOrigin`
   (`docker-compose.yml` sets it to `http://localhost:3000`). If you change the
   published `web` port, update this too.
3. **Signed in but immediately bounced back to `/login`** — the `mgh_session` cookie is
   scoped by domain, not port, so both `web` and `api` must be reached via `localhost`
   consistently (not `127.0.0.1` for one and `localhost` for the other) or the browser
   won't consider them the same site for `SameSite=Lax` purposes.
4. **Port already bound (3000 / 8080 / 5432)** — something else on the host owns it;
   stop it, or edit only the **left-hand side** of the `ports:` mapping in
   `docker-compose.yml` (the right-hand side is the in-container port other services
   still expect).
5. **Frontend build fails inside Docker but works locally** — the frontend `Dockerfile`
   passes `NEXT_PUBLIC_API_URL` as a build `ARG`; if you renamed or added a
   `NEXT_PUBLIC_*` env var, it needs to flow through both the Dockerfile `ARG`/`ENV` and
   `docker-compose.yml`'s `build.args` / `environment`.

## Changing the stack

- New backend env var → add to `backend/Api/appsettings.json` (default/local value) and
  to `docker-compose.yml`'s `api`/`migrate` `environment:` blocks (container value).
- New service (e.g. implementing the Mailpit email bonus from `PROGRESS.md`) → add it
  under its own `services:` entry; if it's bonus/optional, gate it behind a Compose
  `profiles:` entry (e.g. `profiles: ["full"]`) so the baseline `docker compose up` stays
  minimal, per `docs/TRD.md`'s stated design intent.

## Status

`docker compose up` has **not** been run end-to-end yet as of the last update to this
skill (no Docker Desktop in the environment this was built in) — see `PROGRESS.md`.
Treat the first real run as a debugging session, not a formality.
