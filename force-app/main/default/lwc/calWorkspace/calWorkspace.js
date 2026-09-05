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
const SAVE_DEBOUNCE_MS = 1000;

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
 * Preference changes (selection / primary / view / layout) autosave, debounced.
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
    _saveTimer;
    _didLoad = false;
    _settingsOpen = false;

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
        // Flush a pending autosave so a change made just before navigating away
        // is not lost.
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = undefined;
            this.savePrefs();
        }
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
                // First run with nothing selected: open the picker so the user
                // isn't stranded on an empty calendar. loadWorkspace() runs once
                // (the _didLoad guard), so closing the drawer sticks — the
                // empty-state button is the way back in.
                if (!this.hasSelection) {
                    this._settingsOpen = true;
                }
                this.runFetch();
            })
            .catch((error) => {
                this._error = error;
            });
    }

    // ---- Save --------------------------------------------------------------
    scheduleSave() {
        clearTimeout(this._saveTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._saveTimer = setTimeout(() => {
            this._saveTimer = undefined;
            this.savePrefs();
        }, SAVE_DEBOUNCE_MS);
    }

    savePrefs() {
        if (!this._ready) {
            return;
        }
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
        // Keep exactly what the user chose — do not reconcile from the response.
        // A later loadWorkspace() reconciles on the next open.
        savePreferences({ prefsJson: JSON.stringify(payload) }).catch((error) => {
            this._error = error;
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

    // ---- Settings drawer ---------------------------------------------------
    get settingsOpen() {
        return this._settingsOpen;
    }

    openSettings() {
        this._settingsOpen = true;
    }

    closeSettings() {
        this._settingsOpen = false;
    }

    // ---- Event handlers ------------------------------------------------
    handleRangeChange(event) {
        this._range = event.detail;
        this.scheduleFetch();
    }

    handleViewChange(event) {
        this._display = { ...this._display, view: event.detail.view };
        this.scheduleSave();
    }

    handleLayoutChange(event) {
        this._display = { ...this._display, layout: event.detail.layout };
        this.scheduleSave();
    }

    handleVisibilityChange(event) {
        const { calendarId, visible } = event.detail;
        this._visibility = { ...this._visibility, [calendarId]: visible };
    }

    handleSelectionChange(event) {
        this._selectedIds = [...event.detail.selectedIds];
        if (this._primaryId && !this._selectedIds.includes(this._primaryId)) {
            this._primaryId = this._selectedIds[0];
        }
        if (!this._primaryId && this._selectedIds.length) {
            this._primaryId = this._selectedIds[0];
        }
        this.scheduleSave();
        this.scheduleFetch();
    }

    handlePrimaryChange(event) {
        this._primaryId = event.detail.primaryId;
        this.scheduleSave();
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