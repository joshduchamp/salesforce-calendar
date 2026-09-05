import { toGenericEvents, isTruncated } from 'c/calWorkspaceCore';

describe('toGenericEvents', () => {
    it('renames endsAt to end and guarantees a meta object', () => {
        const result = {
            events: [
                {
                    id: 'c1:001',
                    calendarId: 'c1',
                    title: 'Sync',
                    start: '2026-08-31T15:00:00Z',
                    endsAt: '2026-08-31T16:00:00Z',
                    allDay: false,
                    recordId: '001',
                    meta: { location: 'Room 4' }
                },
                {
                    id: 'c1:002',
                    calendarId: 'c1',
                    title: 'Holiday',
                    start: '2026-09-01T00:00:00',
                    endsAt: '2026-09-01T00:00:00',
                    allDay: true,
                    recordId: null,
                    meta: null
                }
            ]
        };
        const events = toGenericEvents(result);
        expect(events[0].end).toBe('2026-08-31T16:00:00Z');
        expect(events[0].endsAt).toBeUndefined();
        expect(events[1].meta).toEqual({});
        expect(events[1].allDay).toBe(true);
    });

    it('handles an empty or missing payload', () => {
        expect(toGenericEvents(null)).toEqual([]);
        expect(toGenericEvents({})).toEqual([]);
    });
});

describe('isTruncated', () => {
    it('reflects the payload flag', () => {
        expect(isTruncated({ truncated: true })).toBe(true);
        expect(isTruncated({ truncated: false })).toBe(false);
        expect(isTruncated(null)).toBe(false);
    });
});
