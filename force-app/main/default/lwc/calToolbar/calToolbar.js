import { LightningElement, api } from 'lwc';

/**
 * Calendar chrome: today / prev / next, the view switcher, the
 * condensed<->scheduler layout toggle, and the current-range title.
 * Emits intent only — it holds no state.
 */
export default class CalToolbar extends LightningElement {
    @api title;
    @api view = 'month';
    @api layout = 'scheduler';
    /** Whether the layout toggle applies to the current view (week/day only). */
    @api canToggleLayout = false;

    viewOptions = [
        { label: 'Month', value: 'month' },
        { label: 'Week', value: 'week' },
        { label: 'Day', value: 'day' }
    ];

    get views() {
        return this.viewOptions.map((option) => ({
            ...option,
            variant: option.value === this.view ? 'brand' : 'neutral'
        }));
    }

    get isCondensed() {
        return this.layout === 'condensed';
    }

    get layoutButtonLabel() {
        return this.isCondensed ? 'Scheduler' : 'Condensed';
    }

    get layoutButtonIcon() {
        return this.isCondensed ? 'utility:date_time' : 'utility:list';
    }

    handleToday() {
        this.dispatchEvent(new CustomEvent('today'));
    }

    handlePrev() {
        this.dispatchEvent(new CustomEvent('navigate', { detail: { direction: -1 } }));
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('navigate', { detail: { direction: 1 } }));
    }

    handleViewClick(event) {
        const nextView = event.target.dataset.view;
        if (nextView && nextView !== this.view) {
            this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: nextView } }));
        }
    }

    handleLayoutToggle() {
        const nextLayout = this.isCondensed ? 'scheduler' : 'condensed';
        this.dispatchEvent(new CustomEvent('layoutchange', { detail: { layout: nextLayout } }));
    }
}
