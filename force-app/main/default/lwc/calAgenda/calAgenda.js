import { LightningElement, api } from 'lwc';
import { eventsForDay, compareEvents, isToday, startOfDay } from 'c/calCore';

/**
 * The condensed ("agenda") layout shared by week and day views: a scrollable
 * chronological list of the events in the visible range, grouped by day. Empty
 * days are dropped; when nothing falls in the range it shows an empty state.
 * Presentational — it slices the supplied events per day and hands each day to
 * `calAgendaDay`.
 */
export default class CalAgenda extends LightningElement {
    /** Ordered, visible day list (midnight Dates). */
    @api days = [];
    /** All prepared events overlapping the range, decorated with a `color`. */
    @api events = [];
    @api fieldConfig;
    @api locale;

    get agendaDays() {
        const now = new Date();
        return (this.days || [])
            .map((day) => ({
                key: +startOfDay(day),
                day,
                events: eventsForDay(this.events || [], day)
                    .slice()
                    .sort(compareEvents),
                isToday: isToday(day, now)
            }))
            .filter((entry) => entry.events.length > 0);
    }

    get isEmpty() {
        return this.agendaDays.length === 0;
    }
}