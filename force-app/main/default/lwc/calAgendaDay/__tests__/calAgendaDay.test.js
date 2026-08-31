import { createElement } from 'lwc';
import CalAgendaDay from 'c/calAgendaDay';
import { normalizeEvents } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-agenda-day', { is: CalAgendaDay });
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

const events = normalizeEvents([
    { id: 'a', title: 'Standup', start: '2026-08-24T09:00:00', end: '2026-08-24T09:15:00' },
    { id: 'b', title: 'Lunch', start: '2026-08-24T12:00:00', end: '2026-08-24T13:00:00' }
]);

describe('c-cal-agenda-day', () => {
    it('renders a heading and one item per event', async () => {
        const element = setup({ day: new Date(2026, 7, 24), events, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.agenda-day__weekday').textContent).toBe('Monday');
        expect(element.shadowRoot.querySelector('.agenda-day__date').textContent).toBe('Aug 24');
        expect(element.shadowRoot.querySelectorAll('c-cal-agenda-item')).toHaveLength(2);
    });

    it('marks the date when it is today', async () => {
        const element = setup({ day: new Date(2026, 7, 24), events, isToday: true });
        await flush();
        expect(
            element.shadowRoot
                .querySelector('.agenda-day__date')
                .classList.contains('agenda-day__date_today')
        ).toBe(true);
    });
});
