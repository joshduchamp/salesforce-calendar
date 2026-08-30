import { normalizeEvents, eachDay, packLanes } from 'c/calCore';

const week = eachDay(new Date(2026, 7, 23), new Date(2026, 7, 29)); // Sun..Sat

describe('packLanes', () => {
    it('places non-overlapping spans in one lane', () => {
        const events = normalizeEvents([
            { id: 'a', start: '2026-08-23T00:00:00', end: '2026-08-24T23:59:59', allDay: true },
            { id: 'b', start: '2026-08-26T00:00:00', end: '2026-08-27T23:59:59', allDay: true }
        ]);
        const { placements, laneCount } = packLanes(events, week);
        expect(laneCount).toBe(1);
        expect(placements.every((p) => p.lane === 0)).toBe(true);
    });

    it('stacks overlapping spans into separate lanes', () => {
        const events = normalizeEvents([
            { id: 'a', start: '2026-08-23T00:00:00', end: '2026-08-26T23:59:59', allDay: true },
            { id: 'b', start: '2026-08-25T00:00:00', end: '2026-08-28T23:59:59', allDay: true }
        ]);
        const { placements, laneCount } = packLanes(events, week);
        expect(laneCount).toBe(2);
        expect(placements.map((p) => p.lane).sort()).toEqual([0, 1]);
    });

    it('computes the column span across visible days', () => {
        const events = normalizeEvents([
            { id: 'a', start: '2026-08-24T00:00:00', end: '2026-08-26T23:59:59', allDay: true }
        ]);
        const [placement] = packLanes(events, week).placements;
        expect(placement.startIndex).toBe(1); // Monday
        expect(placement.endIndex).toBe(3); // Wednesday
        expect(placement.span).toBe(3);
    });

    it('clamps spans that start before or end after the visible week', () => {
        const events = normalizeEvents([
            { id: 'a', start: '2026-08-20T00:00:00', end: '2026-09-02T23:59:59', allDay: true }
        ]);
        const [placement] = packLanes(events, week).placements;
        expect(placement.startIndex).toBe(0);
        expect(placement.endIndex).toBe(6);
        expect(placement.continuesBefore).toBe(true);
        expect(placement.continuesAfter).toBe(true);
    });

    it('ignores spans entirely outside the visible week', () => {
        const events = normalizeEvents([
            { id: 'a', start: '2026-09-10T00:00:00', end: '2026-09-12T00:00:00', allDay: true }
        ]);
        expect(packLanes(events, week).placements).toHaveLength(0);
    });
});
