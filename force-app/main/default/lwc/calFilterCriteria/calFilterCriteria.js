import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import checkFilter from '@salesforce/apex/CalFilterController.checkFilter';
import TARGET_OBJECT_FIELD from '@salesforce/schema/Cal_Calendar__c.Target_Object__c';
import FILTER_FIELD from '@salesforce/schema/Cal_Calendar__c.Filter_Criteria__c';

/** The placeholders the harness expands to bind variables at query time. */
const PLACEHOLDERS = [
    {
        token: '$CURRENT_USER_ID',
        meaning: "The running user's Id — use it wherever an Id is expected, e.g. OwnerId = $CURRENT_USER_ID."
    },
    {
        token: '$RANGE_START',
        meaning: 'Start of the date range currently visible in the calendar (a Datetime).'
    },
    {
        token: '$RANGE_END',
        meaning: 'End of the visible date range (a Datetime).'
    }
];

const EXAMPLE = "OwnerId = $CURRENT_USER_ID AND ShowAs = 'Busy'";
const MAX_LENGTH = 2000;

function reduce(error) {
    if (!error) {
        return 'Unknown error';
    }
    if (error.body && error.body.message) {
        return error.body.message;
    }
    return error.message || String(error);
}

/**
 * Record-page helper that edits Cal_Calendar__c.Filter_Criteria__c: the optional
 * SOQL WHERE fragment applied to every calendar query. Read-only summary by
 * default; a pencil opens a textarea with the special-placeholder reference, the
 * target object's field list, and a server-side syntax check. Writes the field
 * on Save.
 */
export default class CalFilterCriteria extends LightningElement {
    @api recordId;

    record;
    objectInfo;
    objectInfoError;
    recordError;

    mode = 'view';
    draft = '';
    dirty = false;
    saving = false;
    checking = false;
    checkResult;
    fieldFilter = '';

    placeholders = PLACEHOLDERS;
    example = EXAMPLE;

    @wire(getRecord, { recordId: '$recordId', fields: [TARGET_OBJECT_FIELD, FILTER_FIELD] })
    wiredRecord({ data, error }) {
        if (data) {
            this.record = data;
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

    get storedFilter() {
        return (this.record && getFieldValue(this.record, FILTER_FIELD)) || '';
    }

    get hasFilter() {
        return !!this.storedFilter.trim();
    }

    get emptySummary() {
        return `No filter — every ${this.targetObject || 'record'} in the visible range is shown.`;
    }

    get editorLabel() {
        return `WHERE fragment for ${this.targetObject}`;
    }

    get maxLength() {
        return MAX_LENGTH;
    }

    /** Target Object fields as an alphabetised, searchable list. */
    get fieldRows() {
        const fields = (this.objectInfo && this.objectInfo.fields) || {};
        const query = this.fieldFilter.trim().toLowerCase();
        return Object.values(fields)
            .filter(
                (f) =>
                    !query ||
                    f.apiName.toLowerCase().includes(query) ||
                    (f.label || '').toLowerCase().includes(query)
            )
            .sort((a, b) => a.apiName.localeCompare(b.apiName))
            .map((f) => ({ apiName: f.apiName, label: f.label }));
    }

    get noFieldMatches() {
        return !!this.objectInfo && !!this.fieldFilter.trim() && this.fieldRows.length === 0;
    }

    get checkClass() {
        return this.checkResult && this.checkResult.valid ? 'check-ok' : 'check-bad';
    }

    get checkText() {
        if (!this.checkResult) {
            return '';
        }
        if (!this.checkResult.valid) {
            return this.checkResult.message;
        }
        return this.draft.trim()
            ? `Valid WHERE fragment for ${this.targetObject}.`
            : 'Empty — no filter will be applied.';
    }

    get saveDisabled() {
        return !this.dirty || this.saving || this.checking;
    }

    handleEdit() {
        this.draft = this.storedFilter;
        this.checkResult = undefined;
        this.mode = 'edit';
    }

    /** Leave edit mode, discarding unsaved changes. */
    handleCancel() {
        this.dirty = false;
        this.checkResult = undefined;
        this.draft = this.storedFilter;
        this.mode = 'view';
    }

    handleDraftChange(event) {
        this.draft = event.target.value;
        this.dirty = true;
        this.checkResult = undefined;
    }

    handleFieldFilter(event) {
        this.fieldFilter = event.target.value;
    }

    /** Append a placeholder or field API name at the end of the draft. */
    handleInsertToken(event) {
        const token = event.target.dataset.token;
        const needsSpace = this.draft && !this.draft.endsWith(' ');
        this.draft = `${this.draft}${needsSpace ? ' ' : ''}${token} `;
        this.dirty = true;
        this.checkResult = undefined;
        const textarea = this.template.querySelector('lightning-textarea.editor');
        if (textarea) {
            textarea.focus();
        }
    }

    async handleCheck() {
        this.checking = true;
        try {
            this.checkResult = await checkFilter({
                targetObject: this.targetObject,
                filterCriteria: this.draft
            });
        } catch (e) {
            this.checkResult = { valid: false, message: reduce(e) };
        } finally {
            this.checking = false;
        }
    }

    async handleSave() {
        this.saving = true;
        const fields = { Id: this.recordId };
        fields[FILTER_FIELD.fieldApiName] = this.draft.trim();
        try {
            await updateRecord({ fields });
            this.dirty = false;
            this.mode = 'view';
            this.toast('Saved', 'Filter criteria updated.', 'success');
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