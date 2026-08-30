import { LightningElement, api } from 'lwc';
import { formatTime } from 'c/calCore';

/** Below this many minutes the block can't fit two lines — go single-line. */
const SHORT_MINUTES = 45;

/**
 * One timed event block in a scheduler column. It fills the box its parent
 * (`calSchedulerColumn`) positions it in; it only renders the event and emits
 * the same bubbling `eventselect` / `eventopen` intents as `calEventChip` so the
 * host `calCalendar` handles clicks in one place.
 */
export default class CalSchedulerEvent extends LightningElement {
    /** Normalized event decorated with a `color`. */
    @api event;
    @api locale;

    get style() {
        const color = this.event && this.event.color;
        return color ? `--cal-event-color: ${color};` : '';
    }

    get durationMinutes() {
        if (!this.event) {
            return 0;
        }
        return (this.event.end - this.event.start) / 60000;
    }

    get eventClass() {
        return this.durationMinutes < SHORT_MINUTES ? 'event event_short' : 'event';
    }

    get timeLabel() {
        if (!this.event) {
            return '';
        }
        const start = formatTime(this.event.start, { locale: this.locale });
        const end = formatTime(this.event.end, { locale: this.locale });
        return `${start} – ${end}`;
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
                detail: { eventId: this.event && this.event.id },
                bubbles: true,
                composed: true
            })
        );
    }
}
