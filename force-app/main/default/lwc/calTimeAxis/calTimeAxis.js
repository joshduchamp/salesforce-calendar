import { LightningElement, api } from 'lwc';
import { hoursInWindow, formatHour } from 'c/calCore';

/**
 * The scheduler's left-hand hour ruler. Purely presentational: it turns a
 * `[startHour, endHour)` window into a stack of hour labels that line up with
 * the grid rows drawn by `calSchedulerColumn` (both use `--cal-hour-height`).
 */
export default class CalTimeAxis extends LightningElement {
    @api startHour = 0;
    @api endHour = 24;
    @api locale;

    get hours() {
        return hoursInWindow(Number(this.startHour), Number(this.endHour)).map((hour) => ({
            hour,
            label: formatHour(hour, { locale: this.locale })
        }));
    }
}
