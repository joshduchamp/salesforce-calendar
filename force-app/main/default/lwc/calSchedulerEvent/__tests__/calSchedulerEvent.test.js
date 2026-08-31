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
    allDay: false,
    meta: { location: 'Room 4', owner: 'Dana' }
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

    it('shows the time on its own line when there are no fields to show', async () => {
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.event__time')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.event__fields')).toBeNull();
    });

    it('renders configured fields in place of the time line', async () => {
        const element = setup({
            event,
            fieldConfig: [
                { key: 'owner', label: 'Owner', showLabel: true },
                { key: 'location', views: ['month'] }
            ]
        });
        await flush();
        const fields = [...element.shadowRoot.querySelectorAll('.event__field')].map((n) =>
            n.textContent.trim()
        );
        expect(fields).toEqual(['Owner:Dana']); // location is month-only
        expect(element.shadowRoot.querySelector('.event__time')).toBeNull();
    });

    it('shows only the title when the block shares its column width', async () => {
        const element = setup({
            event,
            columnCount: 2,
            fieldConfig: [{ key: 'owner', showLabel: true }]
        });
        await flush();
        expect(element.shadowRoot.querySelector('.event__title').textContent).toBe('Sprint planning');
        expect(element.shadowRoot.querySelector('.event__time')).toBeNull();
        expect(element.shadowRoot.querySelector('.event__fields')).toBeNull();
    });

    it('drops the field line for events too short to fit it', async () => {
        const element = setup({
            event: {
                id: 's1',
                title: 'Standup',
                start: new Date(2026, 7, 29, 9, 0),
                end: new Date(2026, 7, 29, 9, 15),
                color: '#1b96ff',
                meta: { owner: 'Dana' }
            },
            fieldConfig: [{ key: 'owner', showLabel: false }]
        });
        await flush();
        expect(element.shadowRoot.querySelector('.event__fields')).toBeNull();
    });

    it('emits eventopen on double click', async () => {
        const element = setup({ event });
        const handler = jest.fn();
        document.body.addEventListener('eventopen', handler);
        await flush();
        element.shadowRoot.querySelector('.event').dispatchEvent(new CustomEvent('dblclick'));
        expect(handler).toHaveBeenCalled();
    });

    it('emits eventhover / eventhoverend on pointer enter and leave', async () => {
        const element = setup({ event });
        const hover = jest.fn();
        const end = jest.fn();
        document.body.addEventListener('eventhover', hover);
        document.body.addEventListener('eventhoverend', end);
        await flush();
        const box = element.shadowRoot.querySelector('.event');
        box.dispatchEvent(new CustomEvent('mouseenter'));
        box.dispatchEvent(new CustomEvent('mouseleave'));
        expect(hover.mock.calls[0][0].detail.eventId).toBe('e1');
        expect(hover.mock.calls[0][0].detail.rect).toBeDefined();
        expect(end).toHaveBeenCalled();
    });
});
