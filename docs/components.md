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
| `hide-legend` | boolean | `false` | Suppress the color-rules legend in the sidebar. |
| `show-legend-counts` | boolean | `false` | Show each legend row's match count for the visible range. |
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

### Slots

| Slot | Position | Notes |
| --- | --- | --- |
| `toolbar-end` | End (right) of the header row, after the toolbar's view switcher | For a host-owned control such as a settings trigger. Empty by default — renders nothing and adds no spacing. |

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

Rules with a `label` drive the sidebar legend (`calLegend`): it lists every rule
that colored at least one event in the visible range, so it follows navigation
and calendar-visibility toggles. `hide-legend` turns it off; `show-legend-counts`
adds the per-rule match count.

## Internal components

| Component | Responsibility |
| --- | --- |
| `calToolbar` | today / prev / next, view switcher, layout toggle, range title |
| `calSourceList` | calendar list with show/hide checkboxes |
| `calLegend` | sidebar legend: one swatch + label (+ optional count) per active color rule |
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
| `calDrawer` | generic slide-out panel over a backdrop (`side` left/right, `size` small/medium/large); slots its body, emits `close` on backdrop / close button / Escape |

Every event renderer (`calEventChip`, `calSchedulerEvent`) emits bubbling,
composed `eventselect` / `eventopen` (click / double-click) and
`eventhover` / `eventhoverend` (pointer or keyboard focus enter / leave, with the
element's viewport rect). `calCalendar` handles them centrally — clicks become
the public `eventclick` / `eventopen`; hover drives the `calEventPopover`.

## SObject harness

The calendar itself takes host-supplied data. The **harness** is an optional
layer that sources that data from real records — see [harness.md](harness.md) for
the object model and Apex. Its LWCs:

| Component | Responsibility |
| --- | --- |
| `calWorkspace` | Public entry point for the harness (App / Home page). The only data-aware calendar component: loads calendar definitions + user preferences via Apex, refetches records on `rangechange`, merges N calendars into one `calCalendar` prop set, persists preferences. A settings control — projected into `calCalendar`'s `toolbar-end` slot when a calendar is shown, or rendered in the empty state — opens a `calDrawer` holding `calCalendarPicker` and `calDisplaySettings`. |
| `calCalendarPicker` | Grouped "My / Shared" checkbox list to choose which calendar definitions to display; emits `calendarselectionchange` / `primarychange`. |
| `calDisplaySettings` | The per-user display-chrome form in the workspace drawer: first day of week, hide weekends, scheduler hour window, max events per day, legend toggles, locale (the preferences the in-calendar toolbar does not own). Controlled — values in via `@api`, one `settingschange` (`{ <key>: <value> }`) out per change. |
| `calFieldMapping` | Admin helper on the `Cal_Calendar__c` record page: a read-only summary of `Field_Mappings__c`, with a pencil that opens a guided per-slot field picker. Not on the runtime data path. |
| `calFieldConfig` | Admin helper on the `Cal_Calendar__c` record page: a read-only summary of the extra event fields in `Field_Config__c`, with a pencil that opens an ordered add/remove/reorder editor. Not on the runtime data path. |
| `calColorRules` | Admin helper on the `Cal_Calendar__c` record page: a read-only summary of `Color_Rules__c` (the calendar-wide color rules + fallback color), with a pencil that opens an add/remove/reorder editor. Colors are picked by sight via `calColorPicker`. Not on the runtime data path. |
| `calFilterCriteria` | Admin helper on the `Cal_Calendar__c` record page: a read-only view of `Filter_Criteria__c` (the SOQL `WHERE` fragment), with a pencil that opens a textarea, the `$CURRENT_USER_ID` / `$RANGE_START` / `$RANGE_END` placeholder reference, a searchable Target Object field list, and a server-side syntax check. Not on the runtime data path. |
| `calColorPicker` | Presentational swatch picker: a labelled color chip that opens a panel of named colors plus a native picker. `value` in, `change` ({ value }) out. Used by `calColorRules`. |
| `calWorkspaceCore` | Pure module: `mergeColorRules`, `mergeFieldConfig`, `resolveDisplayConfig`, `toGenericEvents`. |

## Demo

`c-cal-demo` — the **Calendar Demo** app page / tab (`/lightning/n/Calendar_Demo`).
Four calendars (Team, Personal, On-call, Assessments), all-day + multi-day events,
a deliberately busy day for the "+N more" overflow, and color rules: `status`
Cancelled/Tentative for the work calendars, plus `assessmentStatus`
Scheduled/Complete/Canceled/No Show for the Assessments calendar.