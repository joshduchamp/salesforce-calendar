import { createElement } from 'lwc';
import CalSchedulerColumn from 'c/calSchedulerColumn';
import { normalizeEvents } from 'c/calCore';

function setup(props = {}) {
    const element = createElement('c-cal-scheduler-column', { is: CalSchedulerColumn });
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

const day = new Date(2026, 7, 29);
const evt = (id, startHour, endHour) => ({
    id,
    title: id,
    start: `2026-08-29T${String(startHour).padStart(2, '0')}:00:00`,
    end: `2026-08-29T${String(endHour).padStart(2, '0')}:00:00`,
    color: '#1b96ff'
});

describe('c-cal-scheduler-column', () => {
    it('positions an event from its start/end within the full-day window', async () => {
        const element = setup({
            day,
            events: normalizeEvents([evt('a', 9, 11)]),
            startHour: 0,
            endHour: 24
        });
        await flush();
        const slot = element.shadowRoot.querySelector('.column__slot');
        expect(slot.style.top).toBe('37.5%');
        expect(parseFloat(slot.style.height)).toBeCloseTo(8.333, 2);
        expect(slot.style.left).toBe('0%');
        expect(slot.style.width).toBe('100%');
    });

    it('rescales positions to a working-hours window', async () => {
        const element = setup({
            day,
            events: normalizeEvents([evt('a', 9, 10)]),
            startHour: 8,
            endHour: 18
        });
        await flush();
        const slot = element.shadowRoot.querySelector('.column__slot');
        expect(slot.style.top).toBe('10%'); // (9-8)/10
        expect(slot.style.height).toBe('10%');
    });

    it('splits overlapping events into side-by-side slots', async () => {
        const element = setup({
            day,
            events: normalizeEvents([evt('a', 9, 11), evt('b', 10, 12)]),
            startHour: 0,
            endHour: 24
        });
        await flush();
        const slots = [...element.shadowRoot.querySelectorAll('.column__slot')];
        expect(slots).toHaveLength(2);
        expect(slots.map((s) => s.style.width)).toEqual(['50%', '50%']);
        expect(slots.map((s) => s.style.left).sort()).toEqual(['0%', '50%']);
    });

    it('renders a scheduler event per slot', async () => {
        const element = setup({
            day,
            events: normalizeEvents([evt('a', 9, 10)])
        });
        await flush();
        expect(element.shadowRoot.querySelectorAll('c-cal-scheduler-event')).toHaveLength(1);
    });

    it('passes each event its overlap column count', async () => {
        const element = setup({
            day,
            events: normalizeEvents([evt('a', 9, 11), evt('b', 10, 12)])
        });
        await flush();
        const counts = [...element.shadowRoot.querySelectorAll('c-cal-scheduler-event')].map(
            (e) => e.columnCount
        );
        expect(counts).toEqual([2, 2]);
    });
});
