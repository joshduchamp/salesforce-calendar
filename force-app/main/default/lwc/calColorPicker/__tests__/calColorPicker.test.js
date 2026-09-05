import { createElement } from 'lwc';
import CalColorPicker from 'c/calColorPicker';

function setup(props = {}) {
    const element = createElement('c-cal-color-picker', { is: CalColorPicker });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

function flush() {
    return Promise.resolve();
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

describe('c-cal-color-picker', () => {
    it('names a known swatch and shows its label', async () => {
        const element = setup({ value: '#1b96ff', label: 'Color' });
        await flush();
        expect(element.shadowRoot.querySelector('.field-label').textContent).toBe('Color');
        expect(element.shadowRoot.querySelector('.trigger .name').textContent).toBe('Sky');
    });

    it('calls an off-palette hex "Custom"', async () => {
        const element = setup({ value: '#123456' });
        await flush();
        expect(element.shadowRoot.querySelector('.trigger .name').textContent).toBe('Custom');
    });

    it('opens the panel and picks a swatch by sight', async () => {
        const element = setup({ value: '#1b96ff' });
        const change = jest.fn();
        element.addEventListener('change', change);

        element.shadowRoot.querySelector('.trigger').click();
        await flush();
        const crimson = element.shadowRoot.querySelector('[data-hex="#ba0517"]');
        crimson.click();
        await flush();

        expect(change.mock.calls[0][0].detail.value).toBe('#ba0517');
        expect(element.shadowRoot.querySelector('.panel')).toBeNull();
    });

    it('emits the native picker value for a custom color', async () => {
        const element = setup({ value: '#1b96ff' });
        const change = jest.fn();
        element.addEventListener('change', change);

        element.shadowRoot.querySelector('.trigger').click();
        await flush();
        const native = element.shadowRoot.querySelector('input[type="color"]');
        native.value = '#0a0a0a';
        native.dispatchEvent(new CustomEvent('change'));

        expect(change.mock.calls[0][0].detail.value).toBe('#0a0a0a');
    });

    it('closes the panel when focus leaves the picker', async () => {
        const element = setup({ value: '#1b96ff' });
        element.shadowRoot.querySelector('.trigger').click();
        await flush();
        expect(element.shadowRoot.querySelector('.panel')).not.toBeNull();

        element.shadowRoot.querySelector('.picker').dispatchEvent(new FocusEvent('focusout'));
        await flush();
        expect(element.shadowRoot.querySelector('.panel')).toBeNull();
    });
});