import { LightningElement, api } from 'lwc';
import { weekRows, weekdayNames, eventsForDay, isSameDay, startOfMonth } from 'c/calCore';

/**
 * The month grid: a weekday header row and rows of `calMonthCell`. Presentational
 * — it slices the supplied events per day and lays out the grid. Multi-day
 * events currently render as a chip on each day they cover (spanning bars are a
 * later refinement).
 */
export default class CalMonthView extends LightningElement {
    /** Normalized, decorated events for at least the visible range. */
    @api events = [];
    /** Focused date (any day within the month to show). */
    @api
    get date() {
        return this._date;
    }
    set date(value) {
        this._date = value ? new Date(value) : new Date();
    }
    @api firstDayOfWeek = 0;
    @api hideWeekends = false;
    @api fieldConfig;
    @api maxEventsPerDay = 3;
    @api locale;

    _date = new Date();

    get headerDays() {
        return weekdayNames({
            firstDayOfWeek: Number(this.firstDayOfWeek),
            hideWeekends: this.hideWeekends,
            locale: this.locale,
            format: 'short'
        }).map((entry) => ({ key: entry.index, label: entry.label }));
    }

    get weeks() {
        const monthStart = startOfMonth(this._date);
        const now = new Date();
        return weekRows(this._date, {
            firstDayOfWeek: Number(this.firstDayOfWeek),
            hideWeekends: this.hideWeekends
        }).map((row, rowIndex) => ({
            key: `w${rowIndex}`,
            days: row.map((day) => ({
                key: day.toISOString(),
                day,
                events: eventsForDay(this.events, day),
                outside: day.getMonth() !== monthStart.getMonth(),
                isToday: isSameDay(day, now)
            }))
        }));
    }

    get gridStyle() {
        const columns = this.hideWeekends ? 5 : 7;
        return `--cal-month-columns: ${columns}; --cal-month-rows: ${this.weeks.length};`;
    }
}
