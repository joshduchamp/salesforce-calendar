/**
 * Merges the configuration of several calendars into the single prop set that
 * `c/calCalendar` consumes. Pure and DOM-free — unit-tested directly.
 */

/**
 * Concatenate every selected calendar's color rules (primary calendar first),
 * dropping duplicates. `defaultColor` comes from the primary calendar.
 *
 * @param {Array} orderedCalendars `[{ colorRules: { rules, defaultColor } }]`
 */
export function mergeColorRules(orderedCalendars) {
    const rules = [];
    const seen = new Set();
    let defaultColor;

    (orderedCalendars || []).forEach((calendar, index) => {
        const parsed = (calendar && calendar.colorRules) || {};
        if (index === 0 && parsed.defaultColor) {
            defaultColor = parsed.defaultColor;
        }
        (parsed.rules || []).forEach((rule) => {
            if (!rule || !rule.key) {
                return;
            }
            const signature = `${rule.key}|${rule.operator || 'equals'}|${JSON.stringify(
                rule.value === undefined ? null : rule.value
            )}`;
            if (seen.has(signature)) {
                return;
            }
            seen.add(signature);
            rules.push(rule);
        });
    });

    return { rules, defaultColor };
}

/**
 * Union of every selected calendar's field config by `key` — first occurrence
 * wins (primary calendar first), order preserved.
 *
 * @param {Array} orderedCalendars `[{ fieldConfig: [{ key, ... }] }]`
 */
export function mergeFieldConfig(orderedCalendars) {
    const merged = [];
    const seen = new Set();

    (orderedCalendars || []).forEach((calendar) => {
        ((calendar && calendar.fieldConfig) || []).forEach((entry) => {
            if (!entry || !entry.key || seen.has(entry.key)) {
                return;
            }
            seen.add(entry.key);
            merged.push(entry);
        });
    });

    return merged;
}

const DISPLAY_KEYS = [
    'view',
    'layout',
    'firstDayOfWeek',
    'hideWeekends',
    'schedulerStartHour',
    'schedulerEndHour',
    'maxEventsPerDay',
    'hideLegend',
    'showLegendCounts',
    'locale'
];

/**
 * The user's saved preference is the only source of display config. Where a
 * value is null/undefined it is omitted, so `c/calCalendar`'s own `@api` default
 * applies.
 *
 * @param {Object} userPrefs `{ displayConfig: { ... } }`
 */
export function resolveDisplayConfig(userPrefs) {
    const source = (userPrefs && userPrefs.displayConfig) || {};
    const resolved = {};
    DISPLAY_KEYS.forEach((key) => {
        if (source[key] !== null && source[key] !== undefined) {
            resolved[key] = source[key];
        }
    });
    return resolved;
}