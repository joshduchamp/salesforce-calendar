# Salesforce Calendar LWC

A reusable, **SObject-agnostic** calendar built from small, single-purpose
Lightning Web Components. The calendar knows nothing about `Event`, `Contact`, or
any custom object — the host passes in a generic event shape and reacts to the
intent events the calendar emits.

> Status: month view is complete. Week and day views (condensed + scheduler
> layouts) are in progress — see [docs/requirements.md](docs/requirements.md).

## Highlights

- **Month view** with equal-height weeks, per-day event chips, and an
  always-visible "+N more" that opens a hover popover of the full day.
- **Multiple calendars** with per-calendar show/hide toggles.
- **Calendar-wide color coding** — ordered rules match a field on every event
  (`status` equals `Scheduled` → blue), falling back to a per-calendar color.
- **Configurable event fields** — the host picks which fields render on a chip,
  per view.
- **Double-click to open** the related record (`NavigationMixin`, no object API
  name required).
- Pure date / layout / color logic lives in the `c/calCore` module and is
  unit-tested directly (90+ Jest tests).
- **SObject harness** — a `Cal_Calendar__c` object + Apex layer that maps records
  from any SObject into the generic event shape, with public / private calendars,
  a per-user calendar picker, and saved preferences
  (`c-cal-workspace`). See [docs/harness.md](docs/harness.md).

## Quick start

```bash
npm install
npm test          # Jest unit tests
npm run lint

sf org create scratch -f config/project-scratch-def.json -a calendar-dev
sf project deploy start -d force-app
sf org assign permset -n Calendar_Access   # demo tab
sf org assign permset -n Calendar_Admin    # harness: manage calendars + run Apex tests
sf org open -p /lightning/n/Calendar_Demo
```

The **Calendar Demo** tab hosts `c-cal-demo` — sample data wired into
`c-cal-calendar` with no Apex. The **Calendar Workspace** tab hosts
`c-cal-workspace` — the SObject-backed harness ([docs/harness.md](docs/harness.md)).

## Using the component

```html
<c-cal-calendar
    events={events}
    calendars={calendars}
    view="month"
    field-config={fieldConfig}
    color-rules={colorRules}
    first-day-of-week="1"
    onrangechange={handleRangeChange}
    oneventclick={handleEventClick}
    oneventopen={handleEventOpen}
    oncalendarvisibilitychange={handleVisibilityChange}
></c-cal-calendar>
```

Event shape (all host-supplied):

```js
{ id, calendarId, title, start, end, allDay, recordId?, meta? }
```

`start` / `end` are ISO strings; `meta` is an opaque bag that `field-config` and
`color-rules` read by key. A host adapter maps its records into this shape — the
calendar stays object-agnostic.

Full attribute / event reference: [docs/components.md](docs/components.md).

## Architecture

See [CLAUDE.md](CLAUDE.md). In short: small components (each does one thing), thin
`@AuraEnabled` controllers when Apex is added, and the calendar composed rather
than built as one monolith.

## License

[MIT](LICENSE) © 2026 Joshua Duchamp
