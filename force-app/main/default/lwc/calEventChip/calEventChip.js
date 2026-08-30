import { LightningElement, api } from 'lwc';
import { resolveFields, formatTime } from 'c/calCore';

/**
 * Compact, presentational representation of a single event — used by the month
 * grid and the condensed/agenda layout. Knows nothing about SObjects; it
 * renders whatever the normalized event + field config give it.
 *
 * Emits (bubbling, composed) `eventselect` on click and `eventopen` on double
 * click so the host `calCalendar` can react without every layer re-dispatching.
 */
export default class CalEventChip extends LightningElement {
    /** Normalized event decorated with a `color`. */
    @api event;
    /** Calendar-wide field display config. */
    @api fieldConfig;
    /** Current view name, for per-view field filtering. */
    @api view = 'month';
    /** Hide the time prefix (e.g. in the scheduler where position implies time). */
    @api hideTime = false;
    /** Single-line mode: drop the configured-field sub-line (e.g. packed month cells). */
    @api dense = false;
    @api locale;

    get style() {
        const color = this.event?.color;
        return color ? `--cal-chip-color: ${color};` : '';
    }

    get showTime() {
        return !this.hideTime && this.event && !this.event.allDay;
    }

    get timeLabel() {
        return this.event ? formatTime(this.event.start, { locale: this.locale }) : '';
    }

    get fields() {
        if (!this.event) {
            return [];
        }
        return resolveFields(this.event, this.fieldConfig, this.view);
    }

    get hasFields() {
        return !this.dense && this.fields.length > 0;
    }

    get chipClass() {
        return this.dense ? 'chip chip_dense' : 'chip';
    }

    handleClick() {
        this.dispatch('eventselect');
    }

    handleDblClick() {
        this.dispatch('eventopen');
    }

    handleKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.dispatch('eventselect');
        }
    }

    dispatch(name) {
        this.dispatchEvent(
            new CustomEvent(name, {
                detail: { eventId: this.event?.id },
                bubbles: true,
                composed: true
            })
        );
    }
}
