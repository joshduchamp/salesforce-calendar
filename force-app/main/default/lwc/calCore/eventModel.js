/**
 * Normalizes the generic, host-supplied event shape into something the views
 * can render. The calendar never sees SObject records — only this shape.
 *
 * Input event (all host-supplied):
 *   { id, calendarId, title, start, end, allDay, recordId?, meta? }
 * `start` / `end` are ISO 8601 strings (or anything the Date constructor takes).
 */

import { startOfDay, endOfDay, isSameDay } from './dateRange';

const DEFAULT_TIMED_DURATION_MS = 60 * 60 * 1000;

export function normalizeEvent(raw) {
    const start = new Date(raw.start);
    const allDay = Boolean(raw.allDay);
    let end;
    if (raw.end) {
        end = new Date(raw.end);
    } else if (allDay) {
        end = endOfDay(start);
    } else {
        end = new Date(start.getTime() + DEFAULT_TIMED_DURATION_MS);
    }
    if (end < start) {
        end = allDay ? endOfDay(start) : new Date(start.getTime() + DEFAULT_TIMED_DURATION_MS);
    }
    return {
        id: String(raw.id),
        calendarId: raw.calendarId == null ? null : String(raw.calendarId),
        title: raw.title == null ? '' : String(raw.title),
        start,
        end,
        allDay,
        recordId: raw.recordId || null,
        meta: raw.meta || {},
        raw
    };
}

export function normalizeEvents(list) {
    return (list || [])
        .filter((raw) => raw && raw.id != null && raw.start != null)
        .map(normalizeEvent)
        .filter((event) => !Number.isNaN(event.start.getTime()))
        .sort(compareEvents);
}

/**
 * Sort order for chronological ("condensed") lists: by start, then longest
 * first, then title.
 */
export function compareEvents(a, b) {
    const startDiff = a.start - b.start;
    if (startDiff !== 0) {
        return startDiff;
    }
    const durationDiff = b.end - b.start - (a.end - a.start);
    if (durationDiff !== 0) {
        return durationDiff;
    }
    return a.title.localeCompare(b.title);
}

export function isMultiDay(event) {
    return !isSameDay(event.start, lastCoveredDay(event));
}

/** The last calendar day an event visually touches (an end of exactly midnight
 * belongs to the previous day). */
export function lastCoveredDay(event) {
    const end = new Date(event.end);
    if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0 && end > event.start) {
        return startOfDay(new Date(end.getTime() - 1));
    }
    return startOfDay(end);
}

export function occursOnDay(event, day) {
    return startOfDay(day) <= lastCoveredDay(event) && endOfDay(day) >= event.start;
}

export function eventsForDay(events, day) {
    return events.filter((event) => occursOnDay(event, day));
}

export function eventsInRange(events, start, end) {
    return events.filter((event) => event.start <= end && event.end >= start);
}

/** Split by the two layout families each day column needs. */
export function partitionDayEvents(events, day) {
    const onDay = eventsForDay(events, day);
    const allDay = [];
    const timed = [];
    for (const event of onDay) {
        if (event.allDay || isMultiDay(event)) {
            allDay.push(event);
        } else {
            timed.push(event);
        }
    }
    return { allDay, timed };
}
