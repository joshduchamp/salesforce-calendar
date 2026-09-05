import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import TARGET_OBJECT_FIELD from '@salesforce/schema/Cal_Calendar__c.Target_Object__c';
import FIELD_CONFIG_FIELD from '@salesforce/schema/Cal_Calendar__c.Field_Config__c';

const ALL_VIEWS = ['month', 'condensed', 'scheduler'];
const VIEW_OPTIONS = [
    { label: 'Month', value: 'month' },
    { label: 'Condensed (week / day list)', value: 'condensed' },
    { label: 'Scheduler', value: 'scheduler' }
];
const VIEW_LABELS = { month: 'Month', condensed: 'Condensed', scheduler: 'Scheduler' };

let uid = 0;

/** One stored entry (or a fresh blank one) → editor row state. */
function toRow(src) {
    const raw = src && typeof src === 'object' ? src : {};
    const views = Array.isArray(raw.views)
        ? raw.views.filter((v) => ALL_VIEWS.includes(v))
        : [];
    const source = str(raw.source);
    return {
        id: `row-${uid++}`,
        key: str(raw.key),
        source,
        // A dotted lookup path can't be offered by the field picker.
        customPath: source.includes('.'),
        label: str(raw.label),
        showLabel: raw.showLabel !== false,
        views,
        truncate: Number.isFinite(raw.truncate) ? String(raw.truncate) : ''
    };
}

function str(v) {
    return v == null ? '' : String(v);
}

/** Parse Field_Config__c JSON into rows; blank/invalid → no rows. */
function parseConfig(json) {
    if (!json) {
        return [];
    }
    let src;
    try {
        src = JSON.parse(json);
    } catch (e) {
        return [];
    }
    return Array.isArray(src) ? src.map(toRow) : [];
}

/** Row state → the entry object, dropping keys that carry no signal. */
function buildEntry(row) {
    const key = row.key.trim();
    const out = { key };
    const source = row.source.trim();
    if (source && source !== key) {
        out.source = source;
    }
    const label = row.label.trim();
    if (label) {
        out.label = label;
    }
    if (!row.showLabel) {
        out.showLabel = false;
    }
    // All three views checked means "everywhere" — same as omitting it.
    if (row.views.length && row.views.length < ALL_VIEWS.length) {
        out.views = ALL_VIEWS.filter((v) => row.views.includes(v));
    }
    const truncate = parseInt(row.truncate, 10);
    if (Number.isFinite(truncate) && truncate > 0) {
        out.truncate = truncate;
    }
    return out;
}

/**
 * Record-page helper that edits Cal_Calendar__c.Field_Config__c: an ordered list
 * of extra fields to surface on events, each a key into the event `meta` bag
 * plus the Target Object field to query for it. Writes the JSON array on Save.
 */
export default class CalFieldConfig extends LightningElement {
    @api recordId;

    record;
    rows = [];
    mode = 'view';
    dirty = false;
    saving = false;
    recordError;
    objectInfo;
    objectInfoError;

    viewOptions = VIEW_OPTIONS;

    @wire(getRecord, { recordId: '$recordId', fields: [TARGET_OBJECT_FIELD, FIELD_CONFIG_FIELD] })
    wiredRecord({ data, error }) {
        if (data) {
            this.record = data;
            if (!this.dirty) {
                this.rows = parseConfig(getFieldValue(data, FIELD_CONFIG_FIELD));
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

    get hasRows() {
        return this.rows.length > 0;
    }

    get isEdit() {
        return this.mode === 'edit';
    }

    get showEditButton() {
        return this.hasTargetObject && !this.isEdit;
    }

    /** Condensed read-only lines for the default (view) mode. */
    get summaryRows() {
        return this.rows.map((r) => {
            const name = r.key.trim();
            const restricted = r.views.length > 0 && r.views.length < ALL_VIEWS.length;
            return {
                id: r.id,
                name: name || '(unnamed)',
                from: r.source.trim() || name || '—',
                label: labelSummary(r),
                views: restricted ? r.views.map((v) => VIEW_LABELS[v]).join(', ') : 'All'
            };
        });
    }

    get fieldsSorted() {
        const fields = (this.objectInfo && this.objectInfo.fields) || {};
        return Object.values(fields).sort((a, b) => a.label.localeCompare(b.label));
    }

    /** Every Target Object field as a picker option. */
    get fieldOptions() {
        return this.fieldsSorted.map((f) => ({
            label: `${f.label} (${f.apiName})`,
            value: f.apiName
        }));
    }

    /** Keep a stored value pickable even when it is not a field on the object. */
    withCurrent(options, value) {
        if (!value || options.some((o) => o.value === value)) {
            return options;
        }
        return [...options, { label: `${value} — not found on this object`, value }];
    }

    /** Rows decorated for the template (index, move state, source picker). */
    get displayRows() {
        return this.rows.map((row, i) => ({
            ...row,
            position: i + 1,
            isFirst: i === 0,
            isLast: i === this.rows.length - 1,
            usePicker: !row.customPath,
            sourceOptions: this.withCurrent(this.fieldOptions, row.source),
            viewsValue: row.views.length ? row.views : ALL_VIEWS
        }));
    }

    get configJson() {
        return JSON.stringify(this.rows.map(buildEntry), null, 2);
    }

    /** Blocking problems, shown once the user has started editing. */
    get problems() {
        const keys = this.rows.map((r) => r.key.trim());
        const out = [];
        if (keys.some((k) => !k)) {
            out.push('Every field needs a name.');
        }
        const dupes = [...new Set(keys.filter((k, i) => k && keys.indexOf(k) !== i))];
        if (dupes.length) {
            out.push(`Duplicate name: ${dupes.join(', ')}.`);
        }
        return out;
    }

    get showProblems() {
        return this.dirty && this.problems.length > 0;
    }

    get saveDisabled() {
        return !this.dirty || this.saving || this.problems.length > 0;
    }

    handleEdit() {
        this.mode = 'edit';
    }

    /** Leave edit mode, discarding unsaved changes. */
    handleCancel() {
        this.dirty = false;
        this.rows = parseConfig(getFieldValue(this.record, FIELD_CONFIG_FIELD));
        this.mode = 'view';
    }

    handleChange(event) {
        const { id, prop } = event.target.dataset;
        this.patchRow(id, { [prop]: readValue(event, prop) });
    }

    /** Merge a partial update into one row by id and mark the editor dirty. */
    patchRow(id, patch) {
        this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
        this.dirty = true;
    }

    handleAdd() {
        this.rows = [...this.rows, toRow(null)];
        this.dirty = true;
    }

    handleRowAction(event) {
        const { id, act } = event.target.dataset;
        if (act === 'remove') {
            this.rows = this.rows.filter((row) => row.id !== id);
        } else {
            this.move(id, act === 'up' ? -1 : 1);
        }
        this.dirty = true;
    }

    move(id, delta) {
        const i = this.rows.findIndex((row) => row.id === id);
        const j = i + delta;
        if (j < 0 || j >= this.rows.length) {
            return;
        }
        const next = [...this.rows];
        [next[i], next[j]] = [next[j], next[i]];
        this.rows = next;
    }

    async handleSave() {
        this.saving = true;
        const fields = { Id: this.recordId };
        fields[FIELD_CONFIG_FIELD.fieldApiName] = this.rows.length ? this.configJson : '';
        try {
            await updateRecord({ fields });
            this.dirty = false;
            this.mode = 'view';
            this.toast('Saved', 'Field configuration updated.', 'success');
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

/** How a row's label shows up in the condensed summary. */
function labelSummary(row) {
    if (!row.showLabel) {
        return 'Hidden';
    }
    return row.label.trim() || "Field's own label";
}

/** Pull the new value off a change event by the slot it came from. */
function readValue(event, prop) {
    if (prop === 'showLabel' || prop === 'customPath') {
        return event.target.checked;
    }
    if (prop === 'views') {
        return event.detail.value;
    }
    const detail = event.detail;
    return detail && detail.value !== undefined ? detail.value : event.target.value;
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