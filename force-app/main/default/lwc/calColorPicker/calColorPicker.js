import { LightningElement, api } from 'lwc';

/**
 * A color field an admin fills in by sight, not by hex code: a labelled swatch
 * that opens a panel of named colors, with a native picker for anything else.
 * Controlled — `value` comes in, `change` ({ value }) goes out.
 */

const SWATCHES = [
    { name: 'Blue', hex: '#0176d3' },
    { name: 'Sky', hex: '#1b96ff' },
    { name: 'Teal', hex: '#06a59a' },
    { name: 'Green', hex: '#2e844a' },
    { name: 'Lime', hex: '#3ba755' },
    { name: 'Yellow', hex: '#e4a201' },
    { name: 'Orange', hex: '#fe9339' },
    { name: 'Amber', hex: '#dd7a01' },
    { name: 'Red', hex: '#ea001e' },
    { name: 'Crimson', hex: '#ba0517' },
    { name: 'Pink', hex: '#e3066a' },
    { name: 'Magenta', hex: '#d426a5' },
    { name: 'Purple', hex: '#9050e9' },
    { name: 'Indigo', hex: '#5867e8' },
    { name: 'Slate', hex: '#5c5c66' },
    { name: 'Charcoal', hex: '#181818' }
];

const NAME_BY_HEX = new Map(SWATCHES.map((s) => [s.hex.toLowerCase(), s.name]));

export default class CalColorPicker extends LightningElement {
    /** Current color as a hex string (`#1b96ff`). */
    @api value;
    /** Field label shown above the swatch. */
    @api label;

    open = false;

    get normalized() {
        return (this.value || '').toLowerCase();
    }

    /** The chosen swatch's name, or "Custom" for a hand-picked hex. */
    get colorName() {
        if (!this.value) {
            return 'None';
        }
        return NAME_BY_HEX.get(this.normalized) || 'Custom';
    }

    get triggerStyle() {
        return `background-color: ${this.value || 'transparent'};`;
    }

    get swatches() {
        return SWATCHES.map((s) => ({
            ...s,
            style: `background-color: ${s.hex};`,
            selected: s.hex.toLowerCase() === this.normalized,
            cssClass: `swatch${s.hex.toLowerCase() === this.normalized ? ' selected' : ''}`
        }));
    }

    toggle() {
        this.open = !this.open;
    }

    /** Close when focus leaves the picker entirely (click-away / Tab out). */
    handleFocusOut(event) {
        const next = event.relatedTarget;
        if (!next || !this.template.contains(next)) {
            this.open = false;
        }
    }

    handleSwatch(event) {
        this.commit(event.currentTarget.dataset.hex);
        this.open = false;
    }

    handleCustom(event) {
        this.commit(event.target.value);
    }

    commit(hex) {
        this.dispatchEvent(new CustomEvent('change', { detail: { value: hex } }));
    }
}