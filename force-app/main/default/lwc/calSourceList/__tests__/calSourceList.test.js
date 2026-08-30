import { createElement } from 'lwc';
import CalSourceList from 'c/calSourceList';

function setup(props = {}) {
    const element = createElement('c-cal-source-list', { is: CalSourceList });
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
    { id: 'team', label: 'Team', color: '#1b96ff', visible: true },
    { id: 'personal', label: 'Personal', color: '#9050e9', visible: true },
    { id: 'oncall', label: 'On-call', color: '#fe9339', visible: false }
];

describe('c-cal-source-list', () => {
    it('renders one checkbox per calendar with initial state', () => {
        const element = setup({ calendars });
        return Promise.resolve().then(() => {
            const boxes = element.shadowRoot.querySelectorAll('input[type="checkbox"]');
            expect(boxes).toHaveLength(3);
            const state = {};
            boxes.forEach((box) => {
                state[box.dataset.id] = box.checked;
            });
            expect(state).toEqual({ team: true, personal: true, oncall: false });
        });
    });

    it('emits calendarvisibilitychange with the remaining visible ids', () => {
        const element = setup({ calendars });
        const handler = jest.fn();
        element.addEventListener('calendarvisibilitychange', handler);
        return Promise.resolve().then(() => {
            const teamBox = element.shadowRoot.querySelector('input[data-id="team"]');
            teamBox.checked = false;
            teamBox.dispatchEvent(new CustomEvent('change'));

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail).toEqual({
                calendarId: 'team',
                visible: false,
                visibleCalendarIds: ['personal']
            });
        });
    });

    it('renders nothing without calendars', () => {
        const element = setup({ calendars: [] });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.sources')).toBeNull();
        });
    });
});
