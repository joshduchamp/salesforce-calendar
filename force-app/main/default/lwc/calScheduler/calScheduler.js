import { LightningElement, api } from 'lwc';
import { hoursInWindow, isMultiDay, occursOnDay, isToday, startOfDay } from 'c/calCore';

const HOUR_HEIGHT = 48;
const AUTO_SCROLL_HOUR = 8;

/**
 * The scheduler layout shared by week and day views: a day-header row, an
 * all-day band, and a scrollable time grid (time axis + one
 * `calSchedulerColumn` per day). It owns the hour-grid geometry; the columns
 * and the all-day row just place events into the space it defines.
 */
export default class CalScheduler extends LightningElement {
    /** Ordered, visible day list (midnight Dates). */
    @api days = [];
    /** All prepared events overlapping the range, decorated with a `color`. */
    @api events = [];
    @api startHour = 0;
    @api endHour = 24;
    @api fieldConfig;
    @api locale;

    _scrolled = false;

    renderedCallback() {
        if (this._scrolled) {
            return;
        }
        const scroller = this.refs.scroll;
        const start = this.numericStartHour;
        const end = this.numericEndHour;
        if (scroller && AUTO_SCROLL_HOUR > start && AUTO_SCROLL_HOUR < end) {
            scroller.scrollTop = (AUTO_SCROLL_HOUR - start) * HOUR_HEIGHT;
        }
        this._scrolled = true;
    }

    get numericStartHour() {
        const value = Number(this.startHour);
        return Number.isFinite(value) ? value : 0;
    }

    get numericEndHour() {
        const value = Number(this.endHour);
        return Number.isFinite(value) && value > this.numericStartHour ? value : 24;
    }

    get hourCount() {
        return hoursInWindow(this.numericStartHour, this.numericEndHour).length;
    }

    get gridStyle() {
        return (
            `--cal-hour-height: ${HOUR_HEIGHT}px;` +
            `height: ${this.hourCount * HOUR_HEIGHT}px;`
        );
    }

    get columnsStyle() {
        const columns = (this.days || []).length || 1;
        return `grid-template-columns: repeat(${columns}, minmax(0, 1fr));`;
    }

    get allDayEvents() {
        return (this.events || []).filter((event) => event.allDay || isMultiDay(event));
    }

    get timedEvents() {
        return (this.events || []).filter((event) => !(event.allDay || isMultiDay(event)));
    }

    get dayColumns() {
        const timed = this.timedEvents;
        const now = new Date();
        return (this.days || []).map((day) => ({
            key: +startOfDay(day),
            day,
            weekdayLabel: new Intl.DateTimeFormat(this.locale, { weekday: 'short' }).format(day),
            dayNumber: day.getDate(),
            headingClass: isToday(day, now) ? 'scheduler__heading scheduler__heading_today' : 'scheduler__heading',
            events: timed.filter((event) => occursOnDay(event, day))
        }));
    }
}
