import { createElement } from 'lwc';
import CalDayView from 'c/calDayView';

function setup(props = {}) {
    const element = createElement('c-cal-day-view', { is: CalDayView });
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

describe('c-cal-day-view', () => {
    it('hands the scheduler a single day', async () => {
        const element = setup({ date: new Date(2026, 7, 29, 15), events: [] });
        await flush();
        const scheduler = element.shadowRoot.querySelector('c-cal-scheduler');
        expect(scheduler.days).toHaveLength(1);
        expect(scheduler.days[0]).toEqual(new Date(2026, 7, 29, 0, 0, 0, 0));
    });

    it('renders the agenda for the condensed layout', async () => {
        const element = setup({ date: new Date(2026, 7, 29), events: [], layout: 'condensed' });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-scheduler')).toBeNull();
        const agenda = element.shadowRoot.querySelector('c-cal-agenda');
        expect(agenda).not.toBeNull();
        expect(agenda.days).toHaveLength(1);
    });

    it('passes the scheduler hour window through', async () => {
        const element = setup({
            date: new Date(2026, 7, 29),
            events: [],
            schedulerStartHour: 7,
            schedulerEndHour: 19
        });
        await flush();
        const scheduler = element.shadowRoot.querySelector('c-cal-scheduler');
        expect(Number(scheduler.startHour)).toBe(7);
        expect(Number(scheduler.endHour)).toBe(19);
    });
});
