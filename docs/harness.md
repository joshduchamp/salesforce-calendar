# SObject harness

The calendar components stay SObject-agnostic. The **harness** is the layer at
the edges that maps real records into the generic event shape and back: a
`Cal_Calendar__c` object, an Apex read/write path, and the `c-cal-workspace`
container LWC.

```
Cal_Calendar__c ─┐
                 ├─► CalWorkspaceController ─► CalWorkspaceService ─► CalEventQuery ─► generic events
Cal_User_Prefs __c┘                                    │
                                                       └─► c-cal-workspace ─► c-cal-calendar
```

## `Cal_Calendar__c`

One record = one calendar. Created and edited through standard record pages
(there is no setup wizard). OWD is **Private**; a sharing rule shares every
`Visibility__c = 'Public'` record with all internal users, so a user sees their
own private calendars plus all public ones.

A **Calendar Record Page** Lightning page (`Cal_Calendar_Record_Page`) is assigned
for the object inside the Calendar app; to use it everywhere, activate it as the
org default in App Builder (Setup → Object Manager → Calendar → Lightning Record
Pages). It shows the plain fields in one **Calendar** section, then the four
guided editors — Field Mapping, Field Configuration, Color Rules, Filter Criteria
— each of which owns its field. The classic **Calendar Layout** page layout still
exposes `Field_Mappings__c` / `Field_Config__c` / `Color_Rules__c` /
`Filter_Criteria__c` as raw fields, the documented way to bypass the components.

| Field | Purpose |
| --- | --- |
| `Target_Object__c` | SObject API name to read (`Event`, `Task`, `Opportunity`, …). |
| `Field_Mappings__c` | JSON: base event fields → source field API names. |
| `Field_Config__c` | JSON: extra fields to show, each with the source field to query. |
| `Color_Rules__c` | JSON: calendar-wide color rules (passed to `c-cal-calendar` verbatim). |
| `Filter_Criteria__c` | Optional SOQL `WHERE` fragment. Admin-authored. |
| `Default_Color__c` | Hex color when no rule matches. |
| `Visibility__c` | `Private` (owner only) or `Public` (everyone). |
| `Active__c` | Inactive calendars are never queried. |
| `Row_Limit__c` | Per-calendar row cap (hard-capped at 1000 at runtime). |

**No display settings live here** — view, layout, first day of week, scheduler
hours, legend toggles, and locale are per-user (see preferences below), because a
user views several calendars at once.

### `Field_Mappings__c`

```json
{
  "title": "Subject",
  "start": "StartDateTime",
  "end": "EndDateTime",
  "allDay": "IsAllDayEvent",
  "recordId": "Id"
}
```

`title` and `start` are required. `end` blank → the event is treated as a point
in time. `allDay` blank → all events timed; may also be the literal `true`/`false`.
`recordId` blank → double-click does not navigate to a record.

On the record page this field is edited through the **Field Mapping** component
(`c-cal-field-mapping`). It opens as a condensed read-only summary; a header
pencil expands the guided picker — each slot a picklist of the Target Object's
fields (via `getObjectInfo`) — with Cancel / Save. The raw JSON is still valid
input — add the field to the layout or set it through the API to bypass the
component.

### `Field_Config__c`

The array `c-cal-calendar` consumes, plus a `source` per entry (the field API
name to `SELECT`; defaults to `key`). Dotted lookup paths are allowed on
`source`, up to 5 levels (`Owner.Name`, `Account.Industry`).

```json
[
  { "key": "location", "source": "Location", "label": "Where", "showLabel": false },
  { "key": "owner", "source": "Owner.Name", "label": "Owner", "views": ["scheduler", "condensed"] }
]
```

Each `key` becomes a key in the event's `meta` bag.

On the record page this field is edited through the **Field Configuration**
component (`c-cal-field-mapping`'s sibling, `c-cal-field-config`). It opens as a
condensed read-only summary table; a header pencil expands the full editor — an
ordered, add/remove/reorder list of entries, each with the source field, label,
label visibility, truncation, and the views it shows in — with Cancel / Save. The
raw JSON is still valid input — add the field to the layout or set it through the
API to bypass the component.

### `Color_Rules__c`

```json
{
  "rules": [
    { "key": "location", "operator": "equals", "value": "Room 4", "color": "#c9394a", "label": "Room 4" }
  ],
  "defaultColor": "#1b96ff"
}
```

Every rule `key` **must** be a `Field_Config__c` key (so its source field is
queried). Rules are evaluated in the browser by `c/calCore`.

On the record page this field is edited through the **Color Rules** component
(`c-cal-color-rules`). It opens as a condensed read-only summary — one swatch +
field + condition + legend label per rule, then the fallback color; a header
pencil expands the full editor — an add/remove/reorder list of rules, each with
the field (a picklist of `Field_Config__c` keys), the operator, its value, a
legend label, and a color, plus the `defaultColor` — with Cancel / Save. Colors
are chosen from a named palette (`c-cal-color-picker`), not typed as hex. The raw
JSON is still valid input — add the field to the layout or set it through the API
to bypass the component.

### `Filter_Criteria__c`

An optional `WHERE` fragment (no leading `WHERE`). Placeholders expand to **bind
variables**, never string literals:

| Placeholder | Binds to |
| --- | --- |
| `$CURRENT_USER_ID` | the running user's id |
| `$RANGE_START` / `$RANGE_END` | the visible range bounds |

Example: `OwnerId = $CURRENT_USER_ID AND ShowAs = 'Busy'`.

The fragment is trial-compiled on save; `;` and comments are rejected. Only
`Calendar_Admin` can edit it.

On the record page this field is edited through the **Filter Criteria** component
(`c-cal-filter-criteria`). It opens as a read-only view of the stored fragment; a
header pencil expands a textarea with the placeholder reference, a searchable list
of the Target Object's fields, and a **Check syntax** button that trial-compiles
the fragment server-side (`CalFilterController.checkFilter`) before Save. The raw
field is still valid input — add it to the layout or set it through the API to
bypass the component. The expansion and trial-compile rules are shared with the
save-time validation and the runtime query via `CalFilterCompiler`.

### Save-time validation

`CalCalendarTrigger` rejects a record whose JSON is malformed, whose target
object or a mapped/source field does not exist or is not readable, whose color
rule keys are unknown, or whose filter does not compile — so a broken calendar
can never reach the runtime query.

## Per-user preferences — `Cal_User_Preferences__c`

One row per user (OWD Private, owned by that user). Holds the selected calendar
ids, the primary calendar, and every display-chrome setting. `c-cal-workspace`
upserts it, debounced ~1s, on view / layout / selection / primary change and on
any change from the settings-drawer form (first day of week, weekend visibility,
scheduler hour window, month-cell event cap, legend toggles, locale). The focused
date is not persisted — the workspace always opens on today.

## Apex

| Class | Layer | Responsibility |
| --- | --- | --- |
| `CalWorkspaceController` | controller | `getWorkspace()`, `getEvents()`, `savePreferences()` — marshalling only. |
| `CalFilterController` | controller | `checkFilter()` — trial-compiles a candidate `Filter_Criteria__c` fragment for the record-page helper. Marshalling only. |
| `CalWorkspaceService` | service | Orchestrates; owns the governor-limit policy. |
| `CalEventQuery` | service | One calendar → generic events. Builds + runs the dynamic SOQL. |
| `CalSchemaGuard` | utility | Validates object / field API names and read access; value formatting. |
| `CalJsonConfig` | utility | Parses the JSON config fields (shared with the trigger). |
| `CalFilterCompiler` | utility | `Filter_Criteria__c` placeholder expansion + trial-compile. Shared by the trigger, `CalEventQuery`, and `CalFilterController`. |
| `CalCalendarSelector` / `CalUserPreferencesSelector` | selector | All SOQL for the harness objects. |
| `CalCalendarTriggerHandler` | domain | `Cal_Calendar__c` save-time validation. |
| `CalUserPreferencesDomain` | domain | Upsert the running user's one preference row. |
| `CalDto` | — | `@AuraEnabled` wire structs. |

### Security

- **Sharing** — public / private is enforced by OWD + the sharing rule; every
  selector is `with sharing`.
- **Dynamic SOQL** — user input is never concatenated (`calendarIds` is a typed
  `List<Id>`; range bounds and `$…` placeholders are bind variables). Object and
  field tokens reach the query string only after `CalSchemaGuard` describe
  validation. `CalEventQuery` runs `WITH USER_MODE`, so the viewing user's
  CRUD/FLS on the **target** object always applies, with `stripInaccessible` as a
  backstop.
- **Access to the harness itself** is gated by the `Calendar_User` /
  `Calendar_Admin` permission sets.

### Governor limits

One SOQL per calendar. At most 25 calendars per fetch (`truncated` is flagged
beyond that); per-calendar `LIMIT` is `min(Row_Limit__c, 1000)`; a running budget
of 20 000 rows stops further queries. `getEvents` is `cacheable`, so navigating
back to a visited range does not re-enter Apex.

## Container LWC

| Component | Responsibility |
| --- | --- |
| `c-cal-workspace` | The only data-aware calendar component. Wires `getWorkspace`, refetches on `rangechange` (debounced, out-of-order-safe), merges N calendars into one `c-cal-calendar` prop set, persists preferences. Targets App / Home pages. A settings control in the calendar's `toolbar-end` slot (or in the empty state) opens a `c-cal-drawer` holding the calendar picker and the display-settings form. |
| `c-cal-calendar-picker` | Presentational. Grouped "My / Shared" checkbox list to choose which calendars to display; emits `calendarselectionchange` / `primarychange`. Distinct from the in-calendar `calSourceList`, which only show/hides already-loaded calendars. Lives inside the workspace drawer, so calendar-subscription choice stays off the main layout — the in-calendar sidebar keeps only the per-view visibility toggles + legend. |
| `c-cal-display-settings` | Presentational. The display-chrome form in the workspace drawer: first day of week, hide weekends, scheduler start/end hour, max events per day, hide legend, show legend counts, locale — the per-user preferences the in-calendar toolbar does not already own (view / layout). Controlled: each value in via `@api`, one `settingschange` (`{ <key>: <value> }`) out per change; the workspace merges it into the display config and autosaves. |
| `c-cal-drawer` | Generic presentational slide-out panel — see [components.md](components.md). Not harness-specific; the workspace just composes it. |
| `c-cal-field-mapping` | Record-page helper for `Cal_Calendar__c`. Read-only summary of `Field_Mappings__c`; a pencil opens the guided per-slot field picker. Not part of the runtime data path. |
| `c-cal-field-config` | Record-page helper for `Cal_Calendar__c`. Read-only summary of `Field_Config__c` (the ordered extra fields shown on events); a pencil opens the guided add/remove/reorder editor. Not part of the runtime data path. |
| `c-cal-color-rules` | Record-page helper for `Cal_Calendar__c`. Read-only summary of `Color_Rules__c` (the calendar-wide color rules + fallback color); a pencil opens the guided add/remove/reorder editor. Colors are picked from a named palette via `c-cal-color-picker`. Not part of the runtime data path. |
| `c-cal-filter-criteria` | Record-page helper for `Cal_Calendar__c`. Read-only view of `Filter_Criteria__c`; a pencil opens a textarea with the placeholder reference, the Target Object's field list, and a server-side **Check syntax** button (`CalFilterController`). Not part of the runtime data path. |
| `c-cal-color-picker` | Presentational. A labelled swatch that opens a panel of named colors (plus a native picker), so a color is chosen by sight rather than by hex. Controlled — `value` in, `change` ({ value }) out. |
| `c/calWorkspaceCore` | Pure module: `mergeColorRules`, `mergeFieldConfig`, `resolveDisplayConfig`, `toGenericEvents`. |

Merge precedence for display settings: **user preference, else the
`c-cal-calendar` default**. Color rules and field config are concatenated across
the selected calendars, primary first, de-duplicated.

## Timezone

`CalEventQuery` emits timed events as **UTC ISO 8601 with `Z`** and all-day
events as **floating local midnight** (no `Z`), matching the browser-local
behavior the calendar already assumes. Pinning scheduler geometry to the org
timezone or business hours is a follow-up — see
[requirements.md](requirements.md#open-questions).

## Try it

```bash
sf org assign permset -n Calendar_Admin
```

Then create a `Cal_Calendar__c` (Target Object `Event`, the mappings above,
Visibility `Public`), open the **Calendar Workspace** tab, and pick it from the
list.