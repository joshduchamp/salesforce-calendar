import { createElement } from 'lwc';
import { getNavigateCalledWith, resetNavigation } from 'lightning/navigation';
import CalCalendar from 'c/calCalendar';

function setup(props = {}) {
    const element = createElement('c-cal-calendar', { is: CalCalendar });
    Object.assign(element, {
        calendars: [
            { id: 'team', label: 'Team', color: '#1b96ff', visible: true },
            { id: 'personal', label: 'Personal', color: '#9050e9', visible: true }
        ],
        ...props
    });
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    resetNavigation();
});

const eventsAround = () => {
    const today = new Date();
    const mk = (id, calendarId, dOff, meta = {}) => {
        const s = new Date(today);
        s.setDate(s.getDate() + dOff);
        s.setHours(9, 0, 0, 0);
        const e = new Date(s);
        e.setHours(10);
        return { id, calendarId, title: id, start: s.toISOString(), end: e.toISOString(), meta };
    };
    return [
        mk('team-a', 'team', 0, { status: 'Scheduled' }),
        mk('personal-a', 'personal', 1),
        mk('team-b', 'team', 2)
    ];
};

describe('c-cal-calendar', () => {
    it('renders the month view by default', async () => {
        const element = setup({ events: eventsAround() });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-month-view')).not.toBeNull();
        expect(element.shadowRoot.querySelector('c-cal-toolbar')).not.toBeNull();
    });

    it('emits rangechange on first render', async () => {
        const handler = jest.fn();
        const element = createElement('c-cal-calendar', { is: CalCalendar });
        element.calendars = [];
        element.addEventListener('rangechange', handler);
        document.body.appendChild(element);
        await flush();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.view).toBe('month');
        expect(typeof handler.mock.calls[0][0].detail.start).toBe('string');
    });

    it('switches views from the toolbar and re-emits rangechange', async () => {
        const element = setup({ events: eventsAround() });
        const range = jest.fn();
        const viewchange = jest.fn();
        element.addEventListener('rangechange', range);
        element.addEventListener('viewchange', viewchange);
        await flush();
        range.mockClear();

        element.shadowRoot
            .querySelector('c-cal-toolbar')
            .dispatchEvent(new CustomEvent('viewchange', { detail: { view: 'week' } }));
        await flush();

        expect(viewchange.mock.calls[0][0].detail).toEqual({ view: 'week' });
        expect(range).toHaveBeenCalled();
        expect(element.shadowRoot.querySelector('c-cal-week-view')).not.toBeNull();
    });

    it('filters events for hidden calendars', async () => {
        const element = setup({ events: eventsAround() });
        await flush();
        const monthView = element.shadowRoot.querySelector('c-cal-month-view');
        expect(monthView.events).toHaveLength(3);

        element.shadowRoot.querySelector('c-cal-source-list').dispatchEvent(
            new CustomEvent('calendarvisibilitychange', {
                detail: { calendarId: 'team', visible: false }
            })
        );
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-month-view').events).toHaveLength(1);
    });

    it('decorates events with a rule-based color', async () => {
        const element = setup({
            events: eventsAround(),
            colorRules: {
                rules: [{ key: 'status', value: 'Scheduled', color: '#0a0' }],
                defaultColor: '#ccc'
            }
        });
        await flush();
        const events = element.shadowRoot.querySelector('c-cal-month-view').events;
        expect(events.find((e) => e.id === 'team-a').color).toBe('#0a0');
        expect(events.find((e) => e.id === 'personal-a').color).toBe('#9050e9');
    });

    it('shows a legend for the color rules that matched visible events', async () => {
        const element = setup({
            events: eventsAround(),
            colorRules: {
                rules: [
                    { key: 'status', value: 'Scheduled', color: '#0a0', label: 'Scheduled' },
                    { key: 'status', value: 'Cancelled', color: '#c00', label: 'Cancelled' }
                ]
            }
        });
        await flush();
        const legend = element.shadowRoot.querySelector('c-cal-legend');
        expect(legend).not.toBeNull();
        expect(legend.entries).toHaveLength(1);
        expect(legend.entries[0]).toMatchObject({ label: 'Scheduled', color: '#0a0', count: 1 });
    });

    it('omits the legend when hide-legend is set', async () => {
        const element = setup({
            events: eventsAround(),
            hideLegend: true,
            colorRules: {
                rules: [{ key: 'status', value: 'Scheduled', color: '#0a0', label: 'Scheduled' }]
            }
        });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-legend')).toBeNull();
    });

    it('shows a hover card for the hovered event and hides it after leave', async () => {
        jest.useFakeTimers();
        const element = setup({ events: eventsAround() });
        await flush();

        const view = element.shadowRoot.querySelector('.calendar__view');
        view.dispatchEvent(
            new CustomEvent('eventhover', {
                detail: { eventId: 'team-a', rect: { top: 10, bottom: 30, left: 5, right: 90 } },
                bubbles: true
            })
        );
        await flush();

        const pop = element.shadowRoot.querySelector('c-cal-event-popover');
        expect(pop).not.toBeNull();
        expect(pop.event.id).toBe('team-a');
        expect(pop.anchor).toEqual({ top: 10, bottom: 30, left: 5, right: 90 });

        view.dispatchEvent(new CustomEvent('eventhoverend', { bubbles: true }));
        jest.runAllTimers();
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-event-popover')).toBeNull();
        jest.useRealTimers();
    });

    it('drills into the day view and navigates on eventopen with a recordId', async () => {
        const events = eventsAround();
        events[0].recordId = '001xx';
        const element = setup({ events });
        const open = jest.fn();
        element.addEventListener('eventopen', open);
        await flush();

        const view = element.shadowRoot.querySelector('.calendar__view');
        view.dispatchEvent(
            new CustomEvent('eventopen', {
                detail: { eventId: 'team-a' },
                bubbles: true
            })
        );
        expect(open).toHaveBeenCalled();
        expect(getNavigateCalledWith().pageReference).toEqual({
            type: 'standard__recordPage',
            attributes: { recordId: '001xx', actionName: 'view' }
        });
    });
});
