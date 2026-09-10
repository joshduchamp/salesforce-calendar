import { LightningElement, api } from 'lwc';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The per-user display-chrome form for the calendar workspace: first day of
 * week, weekend visibility, scheduler hour window, month-cell event cap, legend
 * toggles, and locale. Controlled and presentational — every value comes in via
 * `@api`; each change emits `settingschange` with `{ <key>: <value> }` for the
 * one field that changed. The workspace owns persistence.
 */
export default class CalDisplaySettings extends LightningElement {
    @api firstDayOfWeek = 0;
    @api hideWeekends = false;
    @api schedulerStartHour = 0;
    @api schedulerEndHour = 24;
    @api maxEventsPerDay = 3;
    @api hideLegend = false;
    @api showLegendCounts = false;
    @api locale = '';

    get firstDayOptions() {
        return WEEKDAYS.map((label, value) => ({ label, value: String(value) }));
    }

    get firstDayValue() {
        return String(this.firstDayOfWeek == null ? 0 : this.firstDayOfWeek);
    }

    handleFirstDay(event) {
        this.emit('firstDayOfWeek', Number(event.detail.value));
    }

    handleHideWeekends(event) {
        this.emit('hideWeekends', event.target.checked);
    }

    handleStartHour(event) {
        this.emit('schedulerStartHour', this.toHour(event.target.value));
    }

    handleEndHour(event) {
        this.emit('schedulerEndHour', this.toHour(event.target.value));
    }

    handleMaxEvents(event) {
        const n = parseInt(event.target.value, 10);
        this.emit('maxEventsPerDay', Number.isNaN(n) ? null : n);
    }

    handleHideLegend(event) {
        this.emit('hideLegend', event.target.checked);
    }

    handleShowCounts(event) {
        this.emit('showLegendCounts', event.target.checked);
    }

    handleLocale(event) {
        this.emit('locale', event.target.value.trim());
    }

    toHour(raw) {
        const n = parseInt(raw, 10);
        return Number.isNaN(n) ? null : n;
    }

    emit(key, value) {
        this.dispatchEvent(new CustomEvent('settingschange', { detail: { [key]: value } }));
    }
}