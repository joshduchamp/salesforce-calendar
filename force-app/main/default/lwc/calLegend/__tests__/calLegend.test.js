import { createElement } from 'lwc';
import CalLegend from 'c/calLegend';

function setup(props = {}) {
    const element = createElement('c-cal-legend', { is: CalLegend });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

const entries = [
    { index: 0, label: 'Scheduled', color: '#1b7', count: 3 },
    { index: 2, label: 'Cancelled', color: '#c23', count: 1 }
];

describe('c-cal-legend', () => {
    it('renders one row per entry with its swatch color', () => {
        const element = setup({ entries });
        return Promise.resolve().then(() => {
            const items = element.shadowRoot.querySelectorAll('.legend__item');
            expect(items).toHaveLength(2);
            expect(items[0].textContent).toContain('Scheduled');
            expect(items[0].getAttribute('style')).toContain('#1b7');
        });
    });

    it('hides counts by default and shows them when asked', () => {
        const element = setup({ entries });
        return Promise.resolve()
            .then(() => {
                expect(element.shadowRoot.querySelector('.legend__count')).toBeNull();
                element.showCounts = true;
            })
            .then(() => {
                const counts = [...element.shadowRoot.querySelectorAll('.legend__count')].map(
                    (n) => n.textContent
                );
                expect(counts).toEqual(['3', '1']);
            });
    });

    it('renders nothing without entries', () => {
        const element = setup({ entries: [] });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.legend')).toBeNull();
        });
    });
});
