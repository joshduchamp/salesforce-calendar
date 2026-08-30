/**
 * Test mock for lightning/navigation that records Navigate/GenerateUrl calls.
 * Mirrors the pattern used by lwc-recipes. Wired via `moduleNameMapper` in
 * jest.config.js.
 */
const Navigate = Symbol('Navigate');
const GenerateUrl = Symbol('GenerateUrl');

let lastNavigateCall;

export const NavigationMixin = (Base) => {
    return class extends Base {
        [Navigate](pageReference, replace) {
            lastNavigateCall = { pageReference, replace };
        }

        [GenerateUrl](pageReference) {
            lastNavigateCall = { pageReference };
            return Promise.resolve('https://example.com/');
        }
    };
};
NavigationMixin.Navigate = Navigate;
NavigationMixin.GenerateUrl = GenerateUrl;

export const CurrentPageReference = jest.fn();

export function getNavigateCalledWith() {
    return lastNavigateCall;
}

export function resetNavigation() {
    lastNavigateCall = undefined;
}
