import { LightningElement, api } from 'lwc';
import { packLanes } from 'c/calCore';

/**
 * The all-day / multi-day band that sits above the scheduler grid. It lane-packs
 * the bars with `packLanes` so nothing overlaps, then places each as a
 * grid item spanning the days it covers. `calEventChip` renders the bar itself.
 */
export default class CalAllDayRow extends LightningElement {
    /** Ordered, visible day list (midnight Dates) — matches the grid columns. */
    @api days = [];
    /** All-day and multi-day events, decorated with a `color`. */
    @api events = [];
    @api fieldConfig;
    @api locale;

    get bars() {
        const { placements } = packLanes(this.events || [], this.days || []);
        return placements.map((placement) => {
            const classes = ['band__bar'];
            if (placement.continuesBefore) {
                classes.push('band__bar_open-start');
            }
            if (placement.continuesAfter) {
                classes.push('band__bar_open-end');
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
    }

    get rowStyle() {
        const columns = (this.days || []).length || 1;
        const { laneCount } = packLanes(this.events || [], this.days || []);
        return (
            `grid-template-columns: repeat(${columns}, minmax(0, 1fr));` +
            `grid-template-rows: repeat(${Math.max(laneCount, 1)}, auto);`
        );
    }
}
