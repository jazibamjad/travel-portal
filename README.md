# MGH — CEO Travel & Team Planning Portal

A full-stack rebuild of the MGH Travel Portal prototype: Next.js frontend, ASP.NET Core
9 Web API, PostgreSQL. See [`/docs`](./docs) for the BRD, PRD, TRD and test plan behind
this build.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes `docker compose`)
- Nothing else — the frontend, API, and database all run inside containers. No local
  Node.js or .NET SDK is required to *run* the product (only to develop it further).

## One-command startup

From the repository root:

```bash
docker compose up --build
```

This will, in order:

1. Start PostgreSQL and wait until it's healthy.
2. Run a one-shot `migrate` container that applies EF Core migrations and seeds demo
   data (idempotent — safe to re-run; it skips seeding if data already exists).
3. Start the API on **http://localhost:8080** (Swagger UI at `/swagger` in Development).
4. Start the web app on **http://localhost:3000**.

Open **http://localhost:3000** and sign in with one of the seeded accounts below.

To stop: `Ctrl+C`, then `docker compose down` (add `-v` to also drop the database volume
and start fresh next time).

## Seeded login credentials

| Role | Email | Password |
|---|---|---|
| Coordinator (CEO office / Grace Hall) | `coordinator@mgh.example.com` | `Coordinator!123` |
| CEO (Alex Morgan) | `ceo@mgh.example.com` | `Ceo!12345` |
| Team Member (Jamie Morgan) | `jamie@mgh.example.com` | `TeamMember!123` |

All three accounts currently share the same permission level (role-based access control
is bonus scope — see `docs/PRD.md` §2.1 / `docs/TRD.md` ADR notes). The seed data
(people, cities, contacts, a confirmed Prague trip with meetings, flights, and team-plan
entries) is derived from the original prototype's fictional dataset.

## Project structure

```
/docs             BRD, PRD, TRD, TEST_PLAN (read these first)
/backend/Api      ASP.NET Core 9 Web API (EF Core + PostgreSQL)
/frontend         Next.js 16 (App Router, TypeScript, Tailwind)
docker-compose.yml
```

## Local development (without Docker)

Requires: Node.js 20+, .NET 9 SDK, and a local PostgreSQL instance (or run just the `db`
service with `docker compose up db`).

**Backend:**

```bash
docker compose up db   # or point ConnectionStrings:Default in appsettings.json at your own Postgres
cd backend/Api
dotnet run -- --migrate   # applies migrations + seeds demo data, then exits
dotnet run                # starts the API for real
```

`appsettings.json`'s default connection string already matches `docker compose`'s `db`
service credentials (`localhost:5432`, db `mgh_travel`, user `mgh`), so no extra
configuration is needed if you're only running Postgres via Docker. The API listens on
the port shown in the console (Swagger at `/swagger`).

**Frontend:**

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL — point at your local API port
npm install
npm run dev
```

Visit http://localhost:3000.

## Troubleshooting

- **`docker compose up` fails on `migrate` with a connection error** — the `db` healthcheck
  usually means Postgres just needs a few more seconds on first run; re-run
  `docker compose up`.
- **Port already in use (3000 / 8080 / 5432)** — stop whatever else is using it, or edit
  the `ports:` mappings in `docker-compose.yml` (left side only; the app still talks to
  the right-side container port internally).
- **Signed in but pages redirect back to `/login`** — the session cookie is issued by the
  API (`localhost:8080`) and read by the web app's route guard (`localhost:3000`); both
  must be reachable at `localhost` (not `127.0.0.1` vs `localhost` mixed) for the browser
  to treat them as the same cookie-scoped site.
- **Want a clean slate** — `docker compose down -v` removes the database volume; the next
  `docker compose up` re-seeds from scratch.
- **Changed backend code and don't see it** — `docker compose up --build api migrate` to
  rebuild just those images.
- **Image build fails with no internet access** — building the images needs internet
  once (`dotnet restore` pulls NuGet packages for the API; the frontend build
  self-hosts Google Fonts via `next/font/google`, downloaded at build time). The
  *running* containers afterward need no internet at all — build on a connected network
  beforehand and the offline conference-room demo (`docker compose up`, no `--build`)
  works fine.

## What's implemented vs. bonus

See `docs/PRD.md` §5 (MoSCoW) for the full breakdown. In short: every capability in the
assignment's functional-scope checklist (sign-in, KPIs, calendar drill-down, trip
planner with meetings/materials, bulk entry, flights, team plan with vacation approval,
directory, one-pagers, JSON export/import, multi-user polling consistency) is
implemented. Bonus scope (email integration, deeper Google Flights capture, RBAC,
real-time sync, automated tests/CI, audit trail) status is tracked in
`docs/TEST_PLAN.md` §5 as it's built out.
