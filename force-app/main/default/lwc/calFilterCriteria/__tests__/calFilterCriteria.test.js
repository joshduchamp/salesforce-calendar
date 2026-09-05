import { createElement } from 'lwc';
import CalFilterCriteria from 'c/calFilterCriteria';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import checkFilter from '@salesforce/apex/CalFilterController.checkFilter';

jest.mock(
    '@salesforce/apex/CalFilterController.checkFilter',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

const OBJECT_INFO = {
    apiName: 'Event',
    fields: {
        OwnerId: { apiName: 'OwnerId', label: 'Assigned To ID', dataType: 'Reference' },
        ShowAs: { apiName: 'ShowAs', label: 'Show Time As', dataType: 'Picklist' },
        Subject: { apiName: 'Subject', label: 'Subject', dataType: 'String' }
    }
};

function record(targetObject, filter) {
    return {
        apiName: 'Cal_Calendar__c',
        id: 'a01000000000001',
        fields: {
            Target_Object__c: { value: targetObject, displayValue: null },
            Filter_Criteria__c: { value: filter, displayValue: null }
        }
    };
}

function flush() {
    return Promise.resolve().then(() => Promise.resolve());
}

async function load(targetObject = 'Event', filter = null) {
    const element = createElement('c-cal-filter-criteria', { is: CalFilterCriteria });
    element.recordId = 'a01000000000001';
    document.body.appendChild(element);
    getRecord.emit(record(targetObject, filter));
    getObjectInfo.emit(OBJECT_INFO);
    await flush();
    return element;
}

async function openEditor(element) {
    element.shadowRoot.querySelector('.edit-toggle').click();
    await flush();
}

function textarea(element) {
    return element.shadowRoot.querySelector('lightning-textarea.editor');
}

function setDraft(element, value) {
    const field = textarea(element);
    field.value = value;
    field.dispatchEvent(new CustomEvent('change', { detail: { value } }));
}

beforeEach(() => {
    updateRecord.mockResolvedValue({});
    checkFilter.mockReset();
});

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
});

describe('read view', () => {
    it('shows the stored fragment', async () => {
        const element = await load('Event', "OwnerId = $CURRENT_USER_ID AND ShowAs = 'Busy'");
        expect(element.shadowRoot.querySelector('.fragment').textContent).toContain(
            '$CURRENT_USER_ID'
        );
    });

    it('explains that a blank filter shows everything', async () => {
        const element = await load('Event', null);
        expect(element.shadowRoot.querySelector('.empty').textContent).toContain('every Event');
        expect(element.shadowRoot.querySelector('.fragment')).toBeNull();
    });

    it('prompts for a target object when none is set', async () => {
        const element = await load(null, null);
        expect(element.shadowRoot.querySelector('.edit-toggle')).toBeNull();
        expect(element.shadowRoot.querySelector('.hint').textContent).toContain('Target Object');
    });
});

describe('edit view', () => {
    it('lists the special placeholders and an example', async () => {
        const element = await load();
        await openEditor(element);
        const tokens = [...element.shadowRoot.querySelectorAll('.token-btn')].map((b) =>
            b.textContent.trim()
        );
        expect(tokens).toEqual(['$CURRENT_USER_ID', '$RANGE_START', '$RANGE_END']);
        expect(element.shadowRoot.querySelector('.example-line').textContent).toContain(
            'OwnerId = $CURRENT_USER_ID'
        );
    });

    it('appends a placeholder to the draft when its chip is clicked', async () => {
        const element = await load('Event', 'ShowAs = \'Busy\'');
        await openEditor(element);
        element.shadowRoot
            .querySelector('.token-btn[data-token="$CURRENT_USER_ID"]')
            .click();
        await flush();
        expect(textarea(element).value).toBe("ShowAs = 'Busy' $CURRENT_USER_ID ");
    });

    it('appends a field API name when its row is clicked', async () => {
        const element = await load('Event', '');
        await openEditor(element);
        element.shadowRoot.querySelector('.field-btn[data-token="OwnerId"]').click();
        await flush();
        expect(textarea(element).value).toBe('OwnerId ');
    });

    it('filters the field list', async () => {
        const element = await load();
        await openEditor(element);
        const search = element.shadowRoot.querySelector('lightning-input.field-search');
        search.value = 'owner';
        search.dispatchEvent(new CustomEvent('change', { detail: { value: 'owner' } }));
        await flush();
        const fields = [...element.shadowRoot.querySelectorAll('.field-btn')].map((b) =>
            b.textContent.trim()
        );
        expect(fields).toEqual(['OwnerId']);
    });
});

describe('syntax check', () => {
    it('reports a valid fragment', async () => {
        checkFilter.mockResolvedValue({ valid: true, message: null });
        const element = await load('Event', 'ShowAs = \'Busy\'');
        await openEditor(element);
        element.shadowRoot.querySelector('.check').click();
        await flush();
        expect(checkFilter).toHaveBeenCalledWith({
            targetObject: 'Event',
            filterCriteria: "ShowAs = 'Busy'"
        });
        expect(element.shadowRoot.querySelector('.check-ok').textContent).toContain('Valid');
    });

    it('reports the compile error for an invalid fragment', async () => {
        checkFilter.mockResolvedValue({ valid: false, message: 'does not compile: unexpected token' });
        const element = await load('Event', 'ShowAs = = Busy');
        await openEditor(element);
        element.shadowRoot.querySelector('.check').click();
        await flush();
        expect(element.shadowRoot.querySelector('.check-bad').textContent).toContain(
            'does not compile'
        );
    });

    it('clears a stale check result when the draft changes', async () => {
        checkFilter.mockResolvedValue({ valid: true, message: null });
        const element = await load('Event', 'ShowAs = \'Busy\'');
        await openEditor(element);
        element.shadowRoot.querySelector('.check').click();
        await flush();
        setDraft(element, 'ShowAs = ');
        await flush();
        expect(element.shadowRoot.querySelector('.check-ok')).toBeNull();
        expect(element.shadowRoot.querySelector('.check-bad')).toBeNull();
    });
});

describe('save', () => {
    it('writes the trimmed fragment and returns to the read view', async () => {
        const element = await load('Event', '');
        await openEditor(element);
        setDraft(element, "  OwnerId = $CURRENT_USER_ID  ");
        await flush();
        element.shadowRoot.querySelector('.save').click();
        await flush();
        expect(updateRecord.mock.calls[0][0].fields.Filter_Criteria__c).toBe(
            'OwnerId = $CURRENT_USER_ID'
        );
        expect(updateRecord.mock.calls[0][0].fields.Id).toBe('a01000000000001');
        await flush();
        expect(textarea(element)).toBeNull();
    });

    it('keeps Save disabled until the draft is edited', async () => {
        const element = await load('Event', 'ShowAs = \'Busy\'');
        await openEditor(element);
        expect(element.shadowRoot.querySelector('.save').disabled).toBe(true);
        setDraft(element, 'ShowAs = \'Free\'');
        await flush();
        expect(element.shadowRoot.querySelector('.save').disabled).toBe(false);
    });

    it('discards the draft on cancel', async () => {
        const element = await load('Event', 'ShowAs = \'Busy\'');
        await openEditor(element);
        setDraft(element, 'nonsense');
        await flush();
        element.shadowRoot.querySelector('.cancel').click();
        await flush();
        expect(element.shadowRoot.querySelector('.fragment').textContent).toContain(
            "ShowAs = 'Busy'"
        );
    });
});