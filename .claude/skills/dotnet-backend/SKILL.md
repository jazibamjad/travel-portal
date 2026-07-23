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

Never parse a "City, Country" free-text string yourself. Inject `CityResolver` (same
pattern as every other service — constructor parameter, e.g.
`public class TripsController(AppDbContext db, CityResolver cityResolver) : ControllerBase`)
and call `cityResolver.GetOrCreateAsync(label)` — it's the single place that
creates-or-finds a `City` row, used by trips, team-plan entries, and bulk-add endpoints
alike. It used to be a `static` helper method taking `AppDbContext` as a parameter; it
was converted to an ordinary injected service so every piece of business logic in this
codebase follows the same DI pattern, with no static-utility exception.

## Dependency injection & service lifetimes

Everything in `Services/` and every controller uses constructor injection (C# 12
primary constructors — `public class Foo(AppDbContext db, SomeService svc) : ...`).
There is no static-utility-class escape hatch anywhere in `Services/` — if you're
tempted to write a `static` helper method that touches the database or any injected
dependency, make it an injected service instead (see the `CityResolver` note above for
why this was actively enforced, not just a style preference).

**Lifetime is chosen per service, based on what it depends on — not defaulted to one
pattern everywhere:**

- `AddSingleton<PasswordHasher>()` — the only Singleton in the app. Safe *because*
  `PasswordHasher` is genuinely stateless: it holds no fields and every method is a
  pass-through to static `BCrypt.Net.BCrypt` calls. One instance for the app's entire
  lifetime, no per-request allocation.
- `AddScoped<...>()` — everything else (`CityResolver`, `PlanAggregationService`,
  `KpiService`, `CalendarService`, `OnePagerService`). All of these depend on
  `AppDbContext`, which EF Core itself registers as `Scoped` (one instance per HTTP
  request, disposed at the end of it).

**Why not just make everything a Singleton for consistency/performance?** Because a
`Scoped` dependency injected into a `Singleton` is the classic ASP.NET Core "captive
dependency" bug: the Singleton is constructed once and holds onto whatever `AppDbContext`
instance existed at that moment, forever. That `DbContext` gets disposed at the end of
the very first request that used it — every request after that throws
`ObjectDisposedException`, and even before that point, sharing one `DbContext` across
concurrent requests is unsafe (EF Core's `DbContext` is not thread-safe). The rule of
thumb for a new service in this codebase: **if it touches `AppDbContext` (directly or
transitively through another Scoped service), it's `Scoped`. If it's genuinely stateless
and has no dependencies that are themselves request-scoped, it can be `Singleton`.**
`AddTransient` isn't used anywhere here — there's no service in this codebase that needs
a fresh instance *within* a single request, which is the specific case Transient is for.

## No repository layer — read this before adding one

Controllers and `Services/` classes inject `AppDbContext` and query it directly with
LINQ. There is **no** `IRepository<T>` / `ITripRepository` / generic repository
abstraction anywhere in this codebase, and that's deliberate — full reasoning is
`docs/TRD.md` ADR-6. The short version, so you don't accidentally "fix" this: EF Core's
`DbContext`/`DbSet<T>` already implements Repository + Unit-of-Work; a hand-rolled
repository interface on top of it has exactly one implementation ever (no
substitutability benefit) and makes tests *worse* (mocked `DbContext`s don't behave like
a real provider — this codebase tests pure logic with no DB dependency instead, per the
Testing section above). If you're adding a new controller or service, follow the
existing pattern — inject `AppDbContext` (or another `Services/` class) directly, don't
introduce a repository interface for it.

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
