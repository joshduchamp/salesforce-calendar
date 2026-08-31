import { LightningElement, api } from 'lwc';

/**
 * Floating panel that lists every event on a single day as chips. Used by
 * `calMonthCell` for the "+N more" overflow. Presentational: it renders where it
 * is told (fixed position from `anchor`) and asks to close via a `close` event;
 * the chips inside emit their own bubbling `eventselect` / `eventopen`.
 */
const MARGIN = 4;
const ESTIMATED_ROW = 30;
const CHROME = 52;
const MAX_HEIGHT = 320;
const WIDTH = 260;

export default class CalDayEventsPopover extends LightningElement {
    /** Midnight Date for the day. */
    @api day;
    /** Normalized, decorated events for the day (ordered). */
    @api events = [];
    @api fieldConfig;
    @api locale;
    /** DOMRect-like { top, bottom, left, right } of the trigger, in viewport coords. */
    @api anchor;

    connectedCallback() {
        this._onDocClick = (event) => {
            if (!this.template.contains(event.target)) {
                this.emitClose();
            }
        };
        this._onKeydown = (event) => {
            if (event.key === 'Escape') {
                this.emitClose();
            }
        };
        // Defer so the click that opened the popover doesn't immediately close it.
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            document.addEventListener('click', this._onDocClick, true);
            document.addEventListener('keydown', this._onKeydown, true);
        }, 0);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._onDocClick, true);
        document.removeEventListener('keydown', this._onKeydown, true);
    }

    get heading() {
        return this.day
            ? new Intl.DateTimeFormat(this.locale, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
              }).format(this.day)
            : '';
    }

    get panelStyle() {
        const anchor = this.anchor || { top: 0, bottom: 0, left: 0 };
        const estimated = Math.min(this.events.length * ESTIMATED_ROW + CHROME, MAX_HEIGHT);
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;

        let top = anchor.bottom + MARGIN;
        if (top + estimated > viewportH) {
            top = Math.max(anchor.top - estimated - MARGIN, MARGIN);
        }
        let left = anchor.left;
        if (left + WIDTH > viewportW) {
            left = Math.max(viewportW - WIDTH - MARGIN, MARGIN);
        }
        return `top: ${Math.round(top)}px; left: ${Math.round(left)}px; width: ${WIDTH}px; max-height: ${MAX_HEIGHT}px;`;
    }

    handleMouseEnter() {
        this.dispatchEvent(new CustomEvent('pointerin'));
    }

    handleMouseLeave() {
        this.dispatchEvent(new CustomEvent('pointerout'));
    }

    emitClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}