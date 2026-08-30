import { LightningElement, api } from 'lwc';
import { visibleRange, eachDay } from 'c/calCore';

/**
 * Week view: resolves its 7 (or 5, with weekends hidden) days and hands them to
 * the chosen layout. Only the scheduler layout exists so far; the condensed
 * (agenda) layout lands in a later phase.
 */
export default class CalWeekView extends LightningElement {
    /** Prepared events overlapping the visible range, decorated with a `color`. */
    @api events = [];

    @api
    get date() {
        return this._date;
    }
    set date(value) {
        this._date = value ? new Date(value) : new Date();
    }

    @api firstDayOfWeek = 0;
    @api hideWeekends = false;
    @api layout = 'scheduler';
    @api fieldConfig;
    @api locale;
    @api schedulerStartHour = 0;
    @api schedulerEndHour = 24;

    _date = new Date();

    get days() {
        const { start, end } = visibleRange('week', this._date, {
            firstDayOfWeek: Number(this.firstDayOfWeek)
        });
        return eachDay(start, end, { hideWeekends: this.hideWeekends });
    }

    get isCondensed() {
        return this.layout === 'condensed';
    }
}
