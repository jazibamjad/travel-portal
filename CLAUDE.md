# MGH Travel & Team Planning Portal

Full-stack rebuild of a single-file HTML/localStorage prototype (CEO travel + team
calendar planning tool) into a real product: Next.js frontend, ASP.NET Core 9 Web API,
PostgreSQL, fully Dockerized. Built for a Product Engineer take-home assignment — see
`docs/` for the full SDLC trail and `PROGRESS.md` for current status.

## Read these first

1. [`docs/BRD.md`](docs/BRD.md) — why this exists, scope, success criteria.
2. [`docs/PRD.md`](docs/PRD.md) — personas, user stories, functional/non-functional
   requirements, and every deliberate deviation from the original prototype (§7 — read
   this before assuming prototype behavior is the spec).
3. [`docs/TRD.md`](docs/TRD.md) — architecture, ERD, API contract, security approach,
   Docker topology, ADRs.
4. [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) — test strategy, case list, execution
   evidence (kept honest — check §5 for what's actually been verified vs. still pending).
5. [`PROGRESS.md`](PROGRESS.md) — done vs. remaining, updated as work lands.

## Repo layout

```
/docs                      BRD, PRD, TRD, TEST_PLAN
/backend/Api                ASP.NET Core 9 Web API
  Entities/                 EF Core entity classes (mirrors TRD §3 ERD)
  Data/AppDbContext.cs       model config incl. delete-guard cascade rules
  Data/SeedData.cs           idempotent demo-data seed (skips if Trips already exist)
  Data/Migrations/           EF Core migrations
  Dtos/                      request/response records, one file per feature area
  Services/                  business logic with no HTTP concerns (KpiService,
                              CalendarService, OnePagerService, PlanAggregationService,
                              CityResolver, DateMath, PasswordHasher)
  Controllers/                one controller per API resource group
/backend/Api.Tests           xUnit tests (currently: DateMath, PlanAggregationService)
/frontend                    Next.js 16 (App Router, TypeScript, Tailwind, TanStack Query)
  src/app/(app)/              authenticated routes behind the app shell (nav + layout)
  src/app/login/               public sign-in page
  src/app/one-pager/          print-friendly routes, no app-shell chrome
  src/lib/                    api.ts (fetch wrapper), types.ts (DTO mirrors),
                               queries.ts (shared hooks), constants.ts, calendar-utils.ts
  src/components/ui.tsx        shared Tailwind primitives (Button, Card, Badge, etc.)
  src/proxy.ts                 route guard — Next.js 16 renamed middleware.ts -> proxy.ts
docker-compose.yml            db + migrate (one-shot) + api + web
```

## Commands

**Backend** (`backend/`):
```bash
dotnet build                          # build the solution (Api + Api.Tests)
dotnet test                           # run unit tests
cd Api && dotnet run -- --migrate     # apply EF Core migrations + seed, then exit
cd Api && dotnet run                  # start the API (default: http://localhost:5xxx, Swagger at /swagger)
cd Api && dotnet ef migrations add <Name> --output-dir Data/Migrations   # new migration
```

**Frontend** (`frontend/`):
```bash
npm run dev             # dev server, http://localhost:3000
npm run build            # production build (also used by the Docker image)
npx tsc --noEmit         # typecheck only
```

**Whole stack:**
```bash
docker compose up --build   # db -> migrate+seed -> api (:8080) -> web (:3000)
```

> **Rule: if the Docker stack is already running, rebuild the affected service(s) after
> any code change, before calling the change done.** `docker compose up` (no `--build`)
> serves whatever was baked into the image at the last build — it will silently keep
> running stale code otherwise. Rebuild just what changed rather than the whole stack:
> `docker compose up --build api migrate` after a backend change, `docker compose up
> --build web` after a frontend change. Don't leave the running containers out of sync
> with the source tree.

## Conventions worth knowing before editing

- **Auth**: httpOnly cookie session (`mgh_session`), not a bearer JWT in browser storage
  — deliberate XSS-hardening choice, see TRD §2 and §5. Cookies are scoped by domain
  only (not port), so `localhost:8080` (API) and `localhost:3000` (web) share the cookie
  as long as both are addressed as `localhost`.
- **Cities are resolved, not just referenced**: `CityResolver` (constructor-injected,
  like every other service) is the one place that turns a free-text "City, Country"
  label into a `City` row (creating it if new) — call `cityResolver.GetOrCreateAsync(label)`.
  Every controller that accepts a destination/place string goes through this — don't
  duplicate the parsing logic elsewhere.
- **DI service lifetimes are chosen per service, not defaulted to one pattern**
  (`Program.cs`): `PasswordHasher` is `Singleton` because it's genuinely stateless
  (wraps static BCrypt calls, holds no fields). Everything else in `Services/` is
  `Scoped` because it depends on `AppDbContext`, which EF Core registers `Scoped` — a
  `Scoped` dependency can never be safely injected into a `Singleton` (the "captive
  dependency" problem: the singleton would hold the first request's `DbContext` forever,
  which is disposed at the end of that request, so every request after the first throws
  `ObjectDisposedException`, and it's unsafe under concurrent requests regardless of
  disposal timing). If you add a new service, ask whether it touches `AppDbContext`
  before picking its lifetime — if it does, it's `Scoped`, full stop.
- **No repository layer on top of EF Core, deliberately** — controllers and `Services/`
  classes call `AppDbContext` directly; there's no `IRepository<T>`/`ITripRepository`
  wrapping `DbSet<T>`. This isn't an oversight — see `docs/TRD.md` ADR-6 for the full
  reasoning (short version: `DbContext`/`DbSet<T>` already *is* Repository +
  Unit-of-Work, a repository interface with exactly one real implementation is ceremony
  not abstraction, and it makes testing worse since mocked `DbContext`s don't behave
  like the real provider). Don't introduce a generic repository layer without reading
  that ADR and having a genuinely new reason it no longer applies.
- **Contacts referenced by a Meeting can't be deleted** (`DirectoryController`,
  `DeleteBehavior.Restrict` in `AppDbContext`) — this is a deliberate deviation from the
  prototype (PRD §7) and has a matching test case (TC-30) in the TEST_PLAN.
  Same for a `City` used as a trip destination.
- **Date math lives in one place**: `Services/DateMath.cs` (`DaysBetween`) — inclusive
  day counting, matches the prototype's original `daysBetween()`. Don't reimplement it
  in a controller.
- **Seeding is idempotent**: `SeedData.SeedAsync` no-ops if any `Trip` rows already
  exist. Safe to re-run `docker compose up` without duplicating data; `docker compose
  down -v` to force a clean reseed.
- **Vacation approval** is currently open to any signed-in user (no RBAC enforcement
  yet — see `PROGRESS.md` item 5). Don't assume the `CoordinatorOrCeo` policy in
  `Program.cs` is actually applied anywhere yet; it isn't.
- **Calendar range is dynamic, not hardcoded**: the frontend computes a rolling
  6-month window from "today" (`sixMonthWindow` in `calendar-utils.ts`) rather than a
  fixed `Jun–Dec 2026`, per the PRD's deliberate deviation from the prototype.
- **Frontend has no DI container (by design), but it does have singletons where it
  matters**: `src/lib/api.ts`'s `api` object is a plain ES module export — JS modules
  are singletons by nature, so every page imports the same instance, and it's the
  *only* thing allowed to call `fetch()` (grep for stray `fetch(` outside `api.ts` if
  you're ever unsure — there should be none). `QueryClient` (`src/app/providers.tsx`)
  is created exactly once via `useState(() => new QueryClient(...))`, **not** a
  module-level `const` — that's deliberate: a true module-level singleton would leak
  cached data across different users' requests during server-side rendering, while
  `useState`'s initializer still only runs once per app load on the client. Don't
  "simplify" either of these into something else without understanding why they're
  built this way.

## Seeded accounts (see README.md for the full list)

`coordinator@mgh.example.com` / `ceo@mgh.example.com` / `jamie@mgh.example.com` — all
currently carry equal permissions (RBAC is bonus scope, not yet enforced).

## Current known gaps

See `PROGRESS.md` for the live list. Headline items: `docker compose up` hasn't been
run end-to-end yet (no Docker in the build environment), nothing is committed to git
yet, and all bonus-scope items (email, RBAC enforcement, real-time sync, deeper Google
Flights capture, audit trail, CI) are unstarted.
