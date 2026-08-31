import { LightningElement, api } from 'lwc';
import {
    weekRows,
    weekdayNames,
    eventsForDay,
    isSameDay,
    startOfMonth,
    packLanes,
    isBarEvent
} from 'c/calCore';

/**
 * The month grid: a weekday header row and rows of `calMonthCell`. Presentational
 * — it slices the supplied events per day and lays out the grid. All-day and
 * multi-day events render as bars spanning the days they cover (lane-packed per
 * week with `packLanes`); single-day timed events render as chips in the cell.
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

    get rows() {
        return weekRows(this._date, {
            firstDayOfWeek: Number(this.firstDayOfWeek),
            hideWeekends: this.hideWeekends
        });
    }

    get weeks() {
        const monthStart = startOfMonth(this._date);
        const now = new Date();
        const barEvents = (this.events || []).filter(isBarEvent);
        return this.rows.map((row, rowIndex) => {
            const { placements, laneCount } = packLanes(barEvents, row);
            const bars = placements.map((placement) => {
                const classes = ['month__bar'];
                if (placement.continuesBefore) {
                    classes.push('month__bar_open-start');
                }
                if (placement.continuesAfter) {
                    classes.push('month__bar_open-end');
                }
                return {
                    key: placement.event.id,
                    event: placement.event,
                    className: classes.join(' '),
                    style:
                        `grid-column: ${placement.startIndex + 1} / span ${placement.span};` +
                        `grid-row: ${placement.lane + 1};`
                };
            });
            return {
                key: `w${rowIndex}`,
                bars,
                laneCount,
                barBandStyle:
                    `grid-template-columns: repeat(${row.length}, minmax(0, 1fr));` +
                    `grid-template-rows: repeat(${Math.max(laneCount, 1)}, auto);`,
                days: row.map((day) => {
                    const events = eventsForDay(this.events, day);
                    return {
                        key: day.toISOString(),
                        day,
                        events,
                        chipEvents: events.filter((event) => !isBarEvent(event)),
                        outside: day.getMonth() !== monthStart.getMonth(),
                        isToday: isSameDay(day, now)
                    };
                })
            };
        });
    }

    get gridStyle() {
        const columns = this.hideWeekends ? 5 : 7;
        return `--cal-month-columns: ${columns}; --cal-month-rows: ${this.rows.length};`;
    }
}