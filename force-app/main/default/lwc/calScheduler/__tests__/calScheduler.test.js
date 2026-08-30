import { createElement } from 'lwc';
import CalScheduler from 'c/calScheduler';
import { normalizeEvents, eachDay } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-scheduler', { is: CalScheduler });
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

const week = eachDay(new Date(2026, 7, 23), new Date(2026, 7, 29));

describe('c-cal-scheduler', () => {
    it('renders one column and heading per day plus a time axis', async () => {
        const element = setup({ days: week, events: [] });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-scheduler-column')).toHaveLength(7);
        expect(element.shadowRoot.querySelectorAll('.scheduler__heading')).toHaveLength(7);
        expect(element.shadowRoot.querySelector('c-cal-time-axis')).not.toBeNull();
    });

    it('routes all-day and multi-day events to the band, timed events to columns', async () => {
        const events = normalizeEvents([
            {
                id: 'allday',
                title: 'Conference',
                start: '2026-08-25T00:00:00',
                end: '2026-08-27T00:00:00',
                allDay: true
            },
            {
                id: 'timed',
                title: 'Sync',
                start: '2026-08-25T09:00:00',
                end: '2026-08-25T10:00:00'
            }
        ]);
        const element = setup({ days: week, events });
        await flush();
        const band = element.shadowRoot.querySelector('c-cal-all-day-row');
        expect(band.events.map((e) => e.id)).toEqual(['allday']);
        const columns = [...element.shadowRoot.querySelectorAll('c-cal-scheduler-column')];
        const withEvents = columns.filter((c) => c.events.length > 0);
        expect(withEvents).toHaveLength(1);
        expect(withEvents[0].events[0].id).toBe('timed');
    });

    it('sizes the grid to the visible hour window', async () => {
        const element = setup({ days: week, events: [], startHour: 8, endHour: 18 });
        await flush();
        const grid = element.shadowRoot.querySelector('.scheduler__grid');
        expect(grid.style.height).toBe('480px'); // 10h * 48px
    });
});
