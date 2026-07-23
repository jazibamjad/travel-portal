# Product Requirements Document (PRD)

**Product:** MGH Executive Travel & Team Planning Portal
**Status:** Draft v1.0
**Date:** 2026-07-23
**Depends on:** [BRD.md](./BRD.md)

---

## 1. Personas

### P1 — Executive Coordinator ("Coordinator")
The CEO office assistant (prototype's implicit author, e.g. Grace Hall). Primary power
user and effectively the system's operator. Plans every CEO trip, manages the directory,
runs bulk entry, keeps the flights list current, and produces one-pagers before each
trip. Needs speed for repetitive data entry (many meetings, many trip legs) more than she
needs guardrails.

### P2 — The CEO (Alex Morgan)
Subject of nearly every trip. Consumes one-pagers before travel (itinerary, agenda,
materials). Only actor who approves or rejects team vacation requests. Low tolerance for
friction — needs to see "what do I need to know/bring today" at a glance, not edit forms.

### P3 — Team Member / Traveller
Any of the CEO office's travel-eligible staff (Jamie Morgan, Sam Baker, Robin Garcia,
Wesley Stone, Kevin Marks, Grace Hall, Pierre, and future hires). Appears on the shared
calendar, may be assigned to CEO trips/meetings, maintains their own team-plan rows
(personal trips, options, vacation requests, remote stints), and views their own
one-pager.

### P4 — Reviewer / Evaluator (assignment-specific)
Not a real product persona, but the person running the live demo. Needs seeded
credentials for at least one Coordinator-like account and one Team Member account to
exercise role differences if RBAC bonus is implemented.

---

## 2. User Stories & Acceptance Criteria

Stories are grouped by capability area, mirroring the assignment's functional-scope
checklist. Each has an ID used for traceability into the TRD and TEST_PLAN.

### 2.1 Authentication & Access

**US-1.1** — As any user, I want to sign in with an email/password I was given, so that I
can access the shared plan instead of an anonymous local copy.
- Given a seeded account, when I submit correct credentials, then I receive a session
  (JWT or cookie) and land on the Overview.
- Given wrong credentials, then I see an inline error and remain on the sign-in screen.
- Given no valid session, then any app route redirects to sign-in.

**US-1.2** *(Should)* — As a Coordinator, I want team members to only see/edit what's
appropriate for their role, so that the CEO's trip data isn't casually edited by everyone.
- Given a Team Member account, when they view a trip they are not part of, then trip
  detail is read-only or hidden per the access rule documented in the TRD.
- Given a Coordinator or CEO account, then they retain full edit rights (baseline, since
  full RBAC is bonus scope).

### 2.2 Overview / KPIs

**US-2.1** — As a Coordinator or the CEO, I want a landing dashboard with key numbers, so
that I can gauge the state of travel planning at a glance.
- Shows: count of upcoming CEO trips, next departure (destination + date), total CEO
  travel days (sum across trips), and total meetings planned.
- Numbers recompute from current data on every load (no stale cached KPIs).

### 2.3 Team Calendar

**US-3.1** — As any signed-in user, I want a color-coded timeline of everyone's trips,
options, vacations, and remote stints, so that I can see the whole team's availability at
once.
- Entry types render in distinct colors: Trip, Option, Vacation, Remote.
- A "today" marker is visible on the timeline.
- Vacation bars show approval state (Pending/Approved/Rejected) visually.

**US-3.2** — As any signed-in user, I want to drill from a half-year view down to quarter,
month, and week, so that I can inspect a busy period in detail without losing context.
- Clicking a quarter opens that quarter's months; clicking a month opens its weeks;
  breadcrumbs let me navigate back up any level.

**US-3.3** — As any signed-in user, I want to filter the calendar to one or more specific
people, so that I can focus on a subset of the team.
- An "all" state and a multi-select-by-name state are both supported; selecting a name
  while "all" is active isolates to that name, and further clicks add/remove names.

**US-3.4** — As any signed-in user, I want to click a calendar bar to open that trip's
one-pager, so that I can jump straight from "when" to "what."

### 2.4 Trip Planner

**US-4.1** — As a Coordinator, I want to create a CEO trip with destination, dates,
project, entity, status, hotel, and transport, so that the core trip record exists before
I attach meetings.
- Destination is required; date validation prevents a return date earlier than the
  departure date.
- Project and entity are chosen from a managed list, with the ability to add a new value
  in-place (replacing the prototype's `prompt()` flow with an inline "add new" combobox
  entry).

**US-4.2** — As a Coordinator, I want to pick people to meet from that city's directory,
so that each becomes a structured meeting on the trip.
- Only contacts whose directory city matches the selected destination city are offered.
- Selecting a contact creates a meeting; deselecting removes it.

**US-4.3** — As a Coordinator, I want each meeting to carry order, priority, status,
time, attending team members, an agenda, and required materials with an owner, so that
the office and the CEO both know exactly what's needed and by whom.
- Order is a positive integer used to sort meetings within the trip.
- Priority ∈ {High, Medium, Low}; Status ∈ {Proposed, Requested, Confirmed, Tentative,
  Declined, Completed} (values carried from the prototype).
- Materials are a repeatable list of (description, owner) pairs; owner is chosen from the
  travel-eligible team.

**US-4.4** — As a Coordinator, I want to see, search, and filter existing trips (by city,
project, person, free text) and see them grouped into upcoming vs. past, so that I can
manage a growing trip list without scrolling through everything.

### 2.5 Bulk Entry

**US-5.1** — As a Coordinator, I want to add several trip legs in one quick table, so that
I don't have to run the full single-trip form for every simple leg.
- Each row: project, entity, city, from, to, status; rows can be added/removed before
  committing; committing creates one trip per valid row (a destination is required per
  row).

**US-5.2** — As a Coordinator, I want to add the same plan entry (dates, place, type,
notes) to several people at once, so that group trips/options don't require repeating
the same entry per person.

### 2.6 Flights

**US-6.1** — As a Coordinator, I want an editable list of flights on file (traveller,
route, date, flight number, depart/arrive, aircraft), so that confirmed and proposed
segments are tracked in one place.

**US-6.2** — As a Coordinator, I want to attach a flight from that list to a trip, so that
the trip's one-pager shows the traveller's actual flight.

**US-6.3** — As a Coordinator, I want a deep link into an external flight-search site
prefilled with origin, destination, and date, so that I can quickly check live schedules
without retyping the route.

### 2.7 Team Plan & Vacation Approval

**US-7.1** — As a Team Member, I want to record my own plan entries (dates, place, type,
notes), so that I appear correctly on the shared calendar.

**US-7.2** — As a Team Member, I want to submit a vacation request that starts in a
Pending state, and as the CEO, I want to approve or reject it, so that time-off has a
clear, visible decision trail.
- Only Vacation-type entries carry an approval state; Approved/Rejected are terminal
  states visible on the calendar (✓ / ✗ / ⏳ equivalents) and on the requester's
  one-pager.
- *(Deviation, see §5)*: in the MVP without RBAC, any signed-in user can action approvals;
  once RBAC lands, this narrows to CEO/Coordinator roles.

### 2.8 Directory

**US-8.1** — As a Coordinator, I want people and organizations grouped by city, so that
the meeting picker only offers realistic, locally relevant contacts.

**US-8.2** — As a Coordinator, I want to add or remove a city and add or remove a contact
within a city, so that the directory stays current as MGH's network grows.

### 2.9 One-Pagers

**US-9.1** — As the CEO or a Team Member, I want a printable one-page brief for a person
covering itinerary, days-per-country totals, meetings with agendas, and materials to
prepare, so that I can walk into a trip fully briefed.
- Available both as a per-person full brief (all trips) and a per-segment brief (one
  specific trip leg, reachable by clicking that segment on the calendar).
- Printable to PDF via the browser print dialog.

### 2.10 Data & Multi-User Consistency

**US-10.1** — As any user, I want my edits to appear for other signed-in users within a
short, predictable delay, so that the team isn't working from stale data.
- Baseline: polling refetch (interval documented in TRD). Bonus: push update via
  SignalR.

**US-10.2** — As a Coordinator, I want to export the whole plan to JSON and import it back,
so that I retain a portable backup independent of the database.

### 2.11 Bonus Stories

**US-11.1** *(Could)* — As the CEO, I want to receive an email when a vacation request is
approved/rejected, and as a Team Member, I want to email a one-pager to a traveller, via a
local mail catcher, so that notification doesn't require a real mail server to demo.

**US-11.2** *(Could)* — As a Coordinator, I want to launch a flight search prefilled from
a trip leg and pull the chosen flight's details back into the trip with minimal retyping,
so that flight capture is faster than the prototype's manual re-entry.

**US-11.3** *(Could)* — As an evaluator, I want automated tests and a CI pipeline, so that
regressions are caught mechanically rather than by manual re-testing.

**US-11.4** *(Could)* — As a Coordinator, I want a change history on trips/meetings, so
that "who changed what, when" is answerable without asking around.

---

## 3. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Seeded-user sign-in issuing a session (JWT or cookie); protected routes redirect unauthenticated users | Must |
| FR-2 | Role field on users (Coordinator/CEO/Team Member) persisted, even if not yet enforced everywhere | Must |
| FR-3 | Enforce role-based restrictions on edit actions (RBAC) | Could |
| FR-4 | Overview KPIs: upcoming trip count, next departure, total travel days, meetings planned — computed live from current data | Must |
| FR-5 | Team calendar rendering Trip/Option/Vacation/Remote entries per person, color-coded, with a today marker | Must |
| FR-6 | Calendar drill-down: half-year → quarter → month → week, with breadcrumb navigation back up | Must |
| FR-7 | Calendar per-person filter (all / isolate one / add multiple) | Must |
| FR-8 | Click-through from a calendar entry to its one-pager (person-level or segment-level) | Must |
| FR-9 | Create/edit/delete a CEO trip: destination, dates (validated to ≥ start date), project, entity, status, hotel, transport | Must |
| FR-10 | Directory-driven meeting picker scoped to the trip's destination city | Must |
| FR-11 | Per-meeting fields: order, priority, status, time, attending team members, agenda, materials (description + owner), full CRUD | Must |
| FR-12 | Trip list search/filter by free text, person, project; grouped into upcoming/past | Must |
| FR-13 | Bulk multi-row trip creation | Must |
| FR-14 | Bulk plan-entry creation applied to multiple selected people at once | Must |
| FR-15 | Flights-on-file: full CRUD (traveller, route, date, flight no., depart, arrive, aircraft) | Must |
| FR-16 | Attach a flight-on-file record to a trip | Must |
| FR-17 | External flight-search deep link prefilled with origin/destination/date | Must |
| FR-18 | Per-person team-plan entries: full CRUD (dates, place, type, notes) | Must |
| FR-19 | Vacation entries carry an approval state (Pending/Approved/Rejected) with an action to change it | Must |
| FR-20 | Directory: cities and contacts, full CRUD, grouped by city | Must |
| FR-21 | Person one-pager: itinerary table, days-per-country totals, meetings/agenda, materials, printable | Must |
| FR-22 | Segment one-pager: same content scoped to a single trip leg | Should |
| FR-23 | PostgreSQL as the sole persistent source of truth (no client-only state for core data) | Must |
| FR-24 | Two concurrent sessions converge on the same data within the documented polling interval | Must |
| FR-25 | JSON export of the full plan; JSON import restoring it | Should |
| FR-26 | Email notification on vacation decision + "email this one-pager" action, via containerized mail catcher | Could |
| FR-27 | Capture a chosen flight's details back into the originating trip from the search flow | Could |
| FR-28 | Automated test suite (unit + integration) and CI pipeline | Could |
| FR-29 | Change/audit history on trips and meetings | Could |
| FR-30 | Real-time push updates (SignalR) in place of/alongside polling | Could |

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Portability**: entire stack runs offline via `docker compose up`, no external network calls required for core functionality (the Google Flights deep link is the sole intentional external navigation, opened in a new tab, and its absence of connectivity degrades gracefully). |
| NFR-2 | **Startup**: fresh checkout to fully running (migrated + seeded) stack in one command, no manual DB setup. |
| NFR-3 | **Security baseline**: passwords hashed (never stored/returned in plaintext), sessions expire, API rejects unauthenticated requests, inputs validated server-side (not just client-side) against injection and malformed dates. |
| NFR-4 | **Responsiveness**: usable on a laptop viewport down to ~1024px and gracefully down to tablet widths (~768px); the calendar and tables must not force horizontal page scroll on the app shell. |
| NFR-5 | **Consistency**: staleness window for a second session to observe another session's write is bounded and documented (polling interval, or immediate under the real-time bonus). |
| NFR-6 | **Data integrity**: date ranges validated (return ≥ departure) both client- and server-side; deleting a directory city/contact that is referenced by existing meetings is handled explicitly (soft-block or cascade — decided in TRD), not left to silently orphan data. |
| NFR-7 | **Performance**: primary views (Overview, Calendar, Trip list) render from a seeded dataset of realistic size (the prototype's ~10 cities, ~150 contacts, dozen-plus trips) in well under a second on local Docker. |
| NFR-8 | **Explainability**: no generated code the author cannot explain live; no opaque scaffolding left unexamined. |
| NFR-9 | **Accessibility baseline**: forms have associated labels, color-coding (calendar entry types) is paired with text/pattern, not color alone. |

## 5. Prioritization (MoSCoW Summary)

- **Must**: FR-1, FR-2, FR-4–FR-21, FR-23–FR-25 — i.e., the full functional-parity
  checklist from the assignment, real auth, and PostgreSQL persistence with multi-user
  consistency. This is the bar for a passing, demoable product.
- **Should**: FR-22 (segment one-pager) — present in the prototype's UX (click a calendar
  bar) but structurally an extension of FR-21.
- **Could**: FR-3, FR-26–FR-30 — the assignment's explicit bonus scope, attempted in the
  value-ordered sequence set in the BRD (tests → email → RBAC → real-time → deeper
  flights → audit trail) as time allows.
- **Won't** (this build): real flight booking/ticketing, external SSO, native mobile
  apps, multi-tenancy, public hosting — see BRD §5.3.

## 6. UX Notes

The prototype's UX patterns are preserved where they work well and modernized where they
were clearly artifacts of a single-file no-framework build:

- **Navigation**: the prototype's single scrolling page with anchor links becomes a
  persistent app shell with real routes/tabs: Overview, Calendar, Planner, Flights, Team
  Plan, Directory. State (e.g. calendar filters) persists across navigation within a
  session.
- **Forms over `prompt()`/`confirm()`**: every "Other (type new)…" flow that used a
  browser `prompt()` (new project, new entity, new hotel) becomes an inline combobox with
  an "add new" affordance in the dropdown itself. Destructive actions (delete trip,
  delete contact) use a proper confirmation dialog, not `window.confirm`.
- **One-pager as a route, not an overlay hack**: the prototype toggles a full-screen div
  and a body class to fake a "page" for printing. The rebuild uses a dedicated
  route/print stylesheet per person (and per segment), so the browser's native
  print-to-PDF works without JS-driven visibility tricks.
- **Calendar**: kept as the visual centerpiece — a horizontal timeline, drill-down
  breadcrumbs, per-person filter chips, and a today marker, rebuilt as an interactive
  component rather than string-built HTML.
- **Meeting builder**: the "tick a contact → a meeting card appears below" pattern is
  kept, since it directly maps the mental model (who → what/when/why) the office already
  uses.
- **Responsive**: grid-based forms already collapse to single-column under ~820px in the
  prototype; the rebuild keeps that breakpoint behavior and extends it to the calendar and
  trip cards.

Low-fidelity structure of the Overview (landing) page:

```
┌─────────────────────────────────────────────────────────┐
│ Top nav: Overview | Calendar | Planner | Flights | Team | Directory │
├─────────────────────────────────────────────────────────┤
│ [Upcoming trips] [Next departure] [Travel days] [Meetings] │  ← KPI cards
├─────────────────────────────────────────────────────────┤
│ Team Calendar (half-year, drill-down, person filter)       │
│ ───────────────────────────────────────────────────────── │
│ Name  ▕████ Trip ████▏      ▕▓▓ Option ▓▓▏     |today      │
│ Name  ▕░░ Vacation (Pending) ░░▏                            │
├─────────────────────────────────────────────────────────┤
│ One-pagers: [Alex Morgan] [Jamie Morgan] [Sam Baker] ...    │
└─────────────────────────────────────────────────────────┘
```

## 7. Deliberate Deviations from the Prototype

| Area | Prototype behavior | Rebuild decision | Why |
|---|---|---|---|
| Persistence | `localStorage`, single browser | PostgreSQL via API, shared across all clients | Core ask of the assignment; enables real multi-user use. |
| Sync | Optional, disabled Firebase realtime listener | REST API + polling by default; SignalR as bonus | Firebase is a third-party dependency outside the mandated stack; polling meets the stated bar ("polling is acceptable"). |
| Auth | Login overlay wired to Firebase Auth, disabled (`enabled:false`) by default — effectively no auth in practice | Real seeded-user auth (sessions/JWT) always on | The prototype's own comment ("not configured — running local only") shows it was never load-bearing; the assignment requires it to be. |
| "Add new" flows | Browser `prompt()` for new project/entity/hotel names | Inline "add new" combobox option | `prompt()` is not usable in a modern responsive UI and can't be styled/tested. |
| One-pager rendering | Full-screen `<div>` toggled via JS + a `body.show-op` CSS hack for print | Dedicated routed page with its own print stylesheet | Cleaner, testable, and avoids fragile print-mode CSS coupling. |
| Data export | JSON export/import as the *primary* sharing mechanism between users | Retained, but repositioned as a backup/portability feature — the database is now the primary sharing mechanism | The database supersedes the need to pass files around; export/import remains useful for backups and migration. |
| Calendar window | Hardcoded Jun–Dec 2026 | Configurable date range at the data layer, with seed data defaulting to the same H2 2026 window for demo fidelity | Avoids baking a stale year into the schema while keeping the demo visually identical to the prototype. |
| Vacation approval actor | Any user with the file can set approval state | MVP: any signed-in user; Bonus (RBAC): restricted to CEO/Coordinator roles | Matches the assignment's baseline ("proper role separation is a bonus"). |
| Directory delete safety | Deleting a city/contact silently drops it, even if referenced by existing meetings | Deletion is blocked (or explicitly cascades with a warning) when a contact/city is referenced by an existing meeting | Prevents orphaned meeting records — a data-integrity gap in the prototype worth fixing. |

---

Next: [TRD.md](./TRD.md) — architecture, ERD, API contract, technology trade-offs,
security approach, and Docker deployment topology.
