import { createElement } from 'lwc';
import CalWeekView from 'c/calWeekView';

function setup(props = {}) {
    const element = createElement('c-cal-week-view', { is: CalWeekView });
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

describe('c-cal-week-view', () => {
    it('hands the scheduler seven days', async () => {
        const element = setup({ date: new Date(2026, 7, 26), events: [] });
        await flush();
        const scheduler = element.shadowRoot.querySelector('c-cal-scheduler');
        expect(scheduler).not.toBeNull();
        expect(scheduler.days).toHaveLength(7);
    });

    it('drops weekends when asked', async () => {
        const element = setup({ date: new Date(2026, 7, 26), events: [], hideWeekends: true });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-scheduler').days).toHaveLength(5);
    });

    it('renders the agenda for the condensed layout', async () => {
        const element = setup({ date: new Date(2026, 7, 26), events: [], layout: 'condensed' });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-scheduler')).toBeNull();
        const agenda = element.shadowRoot.querySelector('c-cal-agenda');
        expect(agenda).not.toBeNull();
        expect(agenda.days).toHaveLength(7);
    });

    it('honors the first day of week', async () => {
        const element = setup({ date: new Date(2026, 7, 26), events: [], firstDayOfWeek: 1 });
        await flush();
        const days = element.shadowRoot.querySelector('c-cal-scheduler').days;
        expect(days[0].getDay()).toBe(1); // Monday
    });
});
