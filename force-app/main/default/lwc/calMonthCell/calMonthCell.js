import { LightningElement, api } from 'lwc';

/**
 * One day cell in the month grid: the date number and as many event chips as
 * physically fit, with an always-visible "+N more" affordance. Hovering (or
 * clicking) "+N more" opens `calDayEventsPopover` with the full day; clicking the
 * date number drills into the day view.
 *
 * Presentational except for the local hover/measurement state needed to size the
 * chip list and position the popover.
 */
const CLOSE_DELAY = 180;
/** Always try to show at least this many chips, even when "+N more" is present. */
const MIN_VISIBLE = 3;

export default class CalMonthCell extends LightningElement {
    /** Midnight Date for this cell. */
    @api day;
    /** Every event on this day (all-day, multi-day, timed) — feeds the "+N more"
     * popover and count. Already ordered. */
    @api events = [];
    /** Calendar-wide field display config. */
    @api fieldConfig;
    /** Hard cap on chips regardless of available height. */
    @api maxVisible = 4;
    /** Number of spanning-bar lanes the week reserves above the chip list. */
    @api reservedLanes = 0;
    /** True when the day is outside the focused month. */
    @api outside = false;
    /** True when the day is today. */
    @api isToday = false;
    @api locale;

    /** Events rendered as chips in the cell (single-day timed events). Defaults
     * to `events` so a host that doesn't split them still works. */
    @api
    get chipEvents() {
        return this._chipEvents == null ? this.events || [] : this._chipEvents;
    }
    set chipEvents(value) {
        this._chipEvents = value;
    }

    _chipEvents;

    _fit;
    _popoverOpen = false;
    _anchor;
    _closeTimer;
    _resizeObserver;
    _observed;

    connectedCallback() {
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => this.measureFit());
        }
    }

    renderedCallback() {
        const list = this.refs.list;
        if (this._resizeObserver && list && list !== this._observed) {
            if (this._observed) {
                this._resizeObserver.unobserve(this._observed);
            }
            this._resizeObserver.observe(list);
            this._observed = list;
        }
        this.measureFit();
    }

    disconnectedCallback() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        clearTimeout(this._closeTimer);
    }

    // ---- Header --------------------------------------------------------
    get dayNumber() {
        return this.day ? this.day.getDate() : '';
    }

    get isFirstOfMonth() {
        return this.day && this.day.getDate() === 1;
    }

    get monthLabel() {
        return this.isFirstOfMonth
            ? new Intl.DateTimeFormat(this.locale, { month: 'short' }).format(this.day)
            : '';
    }

    get dateLabel() {
        return this.day
            ? new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(this.day)
            : '';
    }

    /** Height of the spanning-bar gap, as a lane count the CSS multiplies out. */
    get laneStyle() {
        return `--cal-lanes: ${Number(this.reservedLanes) || 0};`;
    }

    // ---- Chip list ----------------------------------------------------
    get shownCount() {
        const total = this.chipEvents.length;
        const cap = Math.min(this.maxVisible, total);
        const fitted = this._fit === undefined ? cap : Math.min(this._fit, cap);
        // Never drop below MIN_VISIBLE (bounded by how many events there are).
        return Math.max(fitted, Math.min(MIN_VISIBLE, total));
    }

    get visibleEvents() {
        return this.chipEvents.slice(0, this.shownCount);
    }

    get overflowCount() {
        return Math.max(this.chipEvents.length - this.shownCount, 0);
    }

    get hasOverflow() {
        return this.overflowCount > 0;
    }

    get moreLabel() {
        return `+${this.overflowCount} more`;
    }

    get cellClass() {
        return ['cell', this.outside ? 'cell--outside' : '', this.isToday ? 'cell--today' : '']
            .filter(Boolean)
            .join(' ');
    }

    /**
     * How many chips fit in the list box. Runs after render and on resize; only
     * writes state when the number changes so it settles in one or two frames.
     */
    measureFit() {
        const list = this.refs.list;
        if (!list) {
            return;
        }
        const available = list.clientHeight;
        if (!available) {
            return;
        }
        const chip = list.querySelector('c-cal-event-chip');
        const rowHeight = (chip ? chip.getBoundingClientRect().height : 20) + 3;
        const moreHeight = 18;

        const count = this.chipEvents.length;
        let capacity = Math.floor(available / rowHeight);
        if (count > capacity) {
            capacity = Math.max(Math.floor((available - moreHeight) / rowHeight), 1);
        }
        const next = Math.max(Math.min(capacity, count), count ? 1 : 0);
        if (next !== this._fit) {
            this._fit = next;
        }
    }

    // ---- Interactions ----------------------------------------------
    handleDayClick() {
        this.drillToDay();
    }

    handleMoreClick() {
        this.drillToDay();
    }

    handleMoreEnter() {
        clearTimeout(this._closeTimer);
        this.openPopover();
    }

    handleMoreLeave() {
        this.scheduleClose();
    }

    handlePopoverPointerIn() {
        clearTimeout(this._closeTimer);
    }

    handlePopoverPointerOut() {
        this.scheduleClose();
    }

    handlePopoverClose() {
        this._popoverOpen = false;
    }

    openPopover() {
        const trigger = this.refs.more;
        if (trigger) {
            const rect = trigger.getBoundingClientRect();
            this._anchor = {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right
            };
        }
        this._popoverOpen = true;
    }

    scheduleClose() {
        clearTimeout(this._closeTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._closeTimer = setTimeout(() => {
            // Keep it open if the pointer is genuinely still over the trigger or
            // the panel — `mouseleave` also fires spuriously when an overlay is
            // inserted or the layout shifts.
            if (this.pointerWithinPopover()) {
                this.scheduleClose();
                return;
            }
            this._popoverOpen = false;
        }, CLOSE_DELAY);
    }

    pointerWithinPopover() {
        try {
            const panel = this.template.querySelector('c-cal-day-events-popover');
            const trigger = this.refs.more;
            return Boolean(
                (panel && panel.matches(':hover')) || (trigger && trigger.matches(':hover'))
            );
        } catch (e) {
            return false;
        }
    }

    drillToDay() {
        this.dispatchEvent(
            new CustomEvent('showday', {
                detail: { date: this.day ? this.day.toISOString() : null },
                bubbles: true,
                composed: true
            })
        );
    }

    get popoverOpen() {
        return this._popoverOpen;
    }

    get anchor() {
        return this._anchor;
    }
}
