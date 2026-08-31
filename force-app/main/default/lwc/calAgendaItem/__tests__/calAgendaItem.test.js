import { createElement } from 'lwc';
import CalAgendaItem from 'c/calAgendaItem';
import { normalizeEvent } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-agenda-item', { is: CalAgendaItem });
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

describe('c-cal-agenda-item', () => {
    it('shows a start–end time range for timed events', async () => {
        const event = normalizeEvent({
            id: 'e1',
            title: 'Sync',
            start: '2026-08-24T09:00:00',
            end: '2026-08-24T10:30:00'
        });
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.item__time').textContent).toBe('9 AM – 10:30 AM');
    });

    it('shows "All day" for all-day events', async () => {
        const event = normalizeEvent({
            id: 'e2',
            title: 'Holiday',
            start: '2026-08-24T00:00:00',
            end: '2026-08-24T23:59:59',
            allDay: true
        });
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.item__time').textContent).toBe('All day');
    });

    it('shows "All day" for multi-day timed events', async () => {
        const event = normalizeEvent({
            id: 'e3',
            title: 'Conference',
            start: '2026-08-24T09:00:00',
            end: '2026-08-26T17:00:00'
        });
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.item__time').textContent).toBe('All day');
    });

    it('hands the event to a chip with the condensed view name', async () => {
        const event = normalizeEvent({
            id: 'e4',
            title: 'Sync',
            start: '2026-08-24T09:00:00',
            end: '2026-08-24T10:00:00'
        });
        const element = setup({ event });
        await flush();
        const chip = element.shadowRoot.querySelector('c-cal-event-chip');
        expect(chip.event.id).toBe('e4');
        expect(chip.view).toBe('condensed');
    });
});
