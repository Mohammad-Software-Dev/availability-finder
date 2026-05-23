# Availability Finder

Availability Finder is a full-stack TypeScript scheduling application for identifying shared meeting availability across messy participant calendars. It combines an interval-based backend scheduling engine with a date-aware React workspace that helps users both compute valid meeting times and understand why those times exist.

The current product is intentionally narrow in scope, but it is structured like a real scheduling system rather than a single algorithm demo. A user can choose a planning date, select attendees, configure meeting duration and step size, review matching slots, inspect warnings caused by invalid or unusable calendar data, and open a custom SVG-based timeline that explains the result visually.

Created by **Mohammad Ahmad**, FullStack Software Engineer.

## Overview

- Full stack: Express backend + React frontend
- Language: TypeScript across the stack
- Product goal: compute and explain shared meeting availability from imperfect calendar data
- Current scope: single-day, date-aware scheduling with in-memory seed data
- UX model: explicit submit flow with stale-result handling and a dedicated visual analysis surface

## Key Capabilities

- planning-date selection across multiple seeded dates
- participant selection with bulk actions
- interval-based availability computation
- invalid-event detection and warning surfacing
- shared working-window calculation
- generated meeting-slot output using duration and step controls
- custom SVG scheduling visualization
- date-aware results summary and chart navigation
- responsive behavior, including a mobile-safe chart fallback

## Product Experience

The application is organized as a scheduling workspace with three distinct responsibilities:

- **Meeting setup**
  The left-side top card contains the planning controls: date, duration, step, and participant selection.

- **Quick answer**
  The right-side top card presents the textual result for the current submitted request: planning date, common working window, slot list, and warnings.

- **Visual explanation**
  A full-width scheduling analysis panel appears once results exist. It renders a custom SVG timeline that explains attendee constraints, overlap, and generated slots.

This separation is deliberate. The top cards answer “what can I schedule?”, while the analysis panel answers “why are these the available options?”

## How to Run

Install dependencies:

```bash
npm run install:all
```

Start both apps:

```bash
npm run dev
```

Run the full verification suite:

```bash
npm run build
npm run lint
npm run test
npm run typecheck
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Tech Stack

### Backend

- `Express 5` for HTTP routing
- `Zod` for schema validation
- `Vitest` for unit and integration tests

### Frontend

- `React 19`
- `Vite`
- `Tailwind CSS 4`
- `shadcn/ui`-style primitives plus Radix-based UI patterns
- `Vitest` and `Testing Library` for component and workflow tests
- `lucide-react` for UI icons

## Scheduling Model

The backend models scheduling as an interval problem.

Each participant contributes:

- a working-hours window
- a set of calendar events for the selected planning date

The scheduling pipeline is:

1. Validate the request payload
2. Validate the selected planning date
3. Load the selected participants for that date
4. Normalize each participant’s schedule
5. Reject invalid events with warnings
6. Clip valid events to working hours
7. Merge overlapping or touching busy intervals
8. Intersect participant working windows into a shared working window
9. Subtract merged busy time from that shared window
10. Generate meeting slots using the requested duration and step

At a high level:

```text
free time = common working window - merged busy intervals
```

If each participant working window is `W_i`, then the shared working range is:

```text
W = intersection(W_1, W_2, ... W_n)
```

In practice, complexity is dominated by sorting and merging intervals:

```text
O(N log N + S)
```

Where:

- `N` = total number of events considered for the selected day
- `S` = number of generated candidate slots

## Product and UX Decisions

### Explicit submit instead of live recomputation

The app intentionally uses a `Find Slots` button instead of recalculating on every interaction. This keeps the request lifecycle predictable and preserves a clear boundary between:

- current form state
- last submitted request
- last returned result

That distinction becomes especially important once planning dates, warnings, visualization state, and stale results are all present in the same workflow.

### Stale-result handling

After a successful search, changing participants, date, duration, or step marks the current result as stale. The previous response remains visible until the user submits again, but the UI clearly communicates that the result no longer reflects the live input state.

This is a trust decision as much as a technical one: the system should not quietly pretend an old result still belongs to a new configuration.

### Results-first visualization

The scheduling analysis panel is intentionally tied to submitted backend results rather than live client-side inference. The frontend does not render speculative chart output just because participants are selected.

Instead:

- the analysis panel appears only after a successful availability response exists
- the chart uses the last submitted participant snapshot plus the backend response
- the results card includes a `View Scheduling Analysis` action to navigate to the visual explanation intentionally

This keeps the backend as the source of truth for the scheduling answer and avoids blurring the line between configuration state and computed state.

## API

The backend exposes three endpoints:

- `GET /api/people/dates`
- `GET /api/people?date=YYYY-MM-DD`
- `POST /api/availability`

### `GET /api/people/dates`

Returns the available seeded planning dates.

Example:

```json
{
  "dates": ["2026-05-18", "2026-05-19", "2026-05-20"]
}
```

### `GET /api/people?date=YYYY-MM-DD`

Returns participants for the selected date with:

- identity
- working hours
- event data prepared for UI display
- validity metadata for each event

Example:

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

### `POST /api/availability`

Accepts:

```json
{
  "date": "2026-05-18",
  "personIds": ["alice", "bob"],
  "durationMinutes": 60,
  "stepMinutes": 15
}
```

Returns:

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

## Frontend Behavior

The frontend is intentionally explicit and stateful rather than aggressively automatic.

Current behavior includes:

- participant event chips update immediately when the planning date changes
- results do not recompute automatically when form inputs change
- stale state is tracked once a successful result exists
- clearing results resets the summary card and hides the analysis panel
- the visualization is opened via a dedicated CTA from the summary card
- mobile users can horizontally scroll the chart when the timeline cannot be compressed further without losing readability

## Visualization System

The visualization layer lives under `frontend/src/features/schedule-visualization` and is built with custom SVG rendering rather than a third-party calendar or charting library.

Core components include:

- `ScheduleVisualization`
- `TimelineSvg`
- `TimelineAxis`
- `TimelineGrid`
- `TimelineDensityBand`
- `TimelineRow`
- `TimelineTooltip`
- model and coordinate utilities

The chart currently exposes:

- participant working-hours ranges
- busy intervals
- a shared working-window overlay
- generated available slots
- an availability-overlap density band

The visualization is intentionally driven through a dedicated frontend model adapter rather than rendering directly from raw API shapes. This keeps the chart deterministic, composable, and easier to evolve.

### Mobile strategy

The scheduling chart is denser than the rest of the UI and does not compress cleanly to narrow widths. Instead of shrinking it until it becomes unreadable, the mobile behavior is:

- keep the surrounding cards responsive
- preserve readable chart dimensions
- enable horizontal scrolling when the chart width exceeds the viewport
- show a lightweight cue that the timeline can be explored horizontally

This is a deliberate tradeoff in favor of preserving the integrity of a dense analytical visualization.

## Accessibility

Accessibility is treated as part of the implementation, not as a later patch.

The app currently includes:

- semantic section headings across the main workspace
- explicit labels and helper text for form controls
- screen-reader summary text for the visualization
- accessible legends and readable chart labels
- keyboard-usable controls across the form and results surfaces
- multiple visual signals rather than relying on color alone

This is not a full accessibility audit, but the design and implementation were shaped with accessibility in mind.

## Architecture

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
    utils/        time helpers, interval helpers, planning-date and schedule normalization utilities
```

Key backend responsibilities:

- request validation
- date validation
- person and event loading
- event normalization
- warning generation
- shared availability calculation

### Frontend structure

```text
frontend/src/
  components/    form, results, participant rows, event chips, field help
  features/
    schedule-visualization/
                  SVG timeline system, model adapter, tests
  hooks/         planner-state orchestration
  lib/           formatting helpers
  services/      API client functions
  test/          test setup
  types/         shared frontend API/data types
```

Key frontend responsibilities:

- planning UI and validation
- participant selection workflow
- stale-result lifecycle
- API orchestration
- visualization rendering
- responsive layout behavior

### Internal design choices

- Business logic stays out of Express controllers so the scheduling engine can be tested directly.
- API orchestration is kept out of `App.tsx` through a dedicated `useAvailabilityPlanner` hook.
- Shared backend utilities centralize planning-date validation and person-schedule normalization to avoid duplication across features.
- The visualization layer uses a view-model adapter to keep rendering concerns separate from transport and backend types.

## Testing

The project includes automated verification on both sides of the stack.

Backend coverage includes:

- scheduling logic
- date-scoped filtering
- event normalization
- warning generation
- controller and error behavior

Frontend coverage includes:

- form validation
- date selection behavior
- results states
- stale-result handling
- visualization rendering behavior
- request lifecycle handling

Visualization utility coverage includes:

- time parsing
- domain normalization
- interval modeling
- density generation
- accessibility-oriented helper behavior

Testing is implemented with `Vitest`, and frontend UI tests use Testing Library.

## Covered Scenarios

- finding shared meeting slots across multiple selected participants
- filtering participants and event data by a selected planning date
- returning no slots when the requested duration does not fit
- ignoring invalid event data without failing the entire request
- ignoring events that fall outside a participant’s working hours
- rejecting requests that include unknown participant IDs
- rejecting malformed or unsupported planning dates
- surfacing participant-specific warnings when event data is skipped
- marking previous results as stale after user input changes
- preserving the distinction between current inputs and last submitted results
- rendering a mobile-safe visualization for a dense schedule timeline

## Assumptions and Scope Limits

- one selected day at a time
- in-memory seed data only
- no recurring events
- all participants are treated as being in the same timezone
- no persisted user data
- explicit submit instead of live recalculation
- all selected attendees are required attendees

## Future Improvements

- slot ranking and recommendation instead of a flat slot list
- required vs optional attendees
- participant-specific timezone support
- recurring event support
- persistent database-backed data
- richer structured warning models instead of plain strings
- GraphQL as a query layer if the data surface grows significantly
- SSO or organization-aware access if the product becomes multi-tenant
- richer scheduling analytics such as recommendation scoring or overlap quality signals

## Repository

- GitHub: `https://github.com/Mohammad-Software-Dev/Availability-Finder`
- License: `MIT`
