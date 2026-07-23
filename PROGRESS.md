# Build Progress — MGH Travel & Team Planning Portal

Working status log against [docs/BRD.md](docs/BRD.md), [docs/PRD.md](docs/PRD.md), and
[docs/TRD.md](docs/TRD.md). Not one of the assignment's required SDLC documents — this
is a scratch tracking file for whoever (human or AI) picks this build up next.

**Last updated:** 2026-07-23

---

## Done

### Documentation (`/docs`)
- `BRD.md`, `PRD.md`, `TRD.md`, `TEST_PLAN.md` — written in that order, before the
  corresponding code, per the assignment's process requirement.
- `README.md` — prereqs, one-command startup, seeded credentials, troubleshooting.

### Backend (`backend/Api`, ASP.NET Core 9 Web API)
- Full entity model + `AppDbContext` matching the TRD's ERD (`User`, `Person`, `City`,
  `Contact`, `Trip`, `Meeting`, `Material`, `Flight`, `TeamPlanEntry`), with the
  delete-guard relationships (`Contact`/`City` referenced by a `Meeting` can't be
  deleted) wired via EF Core `DeleteBehavior`.
- Cookie-based session auth (`AuthController`: login/logout/me), BCrypt password hashing.
- Controllers for every Must-have capability: `DirectoryController`, `TripsController`
  (incl. bulk add, meetings, travellers), `MeetingsController` (incl. materials),
  `FlightsController` (incl. attach-to-trip), `TeamPlanController` (incl. bulk add +
  vacation approval), `OverviewController` (KPIs + calendar), `PeopleController` +
  `TripsController` one-pager endpoints, `ExportImportController`.
- `SeedData.cs` — idempotent seed reusing the prototype's fictional dataset (people,
  cities/contacts, a confirmed Prague trip with 4 meetings, flights, team-plan rows,
  3 seeded login accounts).
- Initial EF Core migration generated (`Data/Migrations/`).
- `Api.Tests` (xUnit): 7 passing unit tests on `DateMath` and
  `PlanAggregationService.DaysByCity` — the date/day-count logic identified in the
  TEST_PLAN as highest-value to automate.
- `dotnet build` and `dotnet test`: clean, 0 errors/warnings, 7/7 tests passing.

### Frontend (`frontend`, Next.js 16 + TypeScript + Tailwind + TanStack Query)
- Auth-gated app shell (`proxy.ts` — Next 16's renamed `middleware.ts`), login page,
  top nav (Overview / Calendar / Planner / Flights / Team Plan / Directory).
- Overview (KPI cards + one-pager launcher), Calendar (half-year → quarter → month →
  week drill-down, per-person filter, today marker, click-through to one-pagers),
  Planner (trip list/search/filter, create form, bulk multi-trip add, trip detail with
  meeting/material management), Flights (inline-edit table + add form), Team Plan
  (per-person entries, bulk add, vacation approve/reject), Directory (add/remove
  city/contact), printable person and trip one-pagers.
- `tsc --noEmit` and `next build` (incl. standalone output): clean.

### Dockerization
- `backend/Api/Dockerfile`, `frontend/Dockerfile` (multi-stage, standalone Next.js
  output), root `docker-compose.yml` with a one-shot `migrate` service (applies EF Core
  migrations + seeds data) gating `api` startup via
  `depends_on: condition: service_completed_successfully`.
- **Verified end-to-end on 2026-07-23** via `docker compose up --build`: `db` healthy,
  `migrate` exited 0 (migrations applied + seed data loaded), `api` and `web` both up.
  Confirmed by hitting the running stack directly: `GET /health` → `{"status":"ok"}`;
  login with the seeded `coordinator@mgh.example.com` account issues a valid session
  cookie; authenticated `GET /api/overview/kpis` returns correct numbers computed from
  the real seed data (1 upcoming trip, next departure New York 2026-08-02, 30 total
  travel days, 4 meetings); `/api/people` and `/api/trips` return the full seeded
  roster/trip graph; the frontend's route guard correctly 307-redirects an
  unauthenticated request to `/overview` → `/login?next=%2Foverview`; `web` serves real
  rendered page content on port 3000.
- Static review of `docker-compose.yml` + both Dockerfiles against the real project
  files caught and fixed one real bug before the first run: the `migrate` service's
  `command:` was being *appended* to the Dockerfile's `ENTRYPOINT` (Compose semantics),
  producing a double-invocation (`dotnet Api.dll dotnet Api.dll --migrate`) that
  happened to still work but was fragile. Fixed to `command: ["--migrate"]`.
- Getting to a clean run required two real infrastructure fixes on the host machine,
  unrelated to the project code: (1) Docker Desktop wasn't installed at all and needed
  a manual admin-elevated install (winget couldn't complete it non-interactively); (2)
  the first build attempt crashed with `read-only file system` / `input/output error`
  from Docker's containerd store, traced to the C: drive having only ~18 MB free —
  freeing space, restarting Docker Desktop, and clearing the build cache
  (`docker builder prune`) resolved it.

### Documentation extras added beyond the required SDLC set
- `PROGRESS.md` (this file) and root `CLAUDE.md` (project map + conventions for
  whoever/whatever works on this repo next).
- `.claude/skills/` — four repo-specific skills (`dotnet-backend`, `nextjs-frontend`,
  `postgres-ef-core`, `docker-compose-ops`) documenting this project's actual
  conventions, not generic advice.

---

## Remaining

### Before this can be called "done"
1. ~~Run `docker compose up --build` on a machine with Docker Desktop~~ — **done**,
   verified 2026-07-23 (see above).
2. **Execute `docs/TEST_PLAN.md` §4 (pre-demo regression checklist)** and the TC-1…TC-42
   functional test cases **through the actual browser UI** — what's verified so far is
   the API/routing layer via `curl`, not a human clicking through the calendar
   drill-down, the meeting builder, one-pager printing, etc. Record results in §5.
3. **Git commit.** Nothing is committed yet — the repo currently has no history at all,
   which undercuts the assignment's "we read the commit history" evaluation criterion.
   This should happen in meaningful, incremental commits (docs, then backend, then
   frontend, then Docker/README, then tests) even though it's landing in fewer, larger
   chunks than if it had been committed as it was built.

### Bonus scope (none started; priority order per BRD §5.2)
4. **Email integration** (Mailpit) — highest bonus value (+10). Nothing wired up yet:
   no `IEmailSender`, no Mailpit service in `docker-compose.yml`, no "email one-pager" /
   "notify on vacation decision" endpoints.
5. **RBAC enforcement** — `UserRole` exists on `User` and is in the session claims, but
   no endpoint actually checks it yet (the `CoordinatorOrCeo` policy is registered in
   `Program.cs` but unused). Vacation decisions and directory mutations are the obvious
   first candidates to gate.
6. **Real-time sync (SignalR)** — currently polling only (5s via TanStack Query
   `refetchInterval`), which satisfies the PRD baseline but not the bonus.
7. **Deeper Google Flights capture** — currently a deep-link plus a manual "add flight"
   form; the bonus asks for capturing the chosen flight's details back into the trip
   with less retyping.
8. **Audit trail** — `AUDIT_LOG` table is designed in TRD §3.1 but not implemented.
9. **CI pipeline** — `Api.Tests` exists and runs locally; nothing runs it automatically
   (no GitHub Actions workflow yet, despite the empty `.github/` folder sitting there).

### Submission process items (assignment §9, not yet done)
10. Push to a **private** repo and share access (or send a zip including `.git`) —
    public repositories are a disqualifier per the assignment's confidentiality terms.
11. Email the submission link to `shahzaib@getfieldforce.com` and confirm presentation
    availability.
12. Optional: expand the ADR list in TRD §8, add a changelog, or write a short
    retrospective ("what I'd do with more time") — explicitly called out as
    appreciated-but-optional.
