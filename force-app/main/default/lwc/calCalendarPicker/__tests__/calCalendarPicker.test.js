import { createElement } from 'lwc';
import CalCalendarPicker from 'c/calCalendarPicker';

function setup(props = {}) {
    const element = createElement('c-cal-calendar-picker', { is: CalCalendarPicker });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

const calendars = [
    { id: 'a', label: 'My Team', color: '#1b96ff', isMine: true },
    { id: 'b', label: 'Company', color: '#9050e9', isMine: false },
    { id: 'c', label: 'On-call', color: '#fe9339', isMine: false }
];

describe('c-cal-calendar-picker', () => {
    it('groups calendars into mine and shared', () => {
        const element = setup({ calendars, selectedIds: ['a'] });
        return Promise.resolve().then(() => {
            const headings = [...element.shadowRoot.querySelectorAll('.picker__heading')].map(
                (h) => h.textContent
            );
            expect(headings).toEqual(['My calendars', 'Shared calendars']);
            const boxes = element.shadowRoot.querySelectorAll('input[type="checkbox"]');
            expect(boxes).toHaveLength(3);
        });
    });

    it('emits calendarselectionchange when a calendar is toggled on', () => {
        const element = setup({ calendars, selectedIds: ['a'] });
        const handler = jest.fn();
        element.addEventListener('calendarselectionchange', handler);
        return Promise.resolve().then(() => {
            const box = element.shadowRoot.querySelector('input[data-id="b"]');
            box.checked = true;
            box.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail.selectedIds.sort()).toEqual(['a', 'b']);
        });
    });

    it('reassigns primary when the current primary is deselected', () => {
        const element = setup({ calendars, selectedIds: ['a', 'b'], primaryId: 'a' });
        const primaryHandler = jest.fn();
        element.addEventListener('primarychange', primaryHandler);
        return Promise.resolve().then(() => {
            const box = element.shadowRoot.querySelector('input[data-id="a"]');
            box.checked = false;
            box.dispatchEvent(new CustomEvent('change'));
            expect(primaryHandler.mock.calls[0][0].detail.primaryId).toBe('b');
        });
    });

    it('emits primarychange from the primary radio', () => {
        const element = setup({ calendars, selectedIds: ['a', 'b'], primaryId: 'a' });
        const handler = jest.fn();
        element.addEventListener('primarychange', handler);
        return Promise.resolve().then(() => {
            const radio = element.shadowRoot.querySelector('input[type="radio"][data-id="b"]');
            radio.checked = true;
            radio.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail.primaryId).toBe('b');
        });
    });

    it('renders nothing without calendars', () => {
        const element = setup({ calendars: [] });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.picker')).toBeNull();
        });
    });
});
