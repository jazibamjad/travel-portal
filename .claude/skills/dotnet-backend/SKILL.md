---
name: dotnet-backend
description: Use when adding or changing anything under backend/Api or backend/Api.Tests — new entities, controllers, DTOs, services, or backend tests for the MGH Travel Portal ASP.NET Core 9 Web API.
---

# .NET backend conventions (backend/Api)

This is a single-project ASP.NET Core 9 Web API (controller-based, not minimal APIs),
backed by PostgreSQL via EF Core. Read `docs/TRD.md` §2–5 first for the architectural
rationale — this skill is the "how to add to it" companion, not a replacement.

## Layout

- `Entities/` — plain EF Core entity classes. One file per entity. Enums live in
  `Entities/Enums.cs`, stored as strings in Postgres (`HasConversion<string>()` in
  `AppDbContext.OnModelCreating`) so the database stays human-readable.
- `Data/AppDbContext.cs` — all relationship/delete-behavior configuration lives here,
  not in the entity classes. Check this file before adding a new FK relationship —
  cascade vs. restrict is a deliberate product decision (see delete-guard notes below),
  not a default to leave unconsidered.
- `Data/SeedData.cs` — extend this, don't create a second seeding path. It's gated by
  `if (await db.Trips.AnyAsync()) return;` — keep that guard so `docker compose up` stays
  idempotent.
- `Dtos/` — one file per feature area (`TripDtos.cs`, `FlightDtos.cs`, ...). Request DTOs
  and response DTOs are separate `record` types even when nearly identical — don't reuse
  an entity or a response DTO as a request body.
- `Services/` — business logic with no `HttpContext`/`ActionResult` awareness, so it's
  unit-testable without spinning up ASP.NET Core. `KpiService`, `CalendarService`,
  `OnePagerService`, `PlanAggregationService` are the pattern to follow for anything that
  aggregates across trips/team-plan/meetings.
- `Controllers/` — one controller per resource group, matching `docs/TRD.md` §4's API
  contract table. Keep controllers thin: parse/validate the request, call a service or
  do a direct EF Core query, map to a DTO, return. Push anything with actual logic
  (date math, aggregation, cross-entity merging) into `Services/`.

## Adding a new entity

1. Add the class to `Entities/`.
2. Register the `DbSet<T>` and any relationship config in `AppDbContext.cs`.
3. Generate a migration: `cd backend/Api && dotnet ef migrations add <Name> --output-dir Data/Migrations`.
4. Update `docs/TRD.md` §3 (ERD) to match — the diagram is a contract, not decoration.
5. If it needs demo data, add it to `SeedData.cs`.

## Delete-guard pattern

Several relationships deliberately use `DeleteBehavior.Restrict` instead of `Cascade`
because silently orphaning data was identified as a prototype bug worth fixing (see
`docs/PRD.md` §7): a `Contact` referenced by a `Meeting`, or a `City` used as a trip
destination, cannot be deleted. If you add a new "X references Y" relationship, ask
whether deleting Y while X exists should be blocked, cascaded, or nulled — don't default
to cascade without thinking about it. Controllers that delete should return `409
Conflict` with a clear message when a restrict-guarded delete is attempted, not let the
raw `DbUpdateException` leak to the client.

## City/destination handling

Never parse a "City, Country" free-text string yourself. Call
`CityResolver.GetOrCreateAsync(db, label)` — it's the single place that creates-or-finds
a `City` row, used by trips, team-plan entries, and bulk-add endpoints alike.

## Auth

Cookie-based session auth (`AuthController`), not JWT-in-body. New endpoints get
`[Authorize]` by default (see `PeopleController`/`TripsController` etc. for the
pattern) — only `POST /api/auth/login` is `[AllowAnonymous]`. Role-gating exists as a
registered policy (`CoordinatorOrCeo` in `Program.cs`) but is **not yet applied
anywhere** — if you're implementing the RBAC bonus (`PROGRESS.md` item 5), that's the
policy to attach via `[Authorize(Policy = "CoordinatorOrCeo")]`.

## Testing

`backend/Api.Tests` is xUnit. Business logic in `Services/` should be pure enough to
test without a database — see `DateMathTests.cs` and `PlanAggregationServiceTests.cs`
for the pattern (services that only touch `AppDbContext` in specific methods can be
instantiated with `null!` for tests that exercise a different, pure method). Run with
`dotnet test` from `backend/`.

## Before calling backend work done

```bash
cd backend
dotnet build   # must be 0 errors, 0 warnings
dotnet test    # must be all-green
```
