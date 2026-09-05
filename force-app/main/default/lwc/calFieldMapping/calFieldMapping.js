import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import TARGET_OBJECT_FIELD from '@salesforce/schema/Cal_Calendar__c.Target_Object__c';
import FIELD_MAPPINGS_FIELD from '@salesforce/schema/Cal_Calendar__c.Field_Mappings__c';

const LITERAL_TRUE = '__true__';
const LITERAL_FALSE = '__false__';

// UI API dataType values (lower-cased) eligible for each mapping slot.
const TEXT_TYPES = new Set([
    'string',
    'textarea',
    'picklist',
    'email',
    'phone',
    'url',
    'combobox',
    'reference',
    'encryptedstring'
]);
const DATE_TYPES = new Set(['datetime', 'date']);
const BOOL_TYPES = new Set(['boolean']);
const REF_TYPES = new Set(['reference']);

const EMPTY_SELECTION = { title: '', start: '', end: '', allDay: '', recordId: '' };

const END_NONE = 'Point in time (no end)';
const ALLDAY_NONE = 'Not set — every event is timed';
const RECORD_NONE = 'No record link';

/** A stored `allDay` value → the combobox value that represents it. */
function allDayToValue(raw) {
    if (raw === true || raw === 'true') {
        return LITERAL_TRUE;
    }
    if (raw === false || raw === 'false') {
        return LITERAL_FALSE;
    }
    return raw == null ? '' : String(raw);
}

/** Parse Field_Mappings__c JSON into flat slot state; blank/invalid → all empty. */
function parseMapping(json) {
    if (!json) {
        return { ...EMPTY_SELECTION };
    }
    let src;
    try {
        src = JSON.parse(json);
    } catch (e) {
        return { ...EMPTY_SELECTION };
    }
    if (!src || typeof src !== 'object') {
        return { ...EMPTY_SELECTION };
    }
    const str = (v) => (v == null ? '' : String(v));
    return {
        title: str(src.title),
        start: str(src.start),
        end: str(src.end),
        allDay: allDayToValue(src.allDay),
        recordId: str(src.recordId)
    };
}

/** Slot state → the mapping object, omitting empty keys. */
function buildMapping(sel) {
    const out = {};
    if (sel.title) {
        out.title = sel.title;
    }
    if (sel.start) {
        out.start = sel.start;
    }
    if (sel.end) {
        out.end = sel.end;
    }
    if (sel.allDay === LITERAL_TRUE) {
        out.allDay = true;
    } else if (sel.allDay === LITERAL_FALSE) {
        out.allDay = false;
    } else if (sel.allDay) {
        out.allDay = sel.allDay;
    }
    if (sel.recordId) {
        out.recordId = sel.recordId;
    }
    return out;
}

/** allDay slot state → how it reads in the summary. */
function allDaySummary(value) {
    if (value === LITERAL_TRUE) {
        return 'Always all-day';
    }
    if (value === LITERAL_FALSE) {
        return 'Always timed';
    }
    return value || ALLDAY_NONE;
}

/**
 * Record-page helper that maps the five base event fields (title, start, end,
 * allDay, recordId) to fields on the calendar's Target Object and writes the
 * result to Cal_Calendar__c.Field_Mappings__c. Opens as a read-only summary; a
 * header pencil expands the guided picker.
 */
export default class CalFieldMapping extends LightningElement {
    @api recordId;

    record;
    selection = { ...EMPTY_SELECTION };
    mode = 'view';
    dirty = false;
    saving = false;
    recordError;
    objectInfo;
    objectInfoError;

    @wire(getRecord, { recordId: '$recordId', fields: [TARGET_OBJECT_FIELD, FIELD_MAPPINGS_FIELD] })
    wiredRecord({ data, error }) {
        if (data) {
            this.record = data;
            if (!this.dirty) {
                this.selection = parseMapping(getFieldValue(data, FIELD_MAPPINGS_FIELD));
            }
        } else if (error) {
            this.recordError = reduce(error);
        }
    }

    @wire(getObjectInfo, { objectApiName: '$targetObject' })
    wiredObjectInfo({ data, error }) {
        this.objectInfo = data;
        this.objectInfoError = error ? reduce(error) : undefined;
    }

    get targetObject() {
        return this.record ? getFieldValue(this.record, TARGET_OBJECT_FIELD) : undefined;
    }

    get hasTargetObject() {
        return !!this.targetObject;
    }

    get isEdit() {
        return this.mode === 'edit';
    }

    get showEditButton() {
        return this.hasTargetObject && !this.isEdit;
    }

    /** Condensed read-only lines for the default (view) mode. */
    get summaryRows() {
        const s = this.selection;
        return [
            { key: 'title', label: 'Title', value: s.title || 'Not set' },
            { key: 'start', label: 'Start', value: s.start || 'Not set' },
            { key: 'end', label: 'End', value: s.end || END_NONE },
            { key: 'allDay', label: 'All-day', value: allDaySummary(s.allDay) },
            { key: 'recordId', label: 'Record link', value: recordIdSummary(s.recordId) }
        ];
    }

    get fieldsSorted() {
        const fields = (this.objectInfo && this.objectInfo.fields) || {};
        return Object.values(fields).sort((a, b) => a.label.localeCompare(b.label));
    }

    optionsFor(types) {
        return this.fieldsSorted
            .filter((f) => types.has((f.dataType || '').toLowerCase()))
            .map((f) => ({ label: `${f.label} (${f.apiName})`, value: f.apiName }));
    }

    /** Keep a stored value visible even when it is not a field on the object. */
    withCurrent(options, value) {
        if (!value || options.some((o) => o.value === value)) {
            return options;
        }
        return [...options, { label: `${value} — not found on this object`, value }];
    }

    get titleOptions() {
        return this.withCurrent(this.optionsFor(TEXT_TYPES), this.selection.title);
    }

    get startOptions() {
        return this.withCurrent(this.optionsFor(DATE_TYPES), this.selection.start);
    }

    get endOptions() {
        return this.withCurrent(
            [{ label: END_NONE, value: '' }, ...this.optionsFor(DATE_TYPES)],
            this.selection.end
        );
    }

    get allDayOptions() {
        return this.withCurrent(
            [
                { label: ALLDAY_NONE, value: '' },
                { label: 'Always all-day', value: LITERAL_TRUE },
                { label: 'Always timed', value: LITERAL_FALSE },
                ...this.optionsFor(BOOL_TYPES)
            ],
            this.selection.allDay
        );
    }

    get recordIdOptions() {
        return this.withCurrent(
            [
                { label: RECORD_NONE, value: '' },
                { label: 'This record (Id)', value: 'Id' },
                ...this.optionsFor(REF_TYPES)
            ],
            this.selection.recordId
        );
    }

    get mappingJson() {
        return JSON.stringify(buildMapping(this.selection), null, 2);
    }

    get canSave() {
        return this.dirty && !this.saving && !!this.selection.title && !!this.selection.start;
    }

    get saveDisabled() {
        return !this.canSave;
    }

    handleEdit() {
        this.mode = 'edit';
    }

    /** Leave edit mode, discarding unsaved changes. */
    handleCancel() {
        this.dirty = false;
        this.selection = parseMapping(getFieldValue(this.record, FIELD_MAPPINGS_FIELD));
        this.mode = 'view';
    }

    handleChange(event) {
        const slot = event.target.dataset.slot;
        this.selection = { ...this.selection, [slot]: event.detail.value };
        this.dirty = true;
    }

    async handleSave() {
        this.saving = true;
        const fields = { Id: this.recordId };
        fields[FIELD_MAPPINGS_FIELD.fieldApiName] = this.mappingJson;
        try {
            await updateRecord({ fields });
            this.dirty = false;
            this.mode = 'view';
            this.toast('Saved', 'Field mapping updated.', 'success');
        } catch (e) {
            this.toast('Could not save', reduce(e), 'error');
        } finally {
            this.saving = false;
        }
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}

/** recordId slot state → how it reads in the summary. */
function recordIdSummary(value) {
    if (value === 'Id') {
        return 'This record (Id)';
    }
    return value || RECORD_NONE;
}

function reduce(error) {
    if (!error) {
        return 'Unknown error';
    }
    if (error.body && error.body.message) {
        return error.body.message;
    }
    return error.message || String(error);
}