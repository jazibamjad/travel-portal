---
name: postgres-ef-core
description: Use when changing the database schema, writing or reviewing EF Core migrations, debugging query/relationship issues, or touching anything in backend/Api/Data for the MGH Travel Portal.
---

# PostgreSQL + EF Core (backend/Api/Data)

Single PostgreSQL database, EF Core (Npgsql provider) as the only data-access layer —
no raw SQL, no Dapper, no second ORM. Schema is entirely migration-driven; there is no
hand-written `.sql` anywhere in the repo. See `docs/TRD.md` §3 for the authoritative ERD
and the reasoning behind each relationship.

## Migration workflow

```bash
cd backend/Api
dotnet ef migrations add <DescriptiveName> --output-dir Data/Migrations
```

- Migrations live in `Data/Migrations/`, committed to git like any other source file.
- **Never hand-edit a generated migration's `Up()`/`Down()`** unless fixing something
  EF Core got demonstrably wrong (e.g. an index name collision) — regenerate instead.
- After adding a migration, update `docs/TRD.md` §3's Mermaid ERD to match if the
  relationship shape changed. The diagram is treated as a contract, not decoration —
  keep it truthful.
- Migrations are applied by running the API with the `--migrate` argument
  (`dotnet run -- --migrate`), which calls `db.Database.MigrateAsync()` then
  `SeedData.SeedAsync()` and exits — see `Program.cs`. This is also what the
  `docker-compose.yml` `migrate` service runs. There is no separate `dotnet ef database
  update` step baked into the container flow (though it works fine for local dev too).

## Schema conventions already established

- **Enums stored as strings**, not integers (`HasConversion<string>()` in
  `AppDbContext.OnModelCreating`) — a `SELECT * FROM "Trips"` stays human-readable in
  psql, and adding/reordering enum values never risks silently shifting existing rows'
  meaning.
- **`Guid` primary keys** everywhere, client-generatable, avoids round-tripping to get
  an ID before building related rows (e.g. seeding a `Trip` with in-memory `Meeting`
  children in one `SaveChangesAsync`).
- **Delete behavior is chosen deliberately per relationship**, not left at the EF Core
  default. Restrict is used specifically to protect data integrity gaps identified in
  the PRD (see the `dotnet-backend` skill's "delete-guard pattern" section) — if you add
  a relationship, decide Cascade/Restrict/SetNull consciously and say why in a comment
  if it's not obvious.
- **Nullable dates are intentional**, not an oversight: `Trip.FromDate`/`ToDate` and
  `TeamPlanEntry.FromDate`/`ToDate` are nullable because the product supports
  "Option — dates TBC" rows (straight from the prototype's behavior). Don't add a
  `NOT NULL` constraint to these without checking `docs/PRD.md` first.
- **`City` is one table serving two purposes**: the destination autocomplete (broad,
  seeded list) and the contacts directory (narrower, "has contacts" subset). Don't split
  this into two tables — see TRD ADR-5 for why they're intentionally the same table.

## Debugging a running database

The `db` service publishes port 5432, so you can connect directly:

```bash
docker compose up db -d
psql "postgresql://mgh:mgh_dev_password@localhost:5432/mgh_travel"
```

(Credentials match `docker-compose.yml`'s defaults — see `.env` overrides there if
you've changed them.)

## Before calling a schema change done

```bash
cd backend
dotnet build            # migration + model must compile together
dotnet ef migrations add <Name> --output-dir Api/Data/Migrations --project Api --startup-project Api
dotnet test              # nothing in Services/ should have silently broken
```
