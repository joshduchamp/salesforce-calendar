/**
 * Adapts the Apex `CalDto.EventsResult` payload to the generic event array that
 * `c/calCalendar` consumes: renames `endsAt` back to `end` and guarantees
 * `meta` is always a plain object.
 */
export function toGenericEvents(eventsResult) {
    const list = (eventsResult && eventsResult.events) || [];
    return list.map((event) => ({
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        start: event.start,
        end: event.endsAt,
        allDay: Boolean(event.allDay),
        recordId: event.recordId || null,
        meta: event.meta || {}
    }));
}

export function isTruncated(eventsResult) {
    return Boolean(eventsResult && eventsResult.truncated);
}