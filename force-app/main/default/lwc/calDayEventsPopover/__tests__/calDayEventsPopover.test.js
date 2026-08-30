import { createElement } from 'lwc';
import CalDayEventsPopover from 'c/calDayEventsPopover';

function setup(props = {}) {
    const element = createElement('c-cal-day-events-popover', { is: CalDayEventsPopover });
    Object.assign(element, {
        day: new Date(2026, 7, 29),
        events: [
            { id: 'a', title: 'A', start: new Date(2026, 7, 29, 9), end: new Date(2026, 7, 29, 10), allDay: false, color: '#1b96ff', meta: {} },
            { id: 'b', title: 'B', start: new Date(2026, 7, 29, 11), end: new Date(2026, 7, 29, 12), allDay: false, color: '#9050e9', meta: {} }
        ],
        anchor: { top: 100, bottom: 120, left: 50, right: 90 },
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
});

describe('c-cal-day-events-popover', () => {
    it('renders a chip per event and a date heading', async () => {
        const element = setup();
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-event-chip')).toHaveLength(2);
        expect(element.shadowRoot.querySelector('.popover__heading').textContent).toContain('29');
    });

    it('positions itself below the anchor by default', async () => {
        const element = setup();
        await flush();
        const style = element.shadowRoot.querySelector('.popover').getAttribute('style');
        expect(style).toContain('top: 124px'); // anchor.bottom + 4
        expect(style).toContain('left: 50px');
    });

    it('flips above the anchor when it would overflow the viewport', async () => {
        window.innerHeight = 200;
        const element = setup({ anchor: { top: 180, bottom: 195, left: 10, right: 40 } });
        await flush();
        const style = element.shadowRoot.querySelector('.popover').getAttribute('style');
        const top = Number(style.match(/top:\s*(-?\d+)px/)[1]);
        expect(top).toBeLessThan(180);
    });

    it('emits close on the close button', async () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('close', handler);
        await flush();
        element.shadowRoot.querySelector('.popover__close').click();
        expect(handler).toHaveBeenCalled();
    });

    it('emits pointer in/out on mouse enter/leave', async () => {
        const element = setup();
        const inHandler = jest.fn();
        const outHandler = jest.fn();
        element.addEventListener('pointerin', inHandler);
        element.addEventListener('pointerout', outHandler);
        await flush();
        const panel = element.shadowRoot.querySelector('.popover');
        panel.dispatchEvent(new CustomEvent('mouseenter'));
        panel.dispatchEvent(new CustomEvent('mouseleave'));
        expect(inHandler).toHaveBeenCalled();
        expect(outHandler).toHaveBeenCalled();
    });
});
