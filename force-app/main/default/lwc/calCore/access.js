/**
 * Shared accessor: read an attribute from a normalized event, checking top-level
 * fields first and then the opaque `meta` bag. Keeps every consumer (color
 * rules, field config) reading events the same way.
 */
export function getEventValue(event, key) {
    if (!event || key == null) {
        return undefined;
    }
    if (Object.prototype.hasOwnProperty.call(event, key)) {
        return event[key];
    }
    return event.meta ? event.meta[key] : undefined;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}