import { LightningElement, api } from 'lwc';
import { formatTime, resolveFields } from 'c/calCore';

/** Below this many minutes the block is one line: title + time, no fields. */
const SHORT_MINUTES = 45;

/**
 * One timed event block in a scheduler column. It fills the box its parent
 * (`calSchedulerColumn`) positions it in; it only renders the event and emits
 * the same bubbling `eventselect` / `eventopen` intents as `calEventChip` so the
 * host `calCalendar` handles clicks in one place.
 *
 * Week columns are narrow, so the block shows as little as it can get away with:
 * the grid position already conveys the time, so the explicit time line is
 * dropped whenever there are configured fields to show instead, and an event
 * sharing its width with an overlapping neighbour shows the title only.
 */
export default class CalSchedulerEvent extends LightningElement {
    /** Normalized event decorated with a `color`. */
    @api event;
    /** How many side-by-side columns this event's overlap cluster spans. > 1
     * means the block is too narrow for anything but the title. */
    @api columnCount = 1;
    /** Calendar-wide field display config. */
    @api fieldConfig;
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

    get isShort() {
        return this.durationMinutes < SHORT_MINUTES;
    }

    /** Sharing its width with an overlapping event — only the title fits. */
    get isNarrow() {
        return Number(this.columnCount) > 1;
    }

    get eventClass() {
        return this.isShort ? 'event event_short' : 'event';
    }

    get fields() {
        return this.event ? resolveFields(this.event, this.fieldConfig, 'scheduler') : [];
    }

    /** Fields replace the time line on any block tall and wide enough for them. */
    get hasFields() {
        return !this.isShort && !this.isNarrow && this.fields.length > 0;
    }

    /** Inline on short blocks; its own line when there's nothing better to show;
     * hidden when fields take the space or the block is too narrow. */
    get showTime() {
        if (this.isNarrow) {
            return false;
        }
        return this.isShort || !this.hasFields;
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

    handlePointerEnter(event) {
        const r = event.currentTarget.getBoundingClientRect();
        this.dispatch('eventhover', {
            rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
        });
    }

    handlePointerLeave() {
        this.dispatch('eventhoverend');
    }

    dispatch(name, detail = {}) {
        this.dispatchEvent(
            new CustomEvent(name, {
                detail: { eventId: this.event && this.event.id, ...detail },
                bubbles: true,
                composed: true
            })
        );
    }
}