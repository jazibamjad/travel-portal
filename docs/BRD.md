# Business Requirements Document (BRD)

**Product:** MGH Executive Travel & Team Planning Portal
**Prepared by:** JAZIB AMJAD
**Status:** Draft v1.0
**Date:** 2026-07-23

---

## 1. Business Context

The CEO Office at Meridian Group Holdings (MGH) coordinates a high volume of executive
travel: the CEO (Alex Morgan) and a small travel-eligible team move between cities for
deal work, investor meetings, and project sites across a rolling half-year window, while
the rest of the team also has independent trips, options, remote-work stints, and personal
vacation to track on the same shared calendar.

Today this is run out of a single self-contained HTML prototype
(`MGH_Travel_Portal.html`). It has no backend and no database — all state lives in one
browser's `localStorage`, and the only way to share a snapshot with someone else is to
export a JSON file and have them import it, or manually configure an optional Firebase
realtime-sync feature that is disabled by default. It has proven the *concept* (a single
office assistant uses it successfully to plan CEO trips, pick meeting attendees from a
city directory, and print one-page itinerary briefs) but it cannot be handed to more than
one person at a time without data diverging, has no access control, and cannot survive a
browser data clear.

## 2. Problem Statement

The CEO office needs a shared, persistent, multi-user system of record for executive
travel and team planning that:

- Keeps one authoritative version of the plan instead of per-browser copies reconciled by
  hand via JSON export/import.
- Lets more than one person (the CEO office assistant and travelling team members) view
  and edit the plan concurrently without silently overwriting each other's changes.
- Preserves the workflows the office has already built its habits around: the trip
  planner with per-meeting agendas/materials, the color-coded team calendar with
  drill-down, the city-scoped contact directory, and the printable one-pager briefs.
- Survives beyond a single laptop's browser storage and can be run as a real,
  deployable product rather than a prototype.

The prototype is also, by its nature as a rapid internal tool, not something that was
ever hardened: there is no authentication in practice (login exists but is switched
off), no audit trail of who changed what, and no defined roles (any user with the file
can edit anything).

## 3. Stakeholders

| Stakeholder | Interest |
|---|---|
| CEO Office Assistant / Executive Coordinator (primary user) | Owns trip planning end-to-end: creates trips, books meetings, manages the directory, produces one-pagers for the CEO before travel. |
| CEO (Alex Morgan) | Subject of most trips; approves/rejects team vacation requests; consumes one-pagers. |
| Travelling team members (e.g. Jamie Morgan, Sam Baker, Kevin Marks, etc.) | Appear on the shared calendar, are assigned to trips/meetings, submit their own team-plan entries (trips, options, vacation, remote), need visibility into their own itinerary and materials they own. |
| Meeting counterparts / external contacts | Not system users, but their directory records (by city, with org/role) drive the meeting picker and must stay accurate. |
| Hiring evaluators (for this assignment) | Assess product thinking, SDLC discipline, code quality, and the working, demoable product. |

## 4. Business Objectives

1. **Single source of truth.** Replace per-browser `localStorage` with a real database so
   the plan is consistent regardless of who logs in or from where.
2. **Safe multi-user editing.** Two people viewing the portal at once must see the same
   data and must not have their changes silently clobbered (polling-based consistency is
   an acceptable baseline; real-time push is a stretch goal).
3. **Preserve institutional workflow.** Every planning capability the office already
   relies on (trip planning with meetings/materials, bulk entry, flights-on-file, the
   vacation approval workflow, the city directory, the printable one-pager) must still be
   achievable in the rebuilt product, even if the UI is modernized.
4. **Make the system a real, operable product.** Dockerized, one-command startup,
   migrations and seed data applied automatically, so it can be evaluated or handed off
   without bespoke setup steps.
5. **Establish a credible security/access baseline.** Real authentication (seeded users)
   at minimum, with role separation (CEO office vs. team member) as a stretch goal, so the
   product is not "anyone with the link can edit everything."

## 5. Scope

### 5.1 In scope (this build)

- Rebuilding all functional capabilities enumerated in the assignment's parity checklist:
  sign-in, overview KPIs, team calendar with drill-down, trip planner with meetings, bulk
  entry, flights-on-file with an external flight-search deep link, team plan with a
  vacation approval workflow, city-grouped directory, printable one-pagers, and
  PostgreSQL-backed persistence with consistent multi-user behavior.
- A modernized, responsive UI — the visual design and information architecture are free
  to change as long as the underlying capabilities are preserved or consciously improved
  (deviations documented in the PRD).
- Full SDLC documentation (BRD, PRD, TRD, TEST_PLAN, README) committed incrementally.
- A fully Dockerized deployment (frontend, API, database) that starts, migrates, and
  seeds demo data with a single command, and runs fully offline on a laptop.
- JSON export/import of the plan, retained as a data-portability feature (no longer the
  primary sync mechanism, since the database now plays that role).

### 5.2 Bonus scope (attempted opportunistically, time-permitting, in priority order)

1. Automated tests (unit/integration) and, if time allows, a CI pipeline.
2. Email integration — e.g. emailing a one-pager, or notifying on vacation
   approval/rejection — via a containerized mail catcher (Mailpit) so it demos offline.
3. Role-based access control distinguishing CEO office staff from team members.
4. Real-time multi-user sync (e.g. SignalR) in place of/in addition to polling.
5. Deeper Google Flights integration (launching a prefilled search from a trip leg and
   capturing the chosen flight's details back into the trip) — already partially present
   in the prototype; "going further" is explicitly called out as bonus.
6. Audit trail / change history.

### 5.3 Out of scope

- Real flight-booking, payment, or GDS/ticketing integration — the product only searches
  and records flight details manually; it does not book or purchase.
- Real email delivery to external mail servers — a local catcher (Mailpit) is sufficient;
  no production SMTP credentials or provider integration.
- Native mobile apps — the responsive web app is the only client.
- Multi-tenant support for organizations other than MGH — the product is single-tenant
  for this build.
- Integration with external corporate identity providers (SSO/SAML/OAuth) — seeded
  username/password (or JWT-based session) accounts are sufficient per the assignment.
- Public hosting/deployment of any kind — the assignment explicitly forbids this; the
  product must run locally/offline only.

## 6. Assumptions

- The prototype's fictional seed data (people, cities, contacts, trips, flights) may be
  reused as the rebuilt product's demo/seed data, per the assignment's process
  requirements.
- "Multi-user consistency" is acceptable via polling (short-interval refetch); true
  real-time push is a nice-to-have, not a requirement.
- The half-year (Jun–Dec 2026) calendar window in the prototype was a snapshot for that
  planning cycle, not a permanent constraint; the rebuilt product should treat the visible
  calendar range as a generalizable, not hardcoded, concept — but the specific date-range
  behavior and any deliberate deviation will be finalized and documented in the PRD.
- "Simple authentication" (seeded users with sessions or JWT) satisfies the sign-in
  requirement; full role separation is explicitly called out as a bonus, not a baseline
  requirement.
- The product is evaluated by running it locally on the developer's own laptop via Docker
  Compose — no cloud environment is assumed or required.
- AI-assisted development is permitted and expected, provided every shipped line can be
  explained and modified live in the presentation.

## 7. Success Criteria

- `docker compose up` from a clean checkout starts the frontend, API, and database,
  applies migrations, and seeds demo data with no manual steps, per the README.
- A reviewer can sign in with a seeded account and exercise every capability in the
  functional-scope parity checklist (Section 4 of the assignment) without needing to ask
  the author anything.
- Two browser sessions signed in concurrently observe the same underlying data and do not
  diverge or silently lose each other's edits.
- BRD, PRD, TRD, and TEST_PLAN are committed to `/docs` with git history showing they
  preceded (or evolved alongside) the corresponding code, not written retroactively.
- The author can open any file in the repository during the live review and explain and
  modify it.
- Submission (private repo, docs, `docker-compose.yml` at root) is ready by the bonus
  deadline (Mon 27 Jul 2026 EOD) where feasible, and no later than the hard deadline
  (Wed 29 Jul 2026 EOD).

## 8. Confidentiality

This document, the source prototype, and everything produced from them are strictly
confidential per the assignment terms: no redistribution, no public hosting, and no
publication to any public repository, gist, or portfolio, during or after the hiring
process.
