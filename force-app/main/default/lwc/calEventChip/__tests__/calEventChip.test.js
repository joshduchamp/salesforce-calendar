import { createElement } from 'lwc';
import CalEventChip from 'c/calEventChip';

function setup(props = {}) {
    const element = createElement('c-cal-event-chip', { is: CalEventChip });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

const baseEvent = {
    id: 'e1',
    title: 'Sprint planning',
    start: new Date(2026, 7, 29, 9, 0),
    end: new Date(2026, 7, 29, 10, 0),
    allDay: false,
    color: '#1b96ff',
    meta: { location: 'Room 4', owner: 'Dana' }
};

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

describe('c-cal-event-chip', () => {
    it('renders the title and a time prefix for timed events', async () => {
        const element = setup({ event: baseEvent, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.chip__title').textContent).toContain(
            'Sprint planning'
        );
        expect(element.shadowRoot.querySelector('.chip__time')).not.toBeNull();
    });

    it('hides the time for all-day events', async () => {
        const element = setup({
            event: { ...baseEvent, allDay: true },
            locale: 'en-US'
        });
        await flush();
        expect(element.shadowRoot.querySelector('.chip__time')).toBeNull();
    });

    it('renders configured fields for the current view', async () => {
        const element = setup({
            event: baseEvent,
            view: 'month',
            fieldConfig: [{ key: 'location' }, { key: 'owner', views: ['scheduler'] }]
        });
        await flush();
        const fields = [...element.shadowRoot.querySelectorAll('.chip__field')].map((n) =>
            n.textContent.trim()
        );
        expect(fields).toEqual(['Room 4']);
    });

    it('drops the field sub-line in dense mode', async () => {
        const element = setup({
            event: baseEvent,
            view: 'month',
            dense: true,
            fieldConfig: [{ key: 'location' }]
        });
        await flush();
        expect(element.shadowRoot.querySelector('.chip__fields')).toBeNull();
        expect(element.shadowRoot.querySelector('.chip').classList).toContain('chip_dense');
    });

    it('applies the resolved color as a custom property', async () => {
        const element = setup({ event: baseEvent });
        await flush();
        expect(element.shadowRoot.querySelector('.chip').getAttribute('style')).toContain(
            '--cal-chip-color: #1b96ff'
        );
    });

    it('emits eventselect on click and eventopen on double click', async () => {
        const element = setup({ event: baseEvent });
        const select = jest.fn();
        const open = jest.fn();
        element.addEventListener('eventselect', select);
        element.addEventListener('eventopen', open);
        await flush();
        const chip = element.shadowRoot.querySelector('.chip');
        chip.click();
        chip.dispatchEvent(new CustomEvent('dblclick'));
        expect(select.mock.calls[0][0].detail).toEqual({ eventId: 'e1' });
        expect(open.mock.calls[0][0].detail).toEqual({ eventId: 'e1' });
    });
});
