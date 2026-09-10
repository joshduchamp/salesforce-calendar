import { createElement } from 'lwc';
import CalDisplaySettings from 'c/calDisplaySettings';

function setup(props = {}) {
    const element = createElement('c-cal-display-settings', { is: CalDisplaySettings });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

function field(element, prop) {
    return element.shadowRoot.querySelector(`[data-prop="${prop}"]`);
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

describe('c-cal-display-settings', () => {
    it('reflects the incoming values', () => {
        const element = setup({ firstDayOfWeek: 1, maxEventsPerDay: 5, locale: 'fr-FR' });
        return Promise.resolve().then(() => {
            expect(field(element, 'firstDayOfWeek').value).toBe('1');
            expect(field(element, 'maxEventsPerDay').value).toBe(5);
            expect(field(element, 'locale').value).toBe('fr-FR');
        });
    });

    it('emits a numeric firstDayOfWeek from the combobox', () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('settingschange', handler);
        return Promise.resolve().then(() => {
            field(element, 'firstDayOfWeek').dispatchEvent(
                new CustomEvent('change', { detail: { value: '6' } })
            );
            expect(handler.mock.calls[0][0].detail).toEqual({ firstDayOfWeek: 6 });
        });
    });

    it('emits a boolean from a toggle', () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('settingschange', handler);
        return Promise.resolve().then(() => {
            const toggle = field(element, 'hideWeekends');
            toggle.checked = true;
            toggle.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ hideWeekends: true });
        });
    });

    it('emits a parsed integer for max events per day', () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('settingschange', handler);
        return Promise.resolve().then(() => {
            const input = field(element, 'maxEventsPerDay');
            input.value = '8';
            input.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ maxEventsPerDay: 8 });
        });
    });

    it('emits null when an hour field is cleared', () => {
        const element = setup({ schedulerStartHour: 8 });
        const handler = jest.fn();
        element.addEventListener('settingschange', handler);
        return Promise.resolve().then(() => {
            const input = field(element, 'schedulerStartHour');
            input.value = '';
            input.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ schedulerStartHour: null });
        });
    });

    it('trims the locale', () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('settingschange', handler);
        return Promise.resolve().then(() => {
            const input = field(element, 'locale');
            input.value = '  en-GB  ';
            input.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ locale: 'en-GB' });
        });
    });
});