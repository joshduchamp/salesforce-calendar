import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import COLOR_RULES_FIELD from '@salesforce/schema/Cal_Calendar__c.Color_Rules__c';
import FIELD_CONFIG_FIELD from '@salesforce/schema/Cal_Calendar__c.Field_Config__c';

const DEFAULT_COLOR = '#1b96ff';

const OPERATORS = [
    { label: 'equals', value: 'equals', needsValue: true },
    { label: 'does not equal', value: 'notEquals', needsValue: true },
    { label: 'contains', value: 'contains', needsValue: true },
    { label: 'starts with', value: 'startsWith', needsValue: true },
    { label: 'is one of', value: 'in', needsValue: true, list: true },
    { label: 'greater than', value: 'greaterThan', needsValue: true },
    { label: 'less than', value: 'lessThan', needsValue: true },
    { label: 'is set', value: 'isSet', needsValue: false },
    { label: 'is blank', value: 'isBlank', needsValue: false }
];
const OP = Object.fromEntries(OPERATORS.map((o) => [o.value, o]));

let uid = 0;

function str(v) {
    return v == null ? '' : String(v);
}

/** One stored rule (or a fresh blank one) → editor row state. */
function toRow(src) {
    const raw = src && typeof src === 'object' ? src : {};
    return {
        id: `row-${uid++}`,
        key: str(raw.key),
        operator: OP[raw.operator] ? raw.operator : 'equals',
        value: Array.isArray(raw.value) ? raw.value.join(', ') : str(raw.value),
        label: str(raw.label),
        color: str(raw.color) || DEFAULT_COLOR
    };
}

/** Parse Color_Rules__c JSON; blank/invalid → no rules, no default. */
function parseRules(json) {
    if (!json) {
        return { rows: [], defaultColor: '' };
    }
    let src;
    try {
        src = JSON.parse(json);
    } catch (e) {
        return { rows: [], defaultColor: '' };
    }
    const rules = Array.isArray(src && src.rules) ? src.rules : [];
    return { rows: rules.map(toRow), defaultColor: str(src && src.defaultColor) };
}

/** Every key defined in Field_Config__c — the only keys a rule may test. */
function parseFieldKeys(json) {
    if (!json) {
        return [];
    }
    let src;
    try {
        src = JSON.parse(json);
    } catch (e) {
        return [];
    }
    if (!Array.isArray(src)) {
        return [];
    }
    return src.map((e) => str(e && e.key).trim()).filter(Boolean);
}

/** Row state → the rule object, dropping keys that carry no signal. */
function buildRule(row) {
    const out = { key: row.key.trim(), color: row.color };
    const meta = OP[row.operator];
    if (row.operator !== 'equals') {
        out.operator = row.operator;
    }
    if (meta.needsValue) {
        const value = row.value.trim();
        out.value = meta.list
            ? value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : value;
    }
    const label = row.label.trim();
    if (label) {
        out.label = label;
    }
    return out;
}

/**
 * Record-page helper that edits Cal_Calendar__c.Color_Rules__c: the calendar-wide
 * color coding rules (first match wins) plus the fallback color. Each rule tests
 * one Field_Config key; colors are chosen from a named palette. Writes the JSON
 * object on Save.
 */
export default class CalColorRules extends LightningElement {
    @api recordId;

    record;
    rows = [];
    defaultColor = '';
    fieldKeys = [];
    mode = 'view';
    dirty = false;
    saving = false;
    recordError;

    operatorOptions = OPERATORS.map((o) => ({ label: o.label, value: o.value }));

    @wire(getRecord, { recordId: '$recordId', fields: [COLOR_RULES_FIELD, FIELD_CONFIG_FIELD] })
    wiredRecord({ data, error }) {
        if (data) {
            this.record = data;
            this.fieldKeys = parseFieldKeys(getFieldValue(data, FIELD_CONFIG_FIELD));
            if (!this.dirty) {
                this.reset();
            }
        } else if (error) {
            this.recordError = reduce(error);
        }
    }

    /** Reload rows + default color from the stored field. */
    reset() {
        const parsed = parseRules(getFieldValue(this.record, COLOR_RULES_FIELD));
        this.rows = parsed.rows;
        this.defaultColor = parsed.defaultColor;
    }

    get hasKeys() {
        return this.fieldKeys.length > 0;
    }

    get hasRows() {
        return this.rows.length > 0;
    }

    get isEdit() {
        return this.mode === 'edit';
    }

    get showEditButton() {
        return this.hasKeys && !this.isEdit;
    }

    get keyOptions() {
        return this.fieldKeys.map((k) => ({ label: k, value: k }));
    }

    /** Keep a stored key pickable even after its Field Config entry is gone. */
    keyOptionsWith(value) {
        const options = this.keyOptions;
        if (!value || options.some((o) => o.value === value)) {
            return options;
        }
        return [...options, { label: `${value} — no longer a field`, value }];
    }

    /** Condensed read-only lines for the default (view) mode. */
    get summaryRows() {
        return this.rows.map((row) => ({
            id: row.id,
            color: row.color,
            swatchStyle: `background-color: ${row.color};`,
            field: row.key.trim() || '(none)',
            condition: describe(row),
            label: row.label.trim() || '—'
        }));
    }

    /** Rows decorated for the template (position, move state, value slot). */
    get displayRows() {
        return this.rows.map((row, i) => ({
            ...row,
            position: i + 1,
            isFirst: i === 0,
            isLast: i === this.rows.length - 1,
            keyOptions: this.keyOptionsWith(row.key),
            showValue: OP[row.operator].needsValue,
            valueLabel: OP[row.operator].list ? 'Values (comma-separated)' : 'Value'
        }));
    }

    get configJson() {
        const payload = { rules: this.rows.map(buildRule) };
        if (this.defaultColor) {
            payload.defaultColor = this.defaultColor;
        }
        return JSON.stringify(payload, null, 2);
    }

    get isEmpty() {
        return !this.hasRows && !this.defaultColor;
    }

    get defaultSwatchStyle() {
        return `background-color: ${this.defaultColor || DEFAULT_COLOR};`;
    }

    get defaultColorSummary() {
        return this.defaultColor
            ? 'Default — used when no rule above matches'
            : "Default — falls back to the calendar's own color";
    }

    /** Blocking problems, shown once the user has started editing. */
    get problems() {
        const out = [];
        this.rows.forEach((row, i) => {
            if (!row.key.trim()) {
                out.push(`Rule ${i + 1}: choose a field.`);
            }
            if (OP[row.operator].needsValue && !row.value.trim()) {
                out.push(`Rule ${i + 1}: enter a value.`);
            }
        });
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
        this.reset();
        this.mode = 'view';
    }

    handleChange(event) {
        const { id, prop } = event.target.dataset;
        this.patchRow(id, { [prop]: readValue(event) });
    }

    handleRowColor(event) {
        this.patchRow(event.target.dataset.id, { color: event.detail.value });
    }

    handleDefaultColor(event) {
        this.defaultColor = event.detail.value;
        this.dirty = true;
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
        fields[COLOR_RULES_FIELD.fieldApiName] = this.isEmpty ? '' : this.configJson;
        try {
            await updateRecord({ fields });
            this.dirty = false;
            this.mode = 'view';
            this.toast('Saved', 'Color rules updated.', 'success');
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

/** How a rule's condition reads in the condensed summary. */
function describe(row) {
    const meta = OP[row.operator];
    if (!meta.needsValue) {
        return meta.label;
    }
    return `${meta.label} ${row.value.trim()}`.trim();
}

/** Pull the new value off a combobox or input change event. */
function readValue(event) {
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