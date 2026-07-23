# Test Plan

**Product:** MGH Executive Travel & Team Planning Portal
**Status:** Draft v1.0 — strategy and cases defined pre-build; execution evidence (§5)
will be filled in as each area is implemented, per commit.
**Date:** 2026-07-23
**Depends on:** [BRD.md](./BRD.md), [PRD.md](./PRD.md), [TRD.md](./TRD.md)

---

## 1. Test Strategy

| Level | Scope | Tooling | Priority |
|---|---|---|---|
| Backend unit | Business rules in isolation: date validation, days-per-country calculation, KPI aggregation, approval-state transitions, delete-guard logic | xUnit + FluentAssertions, EF Core InMemory/SQLite for repository tests | Must |
| Backend integration | Full API request → EF Core → PostgreSQL round trip against a real Postgres (Testcontainers) | xUnit + Testcontainers.PostgreSql | Should |
| Frontend unit/component | Form validation, calendar drill-down state machine, meeting builder interactions | Vitest + React Testing Library | Could |
| End-to-end | Critical user journeys through the running Docker stack | Playwright | Could (bonus, FR-28) |
| Manual / exploratory | Everything above plus visual/UX review, print output, cross-browser check | Structured checklist (this document, §4) run before each milestone and before the live demo | Must |

**Rationale:** given the timeline (§Timeline in the BRD), automated coverage is
prioritized where a bug would be *hard to catch by eye* and *expensive if wrong* —
date/day-count math, approval workflow state, and delete-guard integrity — ahead of pure
UI polish, which is cheaper to verify manually and more likely to change late. Automated
tests and CI are explicitly bonus scope (PRD FR-28); the manual checklist is the
non-negotiable baseline that must pass regardless of how much automation lands.

## 2. Test Environment

- Automated backend/integration tests run against an ephemeral PostgreSQL instance
  (Testcontainers) — never against the seeded demo database.
- Manual QA runs against `docker compose up` on the seeded demo dataset (reused/derived
  from the prototype's fictional data, per BRD §6 assumptions), using the seeded accounts
  documented in `README.md`.
- Each manual test case below is tagged with the persona (PRD §1) that should perform it
  and the FR/US it verifies.

## 3. Key Test Cases

### 3.1 Authentication & Access (US-1.x, FR-1–FR-3)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-1 | Valid sign-in | Submit seeded Coordinator credentials | Redirected to Overview; session cookie set |
| TC-2 | Invalid sign-in | Submit wrong password | Inline error; no session issued |
| TC-3 | Unauthenticated access | Hit any app route or API endpoint without a session | Redirect to sign-in (UI) / 401 (API) |
| TC-4 | Session expiry | Wait past cookie expiry, attempt a mutation | 401, prompted to re-authenticate |
| TC-5 *(bonus RBAC)* | Team Member attempts a Coordinator-only action | Call `POST /team-plan/{id}/decision` as a Team Member | 403 |

### 3.2 Overview / KPIs (US-2.1, FR-4)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-6 | KPI accuracy | Seed known trip/meeting data; load Overview | Upcoming trips, next departure, total travel days, meetings planned match hand-computed values |
| TC-7 | KPI live update | Create a new trip, return to Overview | Counts reflect the new trip without a hard refresh (within polling window) |

### 3.3 Team Calendar (US-3.x, FR-5–FR-8)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-8 | Color coding | View calendar with a Trip, Option, Vacation, and Remote entry present | Each renders with its distinct color/pattern |
| TC-9 | Today marker | Load calendar where today falls within the visible range | Marker renders at the correct relative position |
| TC-10 | Drill-down | Click a quarter, then a month, then a week | Each level renders correctly-scoped data; breadcrumb allows navigating back up |
| TC-11 | Person filter | Select one name, then add a second | Only selected people's rows render; "All" resets |
| TC-12 | Segment click-through | Click a calendar bar | Opens that trip's segment one-pager (US-9.1) |
| TC-13 | Out-of-range entries | Entry dates fall outside the visible window | Entry is not drawn as a bar but is surfaced (e.g. a "TBC" chip) and still counted in day totals |

### 3.4 Trip Planner (US-4.x, FR-9–FR-12)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-14 | Create trip — happy path | Fill destination, dates, project, entity, status, hotel, transport; submit | Trip persists; appears in trip list and calendar |
| TC-15 | Date validation | Set "to" earlier than "from" | Blocked client-side and server-side with a clear error |
| TC-16 | Destination required | Submit with no destination | Blocked with inline error |
| TC-17 | Meeting picker scoping | Select a destination city | Only that city's contacts are offered |
| TC-18 | Add meeting fields | Add a meeting; set order, priority, status, time, attendees, agenda, materials+owner | All fields persist and display correctly on the trip card and one-pager |
| TC-19 | Trip search/filter | Filter by free text, then by person, then by project | Result set matches expectation in each case |
| TC-20 | Upcoming/past grouping | View trip list with trips on both sides of today | Correct grouping and count |

### 3.5 Bulk Entry (US-5.x, FR-13–FR-14)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-21 | Multi-row trip add | Add 3 rows, leave one destination blank, commit | 2 trips created; the blank row is rejected/skipped with feedback |
| TC-22 | Bulk plan entry | Select 3 people, fill one entry, submit | Same entry (dates/place/type/notes) appears for all 3 people independently |

### 3.6 Flights (US-6.x, FR-15–FR-17)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-23 | Flight CRUD | Add, edit, delete a flight row | Changes persist |
| TC-24 | Attach to trip | Attach a flight to a trip | Trip and its one-pager show the flight |
| TC-25 | External search link | Open the Google Flights deep link from a trip | New tab opens with origin/destination/date prefilled in the query |

### 3.7 Team Plan & Vacation Approval (US-7.x, FR-18–FR-19)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-26 | Own entry CRUD | Team member adds/edits/deletes their own plan entry | Reflected on shared calendar |
| TC-27 | Vacation request lifecycle | Team member submits vacation → CEO approves | State moves Pending → Approved; calendar and one-pager reflect it |
| TC-28 | Vacation rejection | CEO rejects a pending vacation request | State moves to Rejected; visibly distinct from Approved |

### 3.8 Directory (US-8.x, FR-20)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-29 | Add city/contact | Add a new city, then a contact within it | Both appear in the directory and the meeting picker |
| TC-30 | Delete-guard | Attempt to delete a contact/city referenced by an existing meeting | Blocked with a clear message (PRD deviation, TRD §3.2) |
| TC-31 | Unreferenced delete | Delete a contact/city with no meetings referencing it | Succeeds |

### 3.9 One-Pagers (US-9.1, FR-21–FR-22)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-32 | Person one-pager content | Open a person with multiple trips | Itinerary table, days-per-country totals, meetings/agenda, and materials all present and correct |
| TC-33 | Segment one-pager content | Open a single trip's one-pager from the calendar | Scoped correctly to that trip only |
| TC-34 | Print output | Print-preview a one-pager | Clean, paginated output with no app chrome (nav/buttons) |

### 3.10 Data & Multi-User Consistency (US-10.x, FR-23–FR-25)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-35 | Two-session convergence | Open the app in two browser sessions; create a trip in one | Second session reflects the change within the documented polling window without manual refresh |
| TC-36 | Concurrent edit | Edit the same trip from two sessions in quick succession | No silent data loss; last-write-wins is acceptable but must not corrupt unrelated fields (partial-update semantics, not full-object overwrite) |
| TC-37 | Export/import round-trip | Export JSON, wipe/reseed, import it back | Data matches pre-export state |
| TC-38 | Server-side survives restart | Restart the `db` container (data volume intact) | All data persists — proves PostgreSQL, not browser storage, is authoritative |

### 3.11 Bonus Features (US-11.x, FR-26–FR-30, if implemented)

| ID | Case | Steps | Expected |
|---|---|---|---|
| TC-39 | Vacation decision email | CEO approves a vacation request | Notification email appears in Mailpit |
| TC-40 | One-pager email | Team member emails their one-pager | Email with brief appears in Mailpit |
| TC-41 | Real-time push | Two sessions open; one mutates data | Other session updates without waiting for the polling interval |
| TC-42 | Audit trail | Edit a trip's status twice | Both changes appear in the audit history with actor and timestamp |

## 4. Pre-Demo Regression Checklist

Run manually, end to end, immediately before the live presentation:

- [ ] `docker compose down -v && docker compose up` from a clean clone succeeds with no
      manual steps.
- [ ] Sign in with each seeded account listed in `README.md`.
- [ ] Walk every nav tab once: Overview → Calendar (drill to week and back) → Planner
      (create one trip with a meeting) → Flights → Team Plan (one vacation
      request + decision) → Directory.
- [ ] Print one person one-pager and one segment one-pager to PDF.
- [ ] Open the app in a second browser profile and confirm the trip created above is
      visible there too.
- [ ] Export JSON, confirm it downloads and is well-formed.

## 5. Evidence of Execution

*To be populated incrementally as each module is built and tested — this section is a
living record, not a one-time report. Each row will link to the commit that introduced
the corresponding tests and note the passing state at that point in history.*

| Date | Area | Automated coverage | Manual pass? | Notes |
|---|---|---|---|---|
| 2026-07-23 | Backend build | `dotnet build` — 0 errors, 0 warnings | — | Full entity model, all controllers (auth, directory, trips/meetings/materials, flights, team-plan/approval, KPIs/calendar, one-pagers, export/import), seed data, and initial EF Core migration all compile cleanly. |
| 2026-07-23 | Frontend build | `tsc --noEmit` clean; `next build` succeeds (all routes prerender/compile) | — | Full route set (login, overview, calendar, planner + trip detail, flights, team-plan, directory, one-pager person/trip) builds with no type or build errors. |
| 2026-07-23 | Dockerization | `docker compose up --build` run end-to-end | **Pass** | `db` healthy, `migrate` exited 0 (migrations + seed applied), `api`/`web` both up. Verified via direct requests to the running stack: `GET /health` OK; login with the seeded Coordinator account issues a valid session cookie; authenticated `GET /api/overview/kpis`, `/api/people`, `/api/trips` return correct data matching the seed; unauthenticated `/overview` correctly 307-redirects to `/login`. Two host-machine issues (not project bugs) had to be resolved first: Docker Desktop wasn't installed, and the first build attempt hit a disk-full `read-only file system` error on the containerd store (C: had ~18MB free) — resolved by freeing space and `docker builder prune`. One real project bug was caught and fixed by static review before this run: the `migrate` service's `command:` was being appended to the Dockerfile's `ENTRYPOINT`, double-invoking the app. |
| 2026-07-23 | Backend unit tests (bonus, FR-28) | `Api.Tests` (xUnit): `DateMathTests` (5 cases — null/single-day/inclusive-range/reversed-dates/cross-month) + `PlanAggregationServiceTests` (2 cases — multi-entry day summing, ignoring dateless/cityless entries) | — | `dotnet test` → 7/7 passing. Covers the date-math and day-aggregation logic identified in §1 as highest-value to automate; integration/e2e tests and CI are not yet built. |
| _pending_ | Functional test cases (TC-1…TC-42), through the browser UI | — | — | API/routing layer is verified via direct HTTP requests (see Dockerization row above), but no one has clicked through the actual UI yet — calendar drill-down, meeting builder, one-pager printing, vacation approval, etc. all still need a human pass through §4's checklist. |

---

**Immediate next step for whoever picks this up:** `docker compose up --build` is
confirmed working — open http://localhost:3000, sign in with a seeded account, and work
through the §4 regression checklist by hand (calendar drill-down, meeting builder,
one-pager print output, vacation approval, etc.), recording results above.
