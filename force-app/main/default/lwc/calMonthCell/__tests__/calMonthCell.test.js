import { createElement } from 'lwc';
import CalMonthCell from 'c/calMonthCell';

function setup(props = {}) {
    const element = createElement('c-cal-month-cell', { is: CalMonthCell });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllTimers();
});

const makeEvents = (count) =>
    Array.from({ length: count }, (_, i) => ({
        id: `e${i}`,
        title: `Event ${i}`,
        start: new Date(2026, 7, 29, 9 + i),
        end: new Date(2026, 7, 29, 10 + i),
        allDay: false,
        color: '#1b96ff',
        meta: {}
    }));

describe('c-cal-month-cell', () => {
    it('shows the day number', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: [] });
        await flush();
        expect(element.shadowRoot.querySelector('.cell__date').textContent.trim()).toBe('29');
    });

    it('caps chips at maxVisible and shows the overflow count', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(7), maxVisible: 3 });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-event-chip')).toHaveLength(3);
        expect(element.shadowRoot.querySelector('.cell__more').textContent.trim()).toBe('+4 more');
    });

    it('omits the overflow button when everything fits', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(2), maxVisible: 4 });
        await flush();
        expect(element.shadowRoot.querySelector('.cell__more')).toBeNull();
    });

    it('shows every event up to the cap before "+N more" appears', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(3), maxVisible: 4 });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-event-chip')).toHaveLength(3);
        expect(element.shadowRoot.querySelector('.cell__more')).toBeNull();

        element.events = makeEvents(6);
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-event-chip')).toHaveLength(4);
        expect(element.shadowRoot.querySelector('.cell__more').textContent.trim()).toBe('+2 more');
    });

    it('renders month chips in dense mode', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(2) });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-event-chip').dense).toBe(true);
    });

    it('drills to the day view from the overflow button', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(7), maxVisible: 3 });
        const handler = jest.fn();
        element.addEventListener('showday', handler);
        await flush();
        element.shadowRoot.querySelector('.cell__more').click();
        expect(handler).toHaveBeenCalled();
        expect(new Date(handler.mock.calls[0][0].detail.date).getDate()).toBe(29);
    });

    it('drills to the day view from the date button', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: [] });
        const handler = jest.fn();
        element.addEventListener('showday', handler);
        await flush();
        element.shadowRoot.querySelector('.cell__date').click();
        expect(handler).toHaveBeenCalled();
    });

    it('opens the events popover on hover of the overflow button', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(7), maxVisible: 3 });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-day-events-popover')).toBeNull();

        element.shadowRoot.querySelector('.cell__more').dispatchEvent(new CustomEvent('mouseenter'));
        await flush();

        const popover = element.shadowRoot.querySelector('c-cal-day-events-popover');
        expect(popover).not.toBeNull();
        expect(popover.events).toHaveLength(7);
    });

    it('closes the popover on its close event', async () => {
        jest.useFakeTimers();
        const element = setup({ day: new Date(2026, 7, 29), events: makeEvents(7), maxVisible: 3 });
        await flush();
        element.shadowRoot.querySelector('.cell__more').dispatchEvent(new CustomEvent('mouseenter'));
        await flush();

        element.shadowRoot
            .querySelector('c-cal-day-events-popover')
            .dispatchEvent(new CustomEvent('close'));
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-day-events-popover')).toBeNull();
        jest.useRealTimers();
    });

    it('marks today', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: [], isToday: true });
        await flush();
        expect(element.shadowRoot.querySelector('.cell').classList).toContain('cell--today');
    });

    it('renders chips from chipEvents but the popover from the full day list', async () => {
        const all = makeEvents(5);
        const element = setup({
            day: new Date(2026, 7, 29),
            events: all,
            chipEvents: all.slice(0, 2),
            maxVisible: 4
        });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-event-chip')).toHaveLength(2);
        expect(element.shadowRoot.querySelector('.cell__more')).toBeNull();

        element.shadowRoot.querySelector('.cell__date').dispatchEvent(new CustomEvent('click'));
        await flush();
    });

    it('reserves lane space for the week\'s spanning bars', async () => {
        const element = setup({ day: new Date(2026, 7, 29), events: [], reservedLanes: 3 });
        await flush();
        expect(element.shadowRoot.querySelector('.cell__lanes').style.cssText).toContain(
            '--cal-lanes: 3'
        );
    });
});
