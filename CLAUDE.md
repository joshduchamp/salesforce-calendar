# Calendar

Salesforce DX project (`force-app`, API 67.0) for a calendar feature built from Lightning Web Components.

## Architecture principles

### Small, single-purpose LWCs

Build the calendar as a composition of small components, each with one clear
responsibility. Do **not** build a single large component that owns the whole app.

- Each component does one thing (e.g. render a month grid, render a day cell, show
  an event chip, handle a date-picker popover). If a component's name needs "and"
  to describe it, split it.
- Prefer presentational components that take data in via `@api` props and emit
  user intent via `CustomEvent`. Keep data access (`@wire`, Apex, state) in a
  small number of container components.
- Push shared logic into plain JS modules or the `c/` service layer, not into a
  base component that everything extends.
- A component's template should be readable on one screen. If markup or the JS
  class is growing past that, that's the signal to decompose.

### Apex with clear separation of concern

Apex classes each have one responsibility. Keep the layers distinct:

- **Controllers** (`@AuraEnabled` entry points) only marshal input/output and
  delegate. No business logic, no SOQL, no DML in the controller body.
- **Service classes** hold business logic and orchestration.
- **Selector classes** own all SOQL for a given SObject.
- **Domain / trigger-handler classes** own record-level behavior and DML.
- No god classes. If a class name needs "and" or "Manager"/"Helper" catch-alls,
  reconsider the split. Utility classes stay small and stateless.

### Calendar is SObject-agnostic

The calendar components know nothing about specific SObjects — they work against a
generic event shape, and object-specific mapping happens at the edges. This is a
non-functional requirement; see
[docs/requirements.md](docs/requirements.md#non-functional-requirements) for the
full statement.

The **SObject harness** (`Cal_Calendar__c` + the `Cal*` Apex classes +
`c-cal-workspace`) is that edge: it maps records from any object into the generic
shape. It follows the Apex layering above. The calendar LWCs never import it. See
[docs/harness.md](docs/harness.md).

## Requirements

See [docs/requirements.md](docs/requirements.md).

## Components

See [docs/components.md](docs/components.md) for the component map and the
`c-cal-calendar` public API. All calendar components are prefixed `cal`;
`calCalendar` is the only public entry point. Pure logic lives in the `c/calCore`
service module and is unit-tested directly.

## Commands

- `npm test` — Jest unit tests (`sfdx-lwc-jest`).
- `npm run lint` — ESLint over `force-app/main/default/lwc`.
- `sf project deploy start -d force-app` — deploy to the default scratch org.
- `sf apex run test -l RunLocalTests` — Apex tests. Needs the `Calendar_Admin`
  permission set assigned to the running user (this scratch org enforces FLS on
  Apex DML): `sf org assign permset -n Calendar_Admin`.
