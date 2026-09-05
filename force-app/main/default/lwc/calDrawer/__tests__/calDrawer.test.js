import { createElement } from 'lwc';
import CalDrawer from 'c/calDrawer';

function setup(props = {}) {
    const element = createElement('c-cal-drawer', { is: CalDrawer });
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

describe('c-cal-drawer', () => {
    it('renders nothing while closed', async () => {
        const element = setup({ label: 'Filters' });
        await flush();
        expect(element.shadowRoot.querySelector('.drawer')).toBeNull();
    });

    it('renders the panel and projected content when open', async () => {
        const element = setup({ label: 'Filters', open: true });
        await flush();
        const panel = element.shadowRoot.querySelector('.drawer__panel');
        expect(panel).not.toBeNull();
        expect(panel.getAttribute('aria-label')).toBe('Filters');
        expect(element.shadowRoot.querySelector('slot')).not.toBeNull();
    });

    it('defaults to a left, medium panel', async () => {
        const element = setup({ open: true });
        await flush();
        const panel = element.shadowRoot.querySelector('.drawer__panel');
        expect(panel.classList).toContain('drawer_left');
        expect(panel.classList).toContain('drawer_medium');
    });

    it('honors side and size', async () => {
        const element = setup({ open: true, side: 'right', size: 'large' });
        await flush();
        const panel = element.shadowRoot.querySelector('.drawer__panel');
        expect(panel.classList).toContain('drawer_right');
        expect(panel.classList).toContain('drawer_large');
    });

    it('emits close on a backdrop click', async () => {
        const element = setup({ open: true });
        const handler = jest.fn();
        element.addEventListener('close', handler);
        await flush();
        element.shadowRoot.querySelector('.drawer__backdrop').click();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits close on the close button', async () => {
        const element = setup({ open: true });
        const handler = jest.fn();
        element.addEventListener('close', handler);
        await flush();
        element.shadowRoot
            .querySelector('lightning-button-icon')
            .dispatchEvent(new CustomEvent('click'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits close on Escape only while open', async () => {
        const element = setup({ open: true });
        const handler = jest.fn();
        element.addEventListener('close', handler);
        await flush();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(handler).toHaveBeenCalledTimes(1);

        element.open = false;
        await flush();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(handler).toHaveBeenCalledTimes(1);
    });
});