---
name: nextjs-frontend
description: Use when adding or changing anything under frontend/src — new pages, components, API calls, or UI for the MGH Travel Portal Next.js app.
---

# Next.js frontend conventions (frontend/src)

Next.js 16 (App Router, Turbopack by default), TypeScript, Tailwind CSS v4, TanStack
Query. **Next.js 16 has real breaking changes from what you may expect** — before
writing router/caching/params code, check `frontend/node_modules/next/dist/docs/`
(shipped with the installed version) or `frontend/AGENTS.md`, which points there. The
biggest gotchas already handled in this repo:

- `middleware.ts` is renamed to **`proxy.ts`**, exporting a `proxy()` function instead
  of `middleware()`. See `src/proxy.ts`.
- `params`/`searchParams` in Server Components are `Promise`s. This app sidesteps that
  entirely by keeping dynamic route pages as **client components using `useParams()`**
  (see `src/app/(app)/planner/[tripId]/page.tsx`) rather than accepting an async
  `params` prop — keep that pattern for new dynamic routes unless you have a specific
  reason to make a page a Server Component.
- Components calling `useSearchParams()` must be wrapped in `<Suspense>` (see
  `src/app/login/page.tsx`) or the build will warn/de-opt.

## Layout

- `src/app/(app)/` — every authenticated route (Overview, Calendar, Planner, Flights,
  Team Plan, Directory) lives under this route group, sharing `layout.tsx` (top nav +
  session check). Add new authenticated pages here, not at the `src/app/` root.
- `src/app/login/` — the one public route. `src/proxy.ts`'s `PUBLIC_PATHS` must list
  any other route that should bypass the session-cookie gate.
- `src/app/one-pager/` — deliberately outside `(app)`: no nav chrome, its own minimal
  `layout.tsx`, designed to be printed (`window.print()`), and opened via
  `target="_blank"` from the calendar/one-pager buttons.
- `src/lib/api.ts` — the only place that calls `fetch`. Always goes through `api.get /
  post / patch / put / delete`, always `credentials: "include"` (the session cookie),
  always throws `ApiError` on non-2xx so callers can catch a typed error. Don't call
  `fetch` directly from a component.
- `src/lib/types.ts` — hand-mirrors the backend's DTOs (see
  `backend/Api/Dtos/`). If you change a backend DTO shape, update this file to match —
  there's no shared codegen between the two, so keep them in sync manually.
- `src/lib/queries.ts` — shared TanStack Query hooks used across multiple pages
  (`useMe`, `usePeople`, `useCities`). Page-specific data fetching uses `useQuery`
  inline in the page component instead of growing this file unboundedly.
- `src/components/ui.tsx` — the only source of shared primitives (`Button`, `Card`,
  `Badge`, `Input`, `Select`, `Textarea`, `Label`, `PageHeader`, loading/error/empty
  states). Reuse these; don't hand-roll another button/card style elsewhere.
- `src/lib/calendar-utils.ts` — all calendar date-window/drill-down math. The visible
  range is a **rolling 6-month window from today**, not a hardcoded year — see
  `sixMonthWindow()`. Don't reintroduce a hardcoded `2026`/`Jun–Dec` anywhere.

## Data fetching / polling

TanStack Query's `QueryClient` (see `src/app/providers.tsx`) defaults every query to
`refetchInterval: 5000` — this **is** the multi-user consistency mechanism described in
`docs/TRD.md` §7 (polling baseline). Don't disable it per-query unless there's a good
reason (e.g. `useMe()` sets `refetchInterval: false` since a session doesn't need
5-second polling).

## Shared destination autocomplete

`(app)/layout.tsx` renders a single `<datalist id="cityList">` fed by `useCities()`.
Any `<input>` anywhere in the authenticated app that accepts a city/destination should
use `list="cityList"` rather than fetching/rendering its own datalist.

## Styling

Tailwind utility classes only — no CSS modules, no styled-components. Color/tone
mapping for badges (trip status, meeting priority, approval state, etc.) lives in the
`BADGE_COLORS` map in `src/components/ui.tsx`; add new statuses there rather than
inlining a new color combination at the call site.

## Before calling frontend work done

```bash
cd frontend
npx tsc --noEmit   # must be clean
npm run build      # must succeed (also proves the standalone Docker output works)
```
