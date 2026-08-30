import { createElement } from 'lwc';
import CalSchedulerEvent from 'c/calSchedulerEvent';

function setup(props = {}) {
    const element = createElement('c-cal-scheduler-event', { is: CalSchedulerEvent });
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

const event = {
    id: 'e1',
    title: 'Sprint planning',
    start: new Date(2026, 7, 29, 9, 0),
    end: new Date(2026, 7, 29, 10, 30),
    color: '#2e844a',
    allDay: false
};

describe('c-cal-scheduler-event', () => {
    it('shows the title and time range and applies the color', async () => {
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.event__title').textContent).toBe('Sprint planning');
        expect(element.shadowRoot.querySelector('.event__time').textContent).toBe('9 AM – 10:30 AM');
        expect(element.shadowRoot.querySelector('.event').style.cssText).toContain('#2e844a');
    });

    it('emits a bubbling, composed eventselect on click', async () => {
        const element = setup({ event });
        const handler = jest.fn();
        document.body.addEventListener('eventselect', handler);
        await flush();
        element.shadowRoot.querySelector('.event').click();
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail).toEqual({ eventId: 'e1' });
    });

    it('goes single-line for events shorter than 45 minutes', async () => {
        const short = {
            id: 's1',
            title: 'Standup',
            start: new Date(2026, 7, 29, 9, 0),
            end: new Date(2026, 7, 29, 9, 15),
            color: '#1b96ff',
            allDay: false
        };
        const element = setup({ event: short });
        await flush();
        expect(element.shadowRoot.querySelector('.event').classList).toContain('event_short');

        element.event = event; // 90 minutes
        await flush();
        expect(element.shadowRoot.querySelector('.event').classList).not.toContain('event_short');
    });

    it('emits eventopen on double click', async () => {
        const element = setup({ event });
        const handler = jest.fn();
        document.body.addEventListener('eventopen', handler);
        await flush();
        element.shadowRoot.querySelector('.event').dispatchEvent(new CustomEvent('dblclick'));
        expect(handler).toHaveBeenCalled();
    });
});
