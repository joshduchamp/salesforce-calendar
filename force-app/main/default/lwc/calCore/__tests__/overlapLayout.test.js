import { normalizeEvents, packColumns, eventBand } from 'c/calCore';

const at = (startHour, endHour) => ({
    id: `${startHour}-${endHour}`,
    start: `2026-08-29T${String(startHour).padStart(2, '0')}:00:00`,
    end: `2026-08-29T${String(endHour).padStart(2, '0')}:00:00`
});

describe('packColumns', () => {
    it('leaves non-overlapping events in a single column', () => {
        const events = normalizeEvents([at(9, 10), at(10, 11), at(11, 12)]);
        const packed = packColumns(events);
        expect(packed.every((p) => p.columnIndex === 0 && p.columnCount === 1)).toBe(true);
    });

    it('splits two overlapping events into two columns', () => {
        const events = normalizeEvents([at(9, 11), at(10, 12)]);
        const packed = packColumns(events);
        expect(packed.map((p) => p.columnIndex)).toEqual([0, 1]);
        expect(packed.every((p) => p.columnCount === 2)).toBe(true);
    });

    it('reuses a freed column after an event ends', () => {
        // 9-11 holds column 0; 9-10 takes column 1; once 9-10 ends, 10-11 reuses column 1
        const events = normalizeEvents([at(9, 10), at(9, 11), at(10, 11)]);
        const packed = packColumns(events);
        const byId = Object.fromEntries(packed.map((p) => [p.event.id, p]));
        expect(byId['9-11'].columnIndex).toBe(0);
        expect(byId['9-10'].columnIndex).toBe(1);
        expect(byId['10-11'].columnIndex).toBe(1);
        expect(packed.every((p) => p.columnCount === 2)).toBe(true);
    });

    it('keeps separate clusters independent', () => {
        const events = normalizeEvents([at(9, 10), at(9, 10), at(14, 15)]);
        const packed = packColumns(events);
        const lonely = packed.find((p) => p.event.id === '14-15');
        expect(lonely.columnCount).toBe(1);
    });
});

describe('eventBand', () => {
    const day = new Date(2026, 7, 29);

    it('positions an event within the full-day window', () => {
        const [event] = normalizeEvents([at(6, 12)]);
        const band = eventBand(event, day, { startHour: 0, endHour: 24 });
        expect(band.top).toBeCloseTo(0.25, 5);
        expect(band.height).toBeCloseTo(0.25, 5);
    });

    it('clips an event to a narrow working-hours window', () => {
        const [event] = normalizeEvents([at(6, 12)]);
        const band = eventBand(event, day, { startHour: 8, endHour: 18 });
        expect(band.top).toBeCloseTo(0, 5); // starts before the window
        expect(band.height).toBeCloseTo(0.4, 5); // 8-12 of a 10h window
    });

    it('clips a multi-day event to the day bounds', () => {
        const [event] = normalizeEvents([
            { id: 'm', start: '2026-08-28T20:00:00', end: '2026-08-30T04:00:00' }
        ]);
        const band = eventBand(event, day, { startHour: 0, endHour: 24 });
        expect(band.top).toBeCloseTo(0, 5);
        expect(band.height).toBeCloseTo(1, 2);
    });
});
