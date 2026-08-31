# Calendar components

Small, single-purpose LWCs (all prefixed `cal`). `calCalendar` is the only public
entry point; everything else is internal and presentational. See
[../CLAUDE.md](../CLAUDE.md) for the architecture rules and
[requirements.md](requirements.md) for the functional spec.

## Public component: `c-cal-calendar`

Presentational and SObject-agnostic. The host supplies data and reacts to intent
events; the calendar owns only view / date / layout / calendar-visibility state.

### Attributes

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `events` | Array | – | Generic event shape (below). |
| `calendars` | Array | `[]` | `{ id, label, color, visible }`. Drives the sidebar + per-calendar color. |
| `view` | string | `month` | `month` \| `week` \| `day`. |
| `date` | Date/ISO | today | Focused date. |
| `layout` | string | `scheduler` | `scheduler` \| `condensed` (week/day only). |
| `first-day-of-week` | number | `0` | 0 = Sunday. |
| `hide-weekends` | boolean | `false` | 5-day work week. |
| `field-config` | Array | – | Ordered fields to show on events (below). |
| `color-rules` | Object | – | Calendar-wide color coding (below). |
| `scheduler-start-hour` / `scheduler-end-hour` | number | `0` / `24` | Visible hour window. |
| `max-events-per-day` | number | `3` | Hard cap on month-cell chips; the cell also shows fewer if they don't fit, with a "+N more" that opens a hover popover of the full day. |
| `locale` | string | browser | Passed to `Intl`. |

### Events (all `CustomEvent`, `detail` in parentheses)

| Event | When | Detail |
| --- | --- | --- |
| `rangechange` | visible range changes | `{ view, start, end }` (ISO) — host refetches |
| `viewchange` | user switches view | `{ view }` |
| `navigate` | user moves the focused date | `{ date }` (ISO) |
| `layoutchange` | condensed ↔ scheduler | `{ layout }` |
| `eventclick` | single click on an event | `{ event }` (host's original object) |
| `eventopen` | double click on an event | `{ event }`; also navigates to `event.recordId` if present |
| `calendarvisibilitychange` | show/hide a calendar | `{ calendarId, visible, visibleCalendarIds }` |

### Imperative API

`next()`, `previous()`, `today()`, `goToDate(value)`.

## Generic event shape

```
{ id, calendarId, title, start, end, allDay, recordId?, meta? }
```

`start` / `end` are ISO strings. `meta` is an opaque bag — `field-config` and
`color-rules` read keys from it (or from top-level fields). The calendar never
inspects SObject records; a host adapter maps records to this shape.

## `field-config`

```
[{ key, label?, showLabel?, views?: ['month'|'condensed'|'scheduler'], truncate?: number }]
```

## `color-rules` (calendar-wide)

```
{ rules: [{ key, operator?, value?, color, label? }], defaultColor? }
```

Operators: `equals` (default), `notEquals`, `contains`, `startsWith`, `in`,
`greaterThan`, `lessThan`, `isSet`, `isBlank`. Resolution order per event: first
matching rule → per-calendar `color` → `defaultColor` → built-in default.

## Internal components

| Component | Responsibility |
| --- | --- |
| `calToolbar` | today / prev / next, view switcher, layout toggle, range title |
| `calSourceList` | calendar list with show/hide checkboxes |
| `calMonthView` | month grid: weekday header + rows of cells; lane-packs all-day/multi-day events per week (`packLanes`) into spanning bars overlaid on each row |
| `calMonthCell` | one day cell: date number, spanning-bar lane spacer, single-day timed events as chips, always-visible "+N more" |
| `calDayEventsPopover` | floating panel listing a day's full event list; opened by hovering/focusing "+N more" |
| `calEventPopover` | read-only hover card for one event: title, when, calendar, and every configured field; `calCalendar` owns the hover state and positions it |
| `calEventChip` | compact event pill (month + condensed + all-day bars) |
| `calWeekView` | resolves the week's 7 (or 5) days and picks a layout |
| `calDayView` | same for a single day |
| `calAgenda` | condensed layout: a scrollable chronological list for the range, grouped by day; drops empty days |
| `calAgendaDay` | one day in the agenda: sticky date heading + the day's rows |
| `calAgendaItem` | one agenda row: a time label (or "All day") beside a `calEventChip` |
| `calScheduler` | scheduler layout: day-header row, all-day band, scrollable time grid; owns the hour geometry (`--cal-hour-height`) and auto-scrolls to 8am |
| `calTimeAxis` | the left-hand hour ruler |
| `calSchedulerColumn` | one day's column; runs `packColumns` and positions each event box from its time + overlap slot |
| `calSchedulerEvent` | one positioned timed-event block; renders configured `field-config` fields when the block is tall enough |
| `calAllDayRow` | the all-day / multi-day band; lane-packs bars with `packLanes` |
| `calCore` | pure logic module (date math, layout packing, color/field resolution, event model) |

Every event renderer (`calEventChip`, `calSchedulerEvent`) emits bubbling,
composed `eventselect` / `eventopen` (click / double-click) and
`eventhover` / `eventhoverend` (pointer or keyboard focus enter / leave, with the
element's viewport rect). `calCalendar` handles them centrally — clicks become
the public `eventclick` / `eventopen`; hover drives the `calEventPopover`.

A color-rules legend is still planned; see the plan file.

## Demo

`c-cal-demo` — the **Calendar Demo** app page / tab (`/lightning/n/Calendar_Demo`).
Four calendars (Team, Personal, On-call, Assessments), all-day + multi-day events,
a deliberately busy day for the "+N more" overflow, and color rules: `status`
Cancelled/Tentative for the work calendars, plus `assessmentStatus`
Scheduled/Complete/Canceled/No Show for the Assessments calendar.
