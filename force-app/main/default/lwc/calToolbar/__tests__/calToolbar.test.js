import { createElement } from 'lwc';
import CalToolbar from 'c/calToolbar';

function setup(props = {}) {
    const element = createElement('c-cal-toolbar', { is: CalToolbar });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

const viewButton = (element, label) =>
    [...element.shadowRoot.querySelectorAll('lightning-button-group lightning-button')].find(
        (button) => button.label === label
    );

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

describe('c-cal-toolbar', () => {
    it('renders the range title', async () => {
        const element = setup({ title: 'August 2026' });
        await flush();
        expect(element.shadowRoot.querySelector('.toolbar__title').textContent).toBe('August 2026');
    });

    it('emits navigate with a direction', async () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('navigate', handler);
        await flush();
        element.shadowRoot
            .querySelector('[data-action="next"]')
            .dispatchEvent(new CustomEvent('click'));
        expect(handler.mock.calls[0][0].detail).toEqual({ direction: 1 });
    });

    it('emits today', async () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('today', handler);
        await flush();
        element.shadowRoot
            .querySelector('[data-action="today"]')
            .dispatchEvent(new CustomEvent('click'));
        expect(handler).toHaveBeenCalled();
    });

    it('emits viewchange when a different view is chosen', async () => {
        const element = setup({ view: 'month' });
        const handler = jest.fn();
        element.addEventListener('viewchange', handler);
        await flush();
        viewButton(element, 'Week').dispatchEvent(new CustomEvent('click'));
        expect(handler.mock.calls[0][0].detail).toEqual({ view: 'week' });
    });

    it('does not emit viewchange for the current view', async () => {
        const element = setup({ view: 'month' });
        const handler = jest.fn();
        element.addEventListener('viewchange', handler);
        await flush();
        viewButton(element, 'Month').dispatchEvent(new CustomEvent('click'));
        expect(handler).not.toHaveBeenCalled();
    });

    it('hides the layout toggle unless allowed', async () => {
        const element = setup({ canToggleLayout: false });
        await flush();
        expect(element.shadowRoot.querySelector('[data-action="layout"]')).toBeNull();
    });

    it('emits layoutchange toggling from scheduler to condensed', async () => {
        const element = setup({ canToggleLayout: true, layout: 'scheduler' });
        const handler = jest.fn();
        element.addEventListener('layoutchange', handler);
        await flush();
        element.shadowRoot
            .querySelector('[data-action="layout"]')
            .dispatchEvent(new CustomEvent('click'));
        expect(handler.mock.calls[0][0].detail).toEqual({ layout: 'condensed' });
    });
});
