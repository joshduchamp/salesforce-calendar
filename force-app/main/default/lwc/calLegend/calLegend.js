import { LightningElement, api } from 'lwc';

/**
 * The color-rules legend: one swatch + label per rule that colored at least one
 * event in the visible range. Purely presentational — `calCalendar` computes the
 * entries with `activeLegend` and passes them in.
 */
export default class CalLegend extends LightningElement {
    /** [{ index, label, color, count }] from `activeLegend`. */
    @api entries = [];
    @api heading = 'Legend';
    /** Show the per-rule match count beside each label. */
    @api showCounts = false;

    get items() {
        return (this.entries || []).map((entry) => ({
            key: entry.index,
            label: entry.label,
            count: entry.count,
            showCount: this.showCounts && entry.count > 0,
            style: `--cal-legend-color: ${entry.color || '#1b96ff'};`
        }));
    }

    get hasEntries() {
        return this.items.length > 0;
    }
}
