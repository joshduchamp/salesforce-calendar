import { LightningElement } from 'lwc';
import getWorkspace from '@salesforce/apex/CalWorkspaceController.getWorkspace';
import getEvents from '@salesforce/apex/CalWorkspaceController.getEvents';
import savePreferences from '@salesforce/apex/CalWorkspaceController.savePreferences';
import {
    mergeColorRules,
    mergeFieldConfig,
    resolveDisplayConfig,
    toGenericEvents,
    isTruncated
} from 'c/calWorkspaceCore';

const FETCH_DEBOUNCE_MS = 200;

function parseJson(raw, fallback) {
    if (!raw) {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

/**
 * The calendar workspace container — the only data-aware calendar component.
 * Loads the available calendars + this user's saved preferences, lets the user
 * pick which to display, refetches records as the visible range changes, and
 * maps them to the generic event shape for `c/calCalendar`.
 *
 * Preferences are persisted only when the user clicks "Save view" — no
 * autosave.
 */
export default class CalWorkspace extends LightningElement {
    _calendars = [];
    _selectedIds = [];
    _primaryId;
    _display = {};
    _visibility = {};
    _events = [];
    _truncated = false;
    _range;
    _fetchSeq = 0;
    _fetchTimer;
    _ready = false;
    _dirty = false;
    _saving = false;
    _justSaved = false;
    _didLoad = false;
    _lastSave = 'none';

    connectedCallback() {
        // connectedCallback can fire more than once (Lightning re-parents the
        // component); load the workspace only once so a reconnect doesn't wipe
        // unsaved changes.
        if (!this._didLoad) {
            this._didLoad = true;
            this.loadWorkspace();
        }
    }

    disconnectedCallback() {
        clearTimeout(this._fetchTimer);
    }

    loadWorkspace() {
        getWorkspace()
            .then((data) => {
                this._calendars = (data.calendars || []).map((calendar) => ({
                    ...calendar,
                    fieldConfig: parseJson(calendar.fieldConfigJson, []),
                    colorRules: parseJson(calendar.colorRulesJson, {
                        rules: [],
                        defaultColor: undefined
                    })
                }));
                const prefs = data.preferences || {};
                this._selectedIds = [...(prefs.selectedCalendarIds || [])];
                this._primaryId = prefs.primaryCalendarId || this._selectedIds[0];
                this._display = resolveDisplayConfig(prefs);
                this._ready = true;
                this.runFetch();
            })
            .catch((error) => {
                this._error = error;
            });
    }

    // ---- Save --------------------------------------------------------------
    get canSave() {
        return this._ready && this._dirty && !this._saving;
    }

    get saveDisabled() {
        return !this.canSave;
    }

    get debugState() {
        return (
            `ready=${this._ready} dirty=${this._dirty} ` +
            `sel=${JSON.stringify(this._selectedIds)} ` +
            `primary=${this._primaryId || 'null'} ` +
            `view=${this._display.view || 'null'} ` +
            `cals=${this._calendars.length} ` +
            `lastSave=${this._lastSave || 'none'}`
        );
    }

    get saveLabel() {
        if (this._saving) {
            return 'Saving…';
        }
        if (this._justSaved && !this._dirty) {
            return 'Preferences saved';
        }
        return 'Save preferences';
    }

    handleSave() {
        if (!this.canSave) {
            return;
        }
        this._saving = true;
        const payload = {
            selectedCalendarIds: this._selectedIds,
            primaryCalendarId: this._primaryId,
            view: this._display.view,
            layout: this._display.layout,
            firstDayOfWeek: this._display.firstDayOfWeek,
            hideWeekends: this._display.hideWeekends,
            schedulerStartHour: this._display.schedulerStartHour,
            schedulerEndHour: this._display.schedulerEndHour,
            maxEventsPerDay: this._display.maxEventsPerDay,
            hideLegend: this._display.hideLegend,
            showLegendCounts: this._display.showLegendCounts,
            locale: this._display.locale
        };
        this._lastSave = `SENT sel=${JSON.stringify(payload.selectedCalendarIds)}`;
        // eslint-disable-next-line no-console
        console.log('[calWS] handleSave', JSON.stringify(payload));
        savePreferences({ prefs: payload })
            .then((saved) => {
                this._lastSave = `OK server-returned sel=${JSON.stringify(saved && saved.selectedCalendarIds)}`;
                // eslint-disable-next-line no-console
                console.log('[calWS] save OK', JSON.stringify(saved));
                // Keep exactly what the user chose — do not reconcile from the
                // response. A later loadWorkspace() reconciles on the next open.
                this._dirty = false;
                this._justSaved = true;
                this._saving = false;
            })
            .catch((error) => {
                this._error = error;
                this._saving = false;
                this._lastSave = `ERROR ${error && error.body ? error.body.message : error}`;
                // eslint-disable-next-line no-console
                console.log('[calWS] save ERROR', error);
            });
    }

    // ---- Data for c/calCalendar ------------------------------------------
    get availableCalendars() {
        return this._calendars.map((calendar) => ({
            id: calendar.id,
            label: calendar.label,
            color: calendar.color,
            isMine: calendar.isMine,
            visibility: calendar.visibility,
            description: calendar.description
        }));
    }

    get selectedIds() {
        return this._selectedIds;
    }

    get primaryId() {
        return this._primaryId;
    }

    get orderedSelected() {
        const byId = new Map(this._calendars.map((calendar) => [calendar.id, calendar]));
        const ids = this._selectedIds || [];
        const ordered = [];
        if (this._primaryId && ids.includes(this._primaryId) && byId.has(this._primaryId)) {
            ordered.push(byId.get(this._primaryId));
        }
        ids.forEach((id) => {
            if (id !== this._primaryId && byId.has(id)) {
                ordered.push(byId.get(id));
            }
        });
        return ordered;
    }

    get hasSelection() {
        return this.orderedSelected.length > 0;
    }

    get calendarProp() {
        return this.orderedSelected.map((calendar) => ({
            id: calendar.id,
            label: calendar.label,
            color: calendar.color,
            visible: this._visibility[calendar.id] !== false
        }));
    }

    get events() {
        return this._events;
    }

    get truncated() {
        return this._truncated;
    }

    get mergedColorRules() {
        return mergeColorRules(this.orderedSelected);
    }

    get mergedFieldConfig() {
        return mergeFieldConfig(this.orderedSelected);
    }

    get view() {
        return this._display.view || 'month';
    }

    get layout() {
        return this._display.layout || 'scheduler';
    }

    get firstDayOfWeek() {
        return this._display.firstDayOfWeek == null ? 0 : this._display.firstDayOfWeek;
    }

    get hideWeekends() {
        return this._display.hideWeekends === true;
    }

    get schedulerStartHour() {
        return this._display.schedulerStartHour == null ? 0 : this._display.schedulerStartHour;
    }

    get schedulerEndHour() {
        return this._display.schedulerEndHour == null ? 24 : this._display.schedulerEndHour;
    }

    get maxEventsPerDay() {
        return this._display.maxEventsPerDay == null ? 3 : this._display.maxEventsPerDay;
    }

    get hideLegend() {
        return this._display.hideLegend === true;
    }

    get showLegendCounts() {
        return this._display.showLegendCounts === true;
    }

    get locale() {
        return this._display.locale || undefined;
    }

    // ---- Event handlers ------------------------------------------------
    handleRangeChange(event) {
        this._range = event.detail;
        this.scheduleFetch();
    }

    handleViewChange(event) {
        this._display = { ...this._display, view: event.detail.view };
        this.markDirty();
    }

    handleLayoutChange(event) {
        this._display = { ...this._display, layout: event.detail.layout };
        this.markDirty();
    }

    handleVisibilityChange(event) {
        const { calendarId, visible } = event.detail;
        this._visibility = { ...this._visibility, [calendarId]: visible };
    }

    handleSelectionChange(event) {
        // eslint-disable-next-line no-console
        console.log('[calWS] handleSelectionChange', JSON.stringify(event.detail));
        this._selectedIds = [...event.detail.selectedIds];
        if (this._primaryId && !this._selectedIds.includes(this._primaryId)) {
            this._primaryId = this._selectedIds[0];
        }
        if (!this._primaryId && this._selectedIds.length) {
            this._primaryId = this._selectedIds[0];
        }
        this.markDirty();
        this.scheduleFetch();
    }

    handlePrimaryChange(event) {
        this._primaryId = event.detail.primaryId;
        this.markDirty();
    }

    markDirty() {
        this._dirty = true;
        this._justSaved = false;
    }

    // ---- Fetch --------------------------------------------------------
    scheduleFetch() {
        clearTimeout(this._fetchTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._fetchTimer = setTimeout(() => this.runFetch(), FETCH_DEBOUNCE_MS);
    }

    runFetch() {
        if (!this._range || !this._selectedIds.length) {
            this._events = [];
            this._truncated = false;
            return;
        }
        const seq = ++this._fetchSeq;
        getEvents({
            calendarIds: this._selectedIds,
            rangeStart: this._range.start,
            rangeEnd: this._range.end
        })
            .then((result) => {
                if (seq !== this._fetchSeq) {
                    return;
                }
                this._events = toGenericEvents(result);
                this._truncated = isTruncated(result);
            })
            .catch((error) => {
                if (seq === this._fetchSeq) {
                    this._error = error;
                }
            });
    }
}