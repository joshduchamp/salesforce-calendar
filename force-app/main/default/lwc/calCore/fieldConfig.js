/**
 * Calendar-wide event field display config. The host supplies an ordered list
 * of fields to show on events beyond the title/time. Fields are read from the
 * generic event shape (top-level or `meta`), keeping the calendar
 * SObject-agnostic.
 *
 * fieldConfig entry shape:
 *   { key, label?, showLabel?, views?: string[], truncate?: number }
 * `views` limits the field to certain views/layouts ('month' | 'condensed' |
 * 'scheduler'); empty/absent means all.
 */

import { getEventValue } from './access';

export function resolveFields(event, fieldConfig, view) {
    return (fieldConfig || [])
        .filter((field) => field && field.key && appliesToView(field, view))
        .map((field) => {
            const raw = getEventValue(event, field.key);
            return {
                key: field.key,
                label: field.label || field.key,
                showLabel: Boolean(field.showLabel),
                value: formatValue(raw, field.truncate)
            };
        })
        .filter((field) => field.value !== '');
}

function appliesToView(field, view) {
    if (!field.views || field.views.length === 0 || !view) {
        return true;
    }
    return field.views.includes(view);
}

function formatValue(raw, truncate) {
    if (raw == null) {
        return '';
    }
    let text = Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (truncate && text.length > truncate) {
        text = `${text.slice(0, Math.max(truncate - 1, 0)).trimEnd()}…`;
    }
    return text;
}