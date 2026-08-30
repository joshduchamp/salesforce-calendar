import { createElement } from 'lwc';
import CalAllDayRow from 'c/calAllDayRow';
import { normalizeEvents, eachDay } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-all-day-row', { is: CalAllDayRow });
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

const week = eachDay(new Date(2026, 7, 23), new Date(2026, 7, 29)); // Sun..Sat

describe('c-cal-all-day-row', () => {
    it('spans a bar across the days it covers', async () => {
        const events = normalizeEvents([
            {
                id: 'trip',
                title: 'Trip',
                start: '2026-08-24T00:00:00',
                end: '2026-08-27T00:00:00',
                allDay: true
            }
        ]);
        const element = setup({ days: week, events });
        await flush();
        const bar = element.shadowRoot.querySelector('.band__bar');
        // Mon (index 1) through Wed (index 3): starts at column 2, spans 3
        expect(bar.style.gridColumn).toBe('2 / span 3');
        expect(element.shadowRoot.querySelector('c-cal-event-chip')).not.toBeNull();
    });

    it('stacks overlapping bars onto separate lanes', async () => {
        const events = normalizeEvents([
            { id: 'a', title: 'A', start: '2026-08-24T00:00:00', end: '2026-08-26T00:00:00', allDay: true },
            { id: 'b', title: 'B', start: '2026-08-25T00:00:00', end: '2026-08-28T00:00:00', allDay: true }
        ]);
        const element = setup({ days: week, events });
        await flush();
        const rows = [...element.shadowRoot.querySelectorAll('.band__bar')].map(
            (bar) => bar.style.gridRow
        );
        expect(new Set(rows).size).toBe(2);
    });
});
