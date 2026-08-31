import { LightningElement, api } from 'lwc';

/**
 * One day within the agenda layout: a sticky date heading in the gutter and the
 * day's events as `calAgendaItem` rows (already ordered by the parent). Purely
 * presentational.
 */
export default class CalAgendaDay extends LightningElement {
    /** Midnight Date for this day. */
    @api day;
    /** The day's events, in chronological order, decorated with a `color`. */
    @api events = [];
    /** True when this day is today. */
    @api isToday = false;
    @api fieldConfig;
    @api locale;

    get weekdayLabel() {
        return this.day
            ? new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(this.day)
            : '';
    }

    get dateLabel() {
        return this.day
            ? new Intl.DateTimeFormat(this.locale, { month: 'short', day: 'numeric' }).format(
                  this.day
              )
            : '';
    }

    get dateClass() {
        return this.isToday ? 'agenda-day__date agenda-day__date_today' : 'agenda-day__date';
    }

    get rows() {
        return (this.events || []).map((event) => ({ key: event.id, event }));
    }
}