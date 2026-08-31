/**
 * Calendar-wide color coding. The host supplies one ordered rule set; each rule
 * tests an attribute present on every event and colors every event that
 * matches (e.g. `status` equals "Scheduled" -> blue). Rules are evaluated per
 * event at render time.
 *
 * colorRules shape:
 *   { rules: [{ key, operator, value, color }], defaultColor }
 */

import { getEventValue } from './access';

export const DEFAULT_EVENT_COLOR = '#1b96ff';

const OPERATORS = {
    equals: (actual, expected) => String(actual) === String(expected),
    notEquals: (actual, expected) => String(actual) !== String(expected),
    contains: (actual, expected) =>
        String(actual ?? '')
            .toLowerCase()
            .includes(String(expected ?? '').toLowerCase()),
    startsWith: (actual, expected) =>
        String(actual ?? '')
            .toLowerCase()
            .startsWith(String(expected ?? '').toLowerCase()),
    in: (actual, expected) => Array.isArray(expected) && expected.map(String).includes(String(actual)),
    greaterThan: (actual, expected) => Number(actual) > Number(expected),
    lessThan: (actual, expected) => Number(actual) < Number(expected),
    isSet: (actual) => actual !== undefined && actual !== null && actual !== '',
    isBlank: (actual) => actual === undefined || actual === null || actual === ''
};

export function matchRule(event, rule) {
    if (!rule || !rule.key) {
        return false;
    }
    const operator = OPERATORS[rule.operator || 'equals'];
    if (!operator) {
        return false;
    }
    return operator(getEventValue(event, rule.key), rule.value);
}

/**
 * Resolve an event's color: first matching rule wins, then the per-calendar
 * color, then the configured default, then the built-in default.
 */
export function resolveColor(event, colorRules, calendar) {
    const rules = (colorRules && colorRules.rules) || [];
    for (const rule of rules) {
        if (matchRule(event, rule)) {
            return rule.color;
        }
    }
    if (calendar && calendar.color) {
        return calendar.color;
    }
    return (colorRules && colorRules.defaultColor) || DEFAULT_EVENT_COLOR;
}

/** The set of rules that produced at least one color, for a legend. */
export function activeLegend(events, colorRules) {
    const rules = (colorRules && colorRules.rules) || [];
    return rules
        .map((rule, index) => ({
            index,
            label: rule.label || describeRule(rule),
            color: rule.color,
            count: events.filter((event) => matchRule(event, rule)).length
        }))
        .filter((entry) => entry.count > 0);
}

function describeRule(rule) {
    return `${rule.key} ${rule.operator || 'equals'} ${rule.value ?? ''}`.trim();
}