# Calendar — Requirements

Working functional spec. Architecture conventions live in [../CLAUDE.md](../CLAUDE.md).

## Views

Three top-level views: **month**, **week**, **day**.

- **Month** — standard month grid.
- Week view supports a configurable first day of week and an option to hide
  weekends (5-day work week).
- **Week** and **Day** each support two layouts, toggleable by the user:
  - **Condensed** — for each day, the events listed in chronological order
    (compact list, no time grid).
  - **Scheduler** — an hour-by-hour time grid where events are positioned and
    sized to span the time range they cover (overlapping events handled).

## Events

- **All-day events** — no specific time; shown in an all-day region (e.g. a band
  above the time grid in scheduler, and grouped in condensed/month).
- **Timed events** — specific start and stop time; rendered in the scheduler grid
  spanning their duration, and with times shown in condensed/month.
- Multi-day events (all-day or timed) are supported and span the days they cover.

## Event display configuration

- The host can configure which fields appear on an event (beyond the base
  title/time) — e.g. an ordered list of fields to render on the event chip/detail.
- Config is passed in via `@api` / design attributes and expressed against the
  generic event shape (keys into the event's `meta` bag), keeping the calendar
  SObject-agnostic.
- Per-field display options to consider: label visibility, which views/layouts
  show the field (month vs. condensed vs. scheduler), and truncation behavior.

## Event color coding

- Color coding is **calendar-wide** configuration, not set per event. The host
  defines an ordered rule set once; each rule tests an attribute present on every
  event (a key in the `meta` bag) and colors every event that matches — e.g.
  "all events with `status` = Scheduled appear blue".
- Config is passed in via `@api` / design attributes and expressed against the
  generic event shape, keeping the calendar SObject-agnostic.
- Rules are evaluated per event at render time: first match wins, then the
  per-calendar color, then a default/fallback color.
- Colors resolve to something the CSS layer can apply (SLDS-friendly tokens or
  explicit values); a legend for the active color rules is a nice-to-have.

## Event interactions

- Single click on an event emits an `eventclick` intent and nothing else — the
  host owns any detail popover / side panel.
- Double click on an event: if the generic event carries an optional `recordId`,
  the calendar navigates to that record (via `NavigationMixin`, no object API
  name needed — stays SObject-agnostic). It also emits an `eventopen` intent so a
  host can override or handle events with no `recordId`.

## Multiple calendars

- Events can belong to one of several named calendars (a grouping key on the
  generic event shape). The host supplies the list of calendars (id, label,
  optionally a default color).
- The UI shows the calendar list with per-calendar show/hide toggles; hidden
  calendars' events are removed from all views.
- Visibility state is UI state; the calendar emits a `calendarvisibilitychange`
  intent so the host can persist it and/or narrow what it fetches.
- Interaction with color coding: per-calendar color is the default; explicit
  color-coding rules (above) override it when they match.

## Non-functional requirements

### SObject-agnostic

The calendar components know nothing about specific SObjects (no `Event`,
`Contact`, custom objects, field API names, etc. baked in).

- Components work against a generic event/item shape (e.g. `id`, `title`,
  `startDateTime`, `endDateTime`, `allDay`, plus an opaque `meta` bag) — not
  SObject records.
- Adapting the calendar to a specific object is done at the edges: an Apex
  selector/service or an LWC adapter maps that object's records to the generic
  shape and maps calendar events (create/move/resize/click) back to it.
- Object-specific config (which object, field mappings, filters) is passed in
  via `@api` properties or design attributes, never hard-coded in the calendar.
- The calendar emits intent (`eventclick`, `eventcreate`, `eventmove`,
  `rangechange`) and lets the host decide what it means.

## Deferred (revisit later)

- Event creation ("New" button, click/drag empty slot) and per-calendar
  associated-SObject record creation.
- Event editing (drag to move, resize, inline edit).

## Open questions

- Time range / working hours shown in scheduler layout (config exists:
  `schedulerStartHour` / `schedulerEndHour`, default 0–24).
- Timezone handling (currently browser-local).

## Resolved

- **Drill between views**: clicking a day number or the "+N more" overflow in the
  month grid switches to the day view for that date.
- **Multi-day events in the month grid**: rendered as spanning bars (all-day and
  multi-day events lane-packed per week), not a chip per covered day. Single-day
  timed events stay as chips in the cell.
