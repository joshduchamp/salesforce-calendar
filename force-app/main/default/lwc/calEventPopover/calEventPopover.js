import { LightningElement, api } from 'lwc';
import { resolveFields, formatTime, isMultiDay, lastCoveredDay } from 'c/calCore';

const WIDTH = 264;
const MARGIN = 8;

/**
 * A read-only hover card for a single event: title, when, calendar, and every
 * configured field (no per-view filtering — this is the "see everything" view).
 * Presentational and non-interactive; `calCalendar` owns the hover state and
 * positions it from the hovered element's viewport rect.
 */
export default class CalEventPopover extends LightningElement {
    /** Normalized event decorated with `color` / `calendarLabel`. */
    @api event;
    @api fieldConfig;
    @api locale;
    /** { top, bottom, left, right } of the hovered element, viewport coords. */
    @api anchor;

    get panelStyle() {
        const a = this.anchor || { top: 0, bottom: 0, left: 0, right: 0 };
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;

        // Beside the event, not over it: to the right if it fits there, else the
        // left. This keeps neighbouring rows (e.g. the "+N more" list) visible.
        const fitsRight = viewportW - a.right >= WIDTH + MARGIN;
        const fitsLeft = a.left >= WIDTH + MARGIN;
        let left = fitsRight || !fitsLeft ? a.right + MARGIN : a.left - WIDTH - MARGIN;
        left = Math.min(Math.max(left, MARGIN), Math.max(viewportW - WIDTH - MARGIN, MARGIN));

        // Align to the event's top edge; pin to its bottom edge instead when the
        // event sits low, so the card grows upward and stays on screen.
        const vertical =
            a.top > viewportH * 0.6
                ? `bottom:${Math.round(Math.max(viewportH - a.bottom, MARGIN))}px;`
                : `top:${Math.round(Math.max(a.top, MARGIN))}px;`;

        const color = this.event && this.event.color ? this.event.color : '#1b96ff';
        return `${vertical}left:${Math.round(left)}px;width:${WIDTH}px;--cal-popover-color:${color};`;
    }

    get whenLabel() {
        const e = this.event;
        if (!e) {
            return '';
        }
        const dayFmt = new Intl.DateTimeFormat(this.locale, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        const time = (d) => formatTime(d, { locale: this.locale });
        const multiDay = isMultiDay(e);

        if (e.allDay) {
            return multiDay
                ? `All day · ${dayFmt.format(e.start)} – ${dayFmt.format(lastCoveredDay(e))}`
                : `All day · ${dayFmt.format(e.start)}`;
        }
        if (multiDay) {
            return `${dayFmt.format(e.start)} ${time(e.start)} – ${dayFmt.format(e.end)} ${time(e.end)}`;
        }
        return `${dayFmt.format(e.start)} · ${time(e.start)} – ${time(e.end)}`;
    }

    get calendarLabel() {
        return this.event && this.event.calendarLabel;
    }

    get detailFields() {
        if (!this.event) {
            return [];
        }
        return resolveFields(this.event, this.fieldConfig).map((field) => ({
            key: field.key,
            label: field.label,
            value: field.value
        }));
    }

    get hasDetailFields() {
        return this.detailFields.length > 0;
    }
}
