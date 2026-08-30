import {
    normalizeEvent,
    normalizeEvents,
    isMultiDay,
    lastCoveredDay,
    occursOnDay,
    partitionDayEvents
} from 'c/calCore';

describe('normalizeEvent', () => {
    it('coerces ids and defaults meta', () => {
        const event = normalizeEvent({ id: 42, start: '2026-08-29T09:00:00', calendarId: 7 });
        expect(event.id).toBe('42');
        expect(event.calendarId).toBe('7');
        expect(event.meta).toEqual({});
        expect(event.recordId).toBeNull();
    });

    it('gives a timed event a default one-hour end', () => {
        const event = normalizeEvent({ id: 'a', start: '2026-08-29T09:00:00' });
        expect(event.end - event.start).toBe(60 * 60 * 1000);
    });

    it('gives an all-day event with no end an end-of-day end', () => {
        const event = normalizeEvent({ id: 'a', start: '2026-08-29T00:00:00', allDay: true });
        expect(event.end.getHours()).toBe(23);
        expect(event.end.getMinutes()).toBe(59);
    });

    it('repairs an end that precedes the start', () => {
        const event = normalizeEvent({
            id: 'a',
            start: '2026-08-29T09:00:00',
            end: '2026-08-29T08:00:00'
        });
        expect(event.end.getTime()).toBeGreaterThan(event.start.getTime());
    });
});

describe('normalizeEvents', () => {
    it('drops junk and sorts chronologically', () => {
        const events = normalizeEvents([
            { id: 'late', start: '2026-08-29T15:00:00' },
            null,
            { id: 'no-start' },
            { id: 'early', start: '2026-08-29T08:00:00' },
            { id: 'bad-date', start: 'not-a-date' }
        ]);
        expect(events.map((e) => e.id)).toEqual(['early', 'late']);
    });

    it('orders same-start events longest first', () => {
        const events = normalizeEvents([
            { id: 'short', start: '2026-08-29T08:00:00', end: '2026-08-29T08:30:00' },
            { id: 'long', start: '2026-08-29T08:00:00', end: '2026-08-29T10:00:00' }
        ]);
        expect(events.map((e) => e.id)).toEqual(['long', 'short']);
    });
});

describe('isMultiDay / lastCoveredDay', () => {
    it('treats a midnight end as the previous day', () => {
        const event = normalizeEvent({
            id: 'a',
            start: '2026-08-29T09:00:00',
            end: '2026-08-30T00:00:00'
        });
        expect(isMultiDay(event)).toBe(false);
        expect(lastCoveredDay(event)).toEqual(new Date(2026, 7, 29, 0, 0, 0, 0));
    });

    it('flags a true multi-day span', () => {
        const event = normalizeEvent({
            id: 'a',
            start: '2026-08-29T09:00:00',
            end: '2026-08-31T10:00:00'
        });
        expect(isMultiDay(event)).toBe(true);
    });
});

describe('occursOnDay', () => {
    const event = normalizeEvent({
        id: 'a',
        start: '2026-08-29T22:00:00',
        end: '2026-08-31T06:00:00'
    });

    it('matches every covered day', () => {
        expect(occursOnDay(event, new Date(2026, 7, 29))).toBe(true);
        expect(occursOnDay(event, new Date(2026, 7, 30))).toBe(true);
        expect(occursOnDay(event, new Date(2026, 7, 31))).toBe(true);
    });

    it('rejects days outside the span', () => {
        expect(occursOnDay(event, new Date(2026, 7, 28))).toBe(false);
        expect(occursOnDay(event, new Date(2026, 8, 1))).toBe(false);
    });
});

describe('partitionDayEvents', () => {
    it('splits all-day / multi-day from timed', () => {
        const events = normalizeEvents([
            { id: 'timed', start: '2026-08-29T09:00:00', end: '2026-08-29T10:00:00' },
            { id: 'allday', start: '2026-08-29T00:00:00', allDay: true },
            { id: 'multi', start: '2026-08-28T09:00:00', end: '2026-08-30T10:00:00' }
        ]);
        const { allDay, timed } = partitionDayEvents(events, new Date(2026, 7, 29));
        expect(timed.map((e) => e.id)).toEqual(['timed']);
        expect(allDay.map((e) => e.id).sort()).toEqual(['allday', 'multi']);
    });
});
