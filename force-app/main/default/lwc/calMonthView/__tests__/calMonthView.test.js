import { createElement } from 'lwc';
import CalMonthView from 'c/calMonthView';
import { normalizeEvents } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-month-view', { is: CalMonthView });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

// August 2026: the grid's first row is Sun Jul 26 .. Sat Aug 1.
const AUGUST = new Date(2026, 7, 15);

describe('c-cal-month-view', () => {
    it('renders a spanning bar for a multi-day event and keeps timed events as chips', async () => {
        const events = normalizeEvents([
            {
                id: 'trip',
                title: 'Conference',
                start: '2026-08-04T00:00:00',
                end: '2026-08-06T23:59:00',
                allDay: true
            },
            { id: 'sync', title: 'Sync', start: '2026-08-05T09:00:00', end: '2026-08-05T10:00:00' }
        ]);
        const element = setup({ date: AUGUST, events });
        await flush();

        const bars = element.shadowRoot.querySelectorAll('.month__bar');
        expect(bars).toHaveLength(1);
        // Tue Aug 4 is column 3, spans Tue–Thu.
        expect(bars[0].style.gridColumn).toBe('3 / span 3');

        // The timed event still renders as a cell chip, not a bar.
        const chipTitles = [...element.shadowRoot.querySelectorAll('c-cal-month-cell')]
            .flatMap((cell) => cell.chipEvents.map((e) => e.id))
            .filter((id) => id === 'sync');
        expect(chipTitles).toEqual(['sync']);
    });

    it('tells each cell in the row how many bar lanes to reserve', async () => {
        const events = normalizeEvents([
            { id: 'a', title: 'A', start: '2026-08-04T00:00:00', end: '2026-08-06T00:00:00', allDay: true },
            { id: 'b', title: 'B', start: '2026-08-05T00:00:00', end: '2026-08-07T00:00:00', allDay: true }
        ]);
        const element = setup({ date: AUGUST, events });
        await flush();

        const rowWithBars = [...element.shadowRoot.querySelectorAll('.month__row')].find(
            (row) => row.querySelectorAll('.month__bar').length > 0
        );
        const cells = rowWithBars.querySelectorAll('c-cal-month-cell');
        expect(cells[0].reservedLanes).toBe(2);

        const emptyRowCell = element.shadowRoot.querySelector('.month__row:last-child c-cal-month-cell');
        expect(emptyRowCell.reservedLanes).toBe(0);
    });

    it('drops weekends and narrows the grid when asked', async () => {
        const element = setup({ date: AUGUST, events: [], hideWeekends: true });
        await flush();
        expect(element.shadowRoot.querySelector('.month').style.cssText).toContain(
            '--cal-month-columns: 5'
        );
        expect(element.shadowRoot.querySelectorAll('.month__weekday')).toHaveLength(5);
    });
});
