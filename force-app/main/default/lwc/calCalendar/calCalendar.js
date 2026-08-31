import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { normalizeEvents, visibleRange, rangeTitle, step, resolveColor } from 'c/calCore';

const DEFAULT_VIEW = 'month';
const DEFAULT_LAYOUT = 'scheduler';
/** Grace period before the hover card hides after the pointer leaves an event. */
const HOVER_CARD_HIDE_MS = 120;

/**
 * Presentational, SObject-agnostic calendar. The host passes `events` and
 * `calendars` in via `@api`; this component owns only view / focused-date /
 * layout / calendar-visibility UI state, computes the visible range, filters and
 * decorates events, and routes to the active view. It emits intent — it never
 * queries Salesforce.
 */
export default class CalCalendar extends NavigationMixin(LightningElement) {
    // ---- Public data -------------------------------------------------------
    @api
    get events() {
        return this._events;
    }
    set events(value) {
        this._events = value;
        this._normalized = null;
    }

    @api calendars = [];

    // ---- Public configuration -------------------------------------------------
    @api
    get view() {
        return this._view;
    }
    set view(value) {
        this._view = value || DEFAULT_VIEW;
    }

    @api
    get date() {
        return this._date;
    }
    set date(value) {
        this._date = value ? new Date(value) : new Date();
    }

    @api
    get layout() {
        return this._layout;
    }
    set layout(value) {
        this._layout = value || DEFAULT_LAYOUT;
    }

    @api firstDayOfWeek = 0;
    @api hideWeekends = false;
    @api fieldConfig;
    @api colorRules;
    @api schedulerStartHour = 0;
    @api schedulerEndHour = 24;
    @api maxEventsPerDay = 3;
    @api locale;

    // ---- Internal state -----------------------------------------------------
    _events;
    _normalized = null;
    _view = DEFAULT_VIEW;
    _date = new Date();
    _layout = DEFAULT_LAYOUT;
    _visibilityOverrides = {};
    _rangeSignature = '';
    _hoverEventId = null;
    _hoverAnchor = null;
    _hoverTimer = null;

    connectedCallback() {
        this.emitRangeChange();
    }

    disconnectedCallback() {
        clearTimeout(this._hoverTimer);
    }

    renderedCallback() {
        this.emitRangeChange();
    }

    // ---- Public imperative API -------------------------------------------
    @api
    next() {
        this.moveBy(1);
    }

    @api
    previous() {
        this.moveBy(-1);
    }

    @api
    today() {
        this._date = new Date();
        this.emitNavigate();
    }

    @api
    goToDate(value) {
        this._date = new Date(value);
        this.emitNavigate();
    }

    // ---- Derived data -----------------------------------------------------
    get normalizedEvents() {
        if (!this._normalized) {
            this._normalized = normalizeEvents(this._events);
        }
        return this._normalized;
    }

    get calendarsById() {
        const map = {};
        for (const calendar of this.calendars || []) {
            map[calendar.id] = calendar;
        }
        return map;
    }

    get hiddenIds() {
        const hidden = new Set();
        for (const calendar of this.calendars || []) {
            const override = this._visibilityOverrides[calendar.id];
            const visible = override === undefined ? calendar.visible !== false : override;
            if (!visible) {
                hidden.add(calendar.id);
            }
        }
        return hidden;
    }

    get sourceCalendars() {
        const hidden = this.hiddenIds;
        return (this.calendars || []).map((calendar) => ({
            ...calendar,
            visible: !hidden.has(calendar.id)
        }));
    }

    get range() {
        return visibleRange(this._view, this._date, {
            firstDayOfWeek: Number(this.firstDayOfWeek)
        });
    }

    get preparedEvents() {
        const { start, end } = this.range;
        const hidden = this.hiddenIds;
        const calendars = this.calendarsById;
        return this.normalizedEvents
            .filter((event) => event.start <= end && event.end >= start)
            .filter((event) => !hidden.has(event.calendarId))
            .map((event) => {
                const calendar = calendars[event.calendarId];
                return {
                    ...event,
                    color: resolveColor(event, this.colorRules, calendar),
                    calendarLabel: calendar ? calendar.label : undefined
                };
            });
    }

    get title() {
        return rangeTitle(this._view, this._date, {
            locale: this.locale,
            firstDayOfWeek: Number(this.firstDayOfWeek)
        });
    }

    get canToggleLayout() {
        return this._view !== 'month';
    }

    get isMonth() {
        return this._view === 'month';
    }

    get isWeek() {
        return this._view === 'week';
    }

    get isDay() {
        return this._view === 'day';
    }

    get showSidebar() {
        return (this.calendars || []).length > 0;
    }

    get bodyClass() {
        return this.showSidebar ? 'calendar__body calendar__body_with-sidebar' : 'calendar__body';
    }

    // ---- Event handlers -------------------------------------------------
    handleToday() {
        this.today();
    }

    handleNavigate(event) {
        this.moveBy(event.detail.direction);
    }

    handleViewChange(event) {
        this._view = event.detail.view;
        this.clearHover();
        this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: this._view } }));
        this.emitRangeChange();
    }

    handleLayoutChange(event) {
        this._layout = event.detail.layout;
        this.dispatchEvent(new CustomEvent('layoutchange', { detail: { layout: this._layout } }));
    }

    handleVisibilityChange(event) {
        const { calendarId, visible } = event.detail;
        this._visibilityOverrides = { ...this._visibilityOverrides, [calendarId]: visible };
        this.dispatchEvent(
            new CustomEvent('calendarvisibilitychange', {
                detail: {
                    calendarId,
                    visible,
                    visibleCalendarIds: this.sourceCalendars
                        .filter((calendar) => calendar.visible)
                        .map((calendar) => calendar.id)
                }
            })
        );
    }

    handleEventSelect(event) {
        const found = this.findEvent(event.detail.eventId);
        if (found) {
            this.dispatchEvent(
                new CustomEvent('eventclick', { detail: { event: found.raw || found } })
            );
        }
    }

    handleEventOpen(event) {
        const found = this.findEvent(event.detail.eventId);
        if (!found) {
            return;
        }
        this.dispatchEvent(new CustomEvent('eventopen', { detail: { event: found.raw || found } }));
        if (found.recordId) {
            this.navigateToRecord(found.recordId);
        }
    }

    /** Open a record page. Split out as a seam so hosts/tests can observe it. */
    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId, actionName: 'view' }
        });
    }

    handleDrillToDay(event) {
        const iso = event.detail.date;
        if (!iso) {
            return;
        }
        this._date = new Date(iso);
        this._view = 'day';
        this.clearHover();
        this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: 'day' } }));
        this.emitNavigate();
    }

    // ---- Hover card -------------------------------------------------------
    handleEventHover(event) {
        clearTimeout(this._hoverTimer);
        this._hoverEventId = event.detail.eventId;
        this._hoverAnchor = event.detail.rect || null;
    }

    handleEventHoverEnd() {
        clearTimeout(this._hoverTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._hoverTimer = setTimeout(() => {
            this._hoverEventId = null;
            this._hoverAnchor = null;
        }, HOVER_CARD_HIDE_MS);
    }

    clearHover() {
        clearTimeout(this._hoverTimer);
        this._hoverEventId = null;
        this._hoverAnchor = null;
    }

    get hoveredEvent() {
        if (!this._hoverEventId) {
            return null;
        }
        return this.preparedEvents.find((event) => event.id === this._hoverEventId) || null;
    }

    get hoverAnchor() {
        return this._hoverAnchor;
    }

    // ---- Helpers -------------------------------------------------------
    moveBy(direction) {
        this._date = step(this._view, this._date, direction);
        this.clearHover();
        this.emitNavigate();
    }

    emitNavigate() {
        this.dispatchEvent(
            new CustomEvent('navigate', { detail: { date: this._date.toISOString() } })
        );
        this.emitRangeChange();
    }

    emitRangeChange() {
        const { start, end } = this.range;
        const signature = `${this._view}|${start.getTime()}|${end.getTime()}`;
        if (signature === this._rangeSignature) {
            return;
        }
        this._rangeSignature = signature;
        this.dispatchEvent(
            new CustomEvent('rangechange', {
                detail: {
                    view: this._view,
                    start: start.toISOString(),
                    end: end.toISOString()
                }
            })
        );
    }

    findEvent(id) {
        return this.preparedEvents.find((event) => event.id === id);
    }
}
