import { createElement } from 'lwc';
import CalEventPopover from 'c/calEventPopover';
import { normalizeEvent } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-event-popover', { is: CalEventPopover });
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

const decorate = (raw, extra) => Object.assign(normalizeEvent(raw), extra);

describe('c-cal-event-popover', () => {
    it('shows the title, a when line, the calendar and every configured field', async () => {
        const event = decorate(
            {
                id: 'e1',
                title: 'Sprint planning',
                start: '2026-08-31T09:00:00',
                end: '2026-08-31T10:30:00',
                meta: { location: 'Room 4', owner: 'Dana' }
            },
            { color: '#2e844a', calendarLabel: 'Team' }
        );
        const element = setup({
            event,
            locale: 'en-US',
            anchor: { top: 100, bottom: 120, left: 50, right: 200 },
            fieldConfig: [
                { key: 'location', label: 'Where', showLabel: false },
                { key: 'owner', label: 'Owner', showLabel: true, views: ['scheduler'] }
            ]
        });
        await flush();

        expect(element.shadowRoot.querySelector('.pop__title').textContent).toBe('Sprint planning');
        expect(element.shadowRoot.querySelector('.pop__when').textContent).toContain('9 AM');
        expect(element.shadowRoot.querySelector('.pop__cal').textContent).toBe('Team');

        const labels = [...element.shadowRoot.querySelectorAll('.pop__label')].map((n) =>
            n.textContent.trim()
        );
        // both fields regardless of their `views` restriction
        expect(labels).toEqual(['Where', 'Owner']);
    });

    it('labels an all-day event', async () => {
        const event = decorate({
            id: 'e2',
            title: 'Holiday',
            start: '2026-08-31T00:00:00',
            end: '2026-08-31T23:59:59',
            allDay: true
        });
        const element = setup({ event, locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelector('.pop__when').textContent).toContain('All day');
    });

    it('sits to the right of the anchor, top-aligned, and carries the event color', async () => {
        const event = decorate(
            { id: 'e3', title: 'X', start: '2026-08-31T09:00:00', end: '2026-08-31T10:00:00' },
            { color: '#c9394a' }
        );
        const element = setup({
            event,
            anchor: { top: 100, bottom: 130, left: 40, right: 180 }
        });
        await flush();
        const style = element.shadowRoot.querySelector('.pop').style.cssText;
        expect(style).toContain('left: 188px'); // anchor.right + 8
        expect(style).toContain('top: 100px'); // anchor.top
        expect(style).toContain('#c9394a');
    });

    it('flips to the left of the anchor when the right has no room', async () => {
        const event = decorate({
            id: 'e5',
            title: 'X',
            start: '2026-08-31T09:00:00',
            end: '2026-08-31T10:00:00'
        });
        // anchor hard against the right edge of the default 1024px jsdom viewport
        const element = setup({ event, anchor: { top: 100, bottom: 130, left: 900, right: 1000 } });
        await flush();
        const style = element.shadowRoot.querySelector('.pop').style.cssText;
        expect(style).toContain('left: 628px'); // 900 - 264 - 8
    });

    it('pins to the bottom edge when the anchor sits low in the viewport', async () => {
        const event = decorate({
            id: 'e6',
            title: 'X',
            start: '2026-08-31T09:00:00',
            end: '2026-08-31T10:00:00'
        });
        const element = setup({ event, anchor: { top: 700, bottom: 730, left: 40, right: 180 } });
        await flush();
        const style = element.shadowRoot.querySelector('.pop').style.cssText;
        expect(style).toContain('bottom: 38px'); // 768 - 730
        expect(style).not.toContain('top:');
    });

    it('omits the field list when nothing is configured', async () => {
        const event = decorate({
            id: 'e4',
            title: 'X',
            start: '2026-08-31T09:00:00',
            end: '2026-08-31T10:00:00'
        });
        const element = setup({ event });
        await flush();
        expect(element.shadowRoot.querySelector('.pop__fields')).toBeNull();
    });
});
