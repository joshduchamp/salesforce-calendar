import { LightningElement, api } from 'lwc';
import { isMultiDay, formatTime } from 'c/calCore';

/**
 * One event row in the agenda layout: a time label in the gutter and a
 * `calEventChip` for the event body (title, configured fields, resolved color).
 * The chip owns the click / double-click intent events; this component only adds
 * the time label and row layout.
 */
export default class CalAgendaItem extends LightningElement {
    /** Normalized event decorated with a `color`. */
    @api event;
    @api fieldConfig;
    @api locale;

    get isAllDay() {
        return Boolean(this.event) && (this.event.allDay || isMultiDay(this.event));
    }

    get timeLabel() {
        if (!this.event) {
            return '';
        }
        if (this.isAllDay) {
            return 'All day';
        }
        const start = formatTime(this.event.start, { locale: this.locale });
        const end = formatTime(this.event.end, { locale: this.locale });
        return `${start} – ${end}`;
    }
}
