# Availability Finder

Availability Finder is a small full-stack TypeScript application for finding shared meeting slots across messy participant calendars. It lets a user inspect participant events, choose a planning date and meeting settings, compute overlapping availability, and visually analyze why slots do or do not exist.

Created by **Mohammad Ahmad**, FullStack Software Engineer.

## Overview

- Full stack: Express backend + React frontend
- Purpose: compute shared meeting availability from messy calendar data
- Current scope: date-aware scheduling with in-memory seed data
- Product framing: a lightweight scheduling and availability analysis system

## How to Run

Install dependencies:

```bash
npm run install:all
```

Start both apps:

```bash
npm run dev
```

Run checks:

```bash
npm run build
npm run lint
npm run test
npm run typecheck
```

Automated testing is included for both backend logic and frontend component behavior.

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## What Changed Since `docs: finalize README and project presentation`

The project has grown in two major directions since the last README-focused submission:

### 1. Custom scheduling visualization system

A dedicated frontend visualization layer was added using custom SVG rendering instead of a calendar or charting library.

It now includes:

- a full-width scheduling analysis panel below the form/results layout
- a horizontal time-based timeline
- per-participant rows
- working-hours visualization
- busy-interval rendering
- shared working-window overlays
- generated meeting-slot overlays
- availability density / overlap band
- responsive axis behavior
- keyboard-focusable intervals and slots
- accessible tooltip and screen-reader summaries

This moved the project from a simple “meeting slot calculator” toward a more frontend-heavy scheduling analysis tool.

### 2. Date-aware planning

The original one-day-only scheduling scope was evolved into date-aware planning while still keeping the application intentionally small and in-memory.

New additions include:

- multiple seeded planning dates
- explicit planning-date selection in the frontend
- date-scoped participant/event loading
- date-scoped availability computation
- stale-result handling when the selected date changes
- date-aware results summaries and empty states

The app still operates on one selected day at a time, but it now feels more like a real scheduling product instead of a fixed single-day demo.

## Scheduling Algorithm

The backend models scheduling as an interval problem.

Each participant contributes:

- a working window
- a set of busy intervals derived from their events for the selected date

The algorithm pipeline is:

1. Validate the request payload
2. Resolve the selected planning date
3. Normalize each participant's availability
4. Reject invalid events with warnings
5. Clip valid events to working hours
6. Merge overlapping or touching busy intervals
7. Intersect participant working windows into one shared working window
8. Subtract merged busy time from that shared window
9. Generate meeting slots using the requested duration and step

At a high level:

```text
free time = common working window - merged busy intervals
```

If each participant working window is `W_i`, then the shared working range is:

```text
W = intersection(W_1, W_2, ... W_n)
```

Complexity is dominated by sorting and merging intervals, so in practice the current implementation behaves like:

```text
O(N log N + S)
```

Where:

- `N` = total number of calendar events considered for the selected date
- `S` = number of generated candidate slots

The backend scheduling flow is designed so availability can be recalculated deterministically as participants, dates, or meeting settings change. In this project, that recalculation is still intentionally controlled by an explicit submit flow rather than happening on every interaction. The frontend therefore uses `Find Slots` instead of live recalculation.

## Approach and Design Thinking

I approached this as an end-to-end scheduling problem rather than as a UI-only exercise.

At its core, the project is an interval-based scheduling system: each participant contributes constraints through working hours and calendar events, and the goal is to derive valid meeting slots by combining those constraints in a predictable way.

The implementation follows a transformation pipeline:

- normalize inputs
- merge overlapping busy intervals
- intersect working hours across participants
- subtract busy time from the shared window
- generate candidate meeting slots

This separation keeps the backend logic deterministic, testable, and easier to extend.

From a product perspective, I treated the API as the source of truth and kept the frontend focused on state, UX clarity, and rendering. The goal was not only to compute availability, but also to make the constraints, data-quality issues, and resulting slots understandable to the user.

The later additions to the project followed that same idea:

- date-aware planning made the product more realistic
- the SVG timeline made scheduling logic visually inspectable
- stale-result handling kept request/response trust explicit

Overall, the design prioritizes correctness first, then clarity, then extensibility.

## Backend and Frontend

### Backend

The backend now exposes three endpoints:

- `GET /api/people/dates`
- `GET /api/people?date=YYYY-MM-DD`
- `POST /api/availability`

`GET /api/people/dates` returns the available seeded planning dates:

```json
{
  "dates": ["2026-05-18", "2026-05-19", "2026-05-20"]
}
```

`GET /api/people?date=YYYY-MM-DD` returns participants with:

- identity
- working hours
- display-ready event data for the selected date
- event validity metadata for UI presentation

Example response:

```json
[
  {
    "id": "alice",
    "name": "Alice Johnson",
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "events": [
      {
        "id": "a1",
        "title": "Standup",
        "start": "10:00",
        "end": "10:30",
        "isValid": true,
        "invalidReason": null
      }
    ]
  }
]
```

`POST /api/availability` accepts:

```json
{
  "date": "2026-05-18",
  "personIds": ["alice", "bob"],
  "durationMinutes": 60,
  "stepMinutes": 15
}
```

And returns:

```json
{
  "durationMinutes": 60,
  "stepMinutes": 15,
  "attendees": ["alice", "bob"],
  "commonWorkingWindow": {
    "start": "10:00",
    "end": "17:00"
  },
  "slots": [
    { "start": "13:00", "end": "14:00" }
  ],
  "warnings": [
    "Bob Smith: skipped invalid event (missing/invalid time)"
  ]
}
```

Backend responsibilities include:

- validating request shape
- validating the selected planning date
- parsing and validating time strings
- classifying invalid events
- clipping and merging busy intervals
- computing shared availability for one selected day
- returning warnings without breaking the full scheduling flow

### Frontend

The frontend is still intentionally explicit, but it is now more product-like and more visualization-led.

It provides:

- planning-date selection
- participant selection with `Select all` / `Clear all`
- visible event chips next to each participant
- meeting duration and step inputs
- explicit submit through `Find Slots`
- textual results, warnings, and stale-result handling
- a full-width SVG-based scheduling analysis panel

Current frontend behavior:

- participant event chips refresh immediately when the selected date changes
- computed results do not auto-refresh when participants, date, or meeting settings change
- after a successful search, changing inputs marks results as stale
- changing the planning date keeps previous results visible but clearly marks them as belonging to the previously submitted date
- `Clear results` resets the results panel

## Visualization System

One of the major additions after the README-focused submission was a dedicated visualization subsystem under `frontend/src/features/schedule-visualization`.

This layer is intentionally built with custom SVG rendering instead of FullCalendar or a heavy charting library.

It includes:

- `ScheduleVisualization` as the main orchestration component
- `TimelineSvg` for composition and layout
- `TimelineAxis` for the hourly timeline
- `TimelineGrid` for interval guides
- `TimelineDensityBand` for overlap density
- `TimelineRow` for per-participant schedule rendering
- `TimelineTooltip` for hover/focus explanations
- a visualization model adapter and interval/coordinate utilities

The timeline exposes:

- participant working-day context
- busy intervals for each selected person
- common/shared working window
- generated available meeting slots
- availability overlap density

The visualization is intentionally separated from raw backend data through a dedicated frontend model adapter. That keeps the SVG rendering logic reusable, deterministic, and easier to evolve.

## Accessibility

Accessibility became more important once the visualization layer was introduced.

The current app includes:

- focusable slot and interval targets in the timeline
- accessible labels such as “Alice Johnson busy from 10:00 to 10:30”
- screen-reader summary text for the visualization
- keyboard-usable form interactions
- tooltip behavior that aligns with the rest of the UI
- multiple visual cues for state instead of relying on a single signal

This is not a full accessibility audit, but it was implemented intentionally rather than left as a future concern.

## Covered Scenarios

- finds shared meeting slots across multiple selected participants
- filters people/event data by the selected planning date
- returns no slots when the requested duration does not fit inside the shared free time
- ignores invalid event data without failing the full availability request
- ignores events that fall outside a participant's working hours
- rejects availability requests that include unknown participant IDs
- rejects unsupported or malformed planning dates
- shows participant-specific warnings when event data is skipped
- marks previous results as stale after the user changes participants, planning date, or meeting settings
- supports bulk participant actions through `Select all` and `Clear all`
- visually explains overlap and suggested slots through the scheduling analysis panel

## Assumptions and Future Improvements

Current assumptions and scope limits:

- one selected day at a time
- in-memory seed data only
- no recurring events
- all participants are currently assumed to be in the same timezone
- no persisted user data
- explicit submit instead of live recalculation
- all selected attendees are required attendees

Future improvements and extensions:

- slot ranking and recommendation instead of a flat list only
- required vs optional attendees
- participant-specific timezone support
- recurring event support
- persistent database-backed data
- richer structured warnings instead of plain strings
- GraphQL as a query layer if the data surface grows significantly
- SSO / organization-aware access if the product becomes multi-tenant
- more advanced UI such as calendar comparisons, meeting templates, or saved searches

## Deeper Dive

### Backend structure

```text
backend/src/
  config/        runtime environment loading
  data/          in-memory seed data
  features/
    availability/ scheduling service, schema, controller, tests
    people/       participant/date service, controller, tests
  shared/
    errors/       app error model and centralized error handler
    types/        shared interval types
    utils/        time and interval helpers
```

Primary backend libraries:

- `express` for HTTP routing
- `zod` for request and environment validation
- `vitest` for unit tests

### Frontend structure

```text
frontend/src/
  components/    form, results, participant rows, event chips, field help
  features/
    schedule-visualization/
                  SVG timeline system, model adapter, tests
  lib/           formatting helpers
  services/      API client functions
  test/          test setup
  types/         shared frontend API/data types
```

Primary frontend libraries:

- `react` for UI rendering and state
- `vite` for development/build tooling
- `tailwindcss` for styling and responsive layout
- `shadcn` component patterns plus Radix-based primitives for reusable UI building blocks
- `@testing-library/react` and `vitest` for component tests
- `lucide-react` for lightweight icons

### Library usage in practice

- The backend keeps business logic separate from controllers so the scheduling algorithm can be tested directly.
- The frontend keeps API calls in a small service layer and treats the form/results/visualization components as view-layer orchestration.
- The visualization layer uses custom SVG primitives and a frontend view-model adapter instead of relying on a heavy chart or calendar library.
- Shared interval and time utilities keep the scheduling logic deterministic and easier to reason about.

### Testing

- Backend tests cover scheduling logic, date-scoped filtering, event normalization, warning generation, and controller/error behavior.
- Frontend tests cover form validation, date selection, results states, stale-result behavior, visualization behavior, and request lifecycle handling.
- Visualization utility tests cover time parsing, domain normalization, interval modeling, density generation, and accessible-label helpers.
- Testing is done with `Vitest`, and frontend UI tests use Testing Library.
