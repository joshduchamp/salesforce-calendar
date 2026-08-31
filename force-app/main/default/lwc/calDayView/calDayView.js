import { LightningElement, api } from 'lwc';
import { startOfDay } from 'c/calCore';

/**
 * Day view: a single-day range handed to the chosen layout — `calScheduler` for
 * the time grid, `calAgenda` for the condensed list.
 */
export default class CalDayView extends LightningElement {
    /** Prepared events overlapping the visible range, decorated with a `color`. */
    @api events = [];

    @api
    get date() {
        return this._date;
    }
    set date(value) {
        this._date = value ? new Date(value) : new Date();
    }

    @api layout = 'scheduler';
    @api fieldConfig;
    @api locale;
    @api schedulerStartHour = 0;
    @api schedulerEndHour = 24;

    _date = new Date();

    get days() {
        return [startOfDay(this._date)];
    }

    get isCondensed() {
        return this.layout === 'condensed';
    }
}
