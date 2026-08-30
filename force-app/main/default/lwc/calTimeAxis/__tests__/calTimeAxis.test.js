import { createElement } from 'lwc';
import CalTimeAxis from 'c/calTimeAxis';

function setup(props = {}) {
    const element = createElement('c-cal-time-axis', { is: CalTimeAxis });
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

describe('c-cal-time-axis', () => {
    it('renders one label per hour in the window', async () => {
        const element = setup({ startHour: 8, endHour: 12, locale: 'en-US' });
        await flush();
        const labels = [...element.shadowRoot.querySelectorAll('.axis__label')].map((n) =>
            n.textContent
        );
        expect(labels).toEqual(['8 AM', '9 AM', '10 AM', '11 AM']);
    });

    it('defaults to a full day', async () => {
        const element = setup({ locale: 'en-US' });
        await flush();
        expect(element.shadowRoot.querySelectorAll('.axis__hour')).toHaveLength(24);
    });
});
