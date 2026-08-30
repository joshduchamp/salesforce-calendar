import { LightningElement, api } from 'lwc';
import { packColumns, eventBand } from 'c/calCore';

/**
 * One day's column in the scheduler grid. It runs `packColumns` over the timed
 * events handed to it and turns each into an absolute box — vertical position
 * and height from the time window, horizontal slot from the overlap packing —
 * then lets `calSchedulerEvent` render inside.
 */
export default class CalSchedulerColumn extends LightningElement {
    /** Midnight Date for this column. */
    @api
    get day() {
        return this._day;
    }
    set day(value) {
        this._day = value ? new Date(value) : null;
    }

    /** Timed (non all-day, single-day) events that occur on this day. */
    @api events = [];
    @api startHour = 0;
    @api endHour = 24;
    @api locale;

    _day;

    get placedEvents() {
        const window = {
            startHour: Number(this.startHour),
            endHour: Number(this.endHour)
        };
        return packColumns(this.events || []).map(({ event, columnIndex, columnCount }) => {
            const band = eventBand(event, this._day, window);
            const left = (columnIndex / columnCount) * 100;
            const width = (1 / columnCount) * 100;
            return {
                key: event.id,
                event,
                style:
                    `top:${band.top * 100}%;` +
                    `height:${band.height * 100}%;` +
                    `left:${left}%;` +
                    `width:${width}%;`
            };
        });
    }
}
