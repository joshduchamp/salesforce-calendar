import { createElement } from 'lwc';
import CalAgenda from 'c/calAgenda';
import { normalizeEvents, eachDay } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-agenda', { is: CalAgenda });
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

describe('c-cal-agenda', () => {
    it('renders a day group only for days that have events', async () => {
        const events = normalizeEvents([
            { id: 'a', title: 'Mon sync', start: '2026-08-24T09:00:00', end: '2026-08-24T10:00:00' },
            { id: 'b', title: 'Wed review', start: '2026-08-26T14:00:00', end: '2026-08-26T15:00:00' }
        ]);
        const element = setup({ days: week, events });
        await flush();
        const days = element.shadowRoot.querySelectorAll('c-cal-agenda-day');
        expect(days).toHaveLength(2);
        expect(days[0].events.map((e) => e.id)).toEqual(['a']);
        expect(days[1].events.map((e) => e.id)).toEqual(['b']);
    });

    it('lists a multi-day event under each day it covers', async () => {
        const events = normalizeEvents([
            {
                id: 'trip',
                title: 'Trip',
                start: '2026-08-24T00:00:00',
                end: '2026-08-26T00:00:00',
                allDay: true
            }
        ]);
        const element = setup({ days: week, events });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-agenda-day')).toHaveLength(2); // Mon + Tue
    });

    it('orders each day chronologically', async () => {
        const events = normalizeEvents([
            { id: 'late', title: 'Late', start: '2026-08-24T16:00:00', end: '2026-08-24T17:00:00' },
            { id: 'early', title: 'Early', start: '2026-08-24T08:00:00', end: '2026-08-24T09:00:00' }
        ]);
        const element = setup({ days: week, events });
        await flush();
        const day = element.shadowRoot.querySelector('c-cal-agenda-day');
        expect(day.events.map((e) => e.id)).toEqual(['early', 'late']);
    });

    it('shows an empty state when nothing falls in the range', async () => {
        const element = setup({ days: week, events: [] });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-agenda-day')).toBeNull();
        expect(element.shadowRoot.querySelector('.agenda__empty')).not.toBeNull();
    });

    it('flags today', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const events = normalizeEvents([
            {
                id: 'now',
                title: 'Today event',
                start: new Date(today.getTime() + 9 * 3600000).toISOString(),
                end: new Date(today.getTime() + 10 * 3600000).toISOString()
            }
        ]);
        const element = setup({ days: [today], events });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-agenda-day').isToday).toBe(true);
    });
});
