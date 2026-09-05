import { createElement } from 'lwc';
import CalFieldConfig from 'c/calFieldConfig';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

const OBJECT_INFO = {
    apiName: 'Event',
    fields: {
        Location: { apiName: 'Location', label: 'Location', dataType: 'String' },
        Description: { apiName: 'Description', label: 'Description', dataType: 'TextArea' },
        Subject: { apiName: 'Subject', label: 'Subject', dataType: 'String' }
    }
};

function record(targetObject, fieldConfig) {
    return {
        apiName: 'Cal_Calendar__c',
        id: 'a01000000000001',
        fields: {
            Target_Object__c: { value: targetObject, displayValue: null },
            Field_Config__c: { value: fieldConfig, displayValue: null }
        }
    };
}

function setup() {
    const element = createElement('c-cal-field-config', { is: CalFieldConfig });
    element.recordId = 'a01000000000001';
    document.body.appendChild(element);
    return element;
}

function flush() {
    return Promise.resolve().then(() => Promise.resolve());
}

/** Emit both wires and settle. */
async function load(targetObject, fieldConfig) {
    const element = setup();
    getRecord.emit(record(targetObject, fieldConfig));
    getObjectInfo.emit(OBJECT_INFO);
    await flush();
    return element;
}

/** Click the header pencil to open the full editor. */
async function openEditor(element) {
    element.shadowRoot.querySelector('.edit-toggle').click();
    await flush();
}

function input(element, id, prop) {
    return element.shadowRoot.querySelector(`[data-id="${id}"][data-prop="${prop}"]`);
}

function rowIds(element) {
    return [...element.shadowRoot.querySelectorAll('.entry')].map((el) =>
        el.querySelector('[data-prop="key"]').dataset.id
    );
}

function summaryText(element) {
    return [...element.shadowRoot.querySelectorAll('.summary tbody tr')].map((tr) =>
        [...tr.querySelectorAll('td')].map((td) => td.textContent)
    );
}

/** Click Save and return the JSON written to Field_Config__c. */
async function saveConfig(element) {
    element.shadowRoot.querySelector('.save').click();
    await flush();
    return JSON.parse(updateRecord.mock.calls[0][0].fields.Field_Config__c);
}

beforeEach(() => {
    updateRecord.mockResolvedValue({});
});

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
});

describe('c-cal-field-config', () => {
    it('prompts for a Target Object when none is set', async () => {
        const element = await load(null, null);
        expect(element.shadowRoot.querySelector('.hint')).not.toBeNull();
        expect(
            element.shadowRoot.querySelector('.edit-toggle')
        ).toBeNull();
    });

    it('defaults to a condensed read-only summary', async () => {
        const element = await load(
            'Event',
            '[{"key":"where","source":"Location","label":"Where","views":["scheduler"]},' +
                '{"key":"owner","source":"Owner.Name","showLabel":false}]'
        );

        expect(element.shadowRoot.querySelector('.entry')).toBeNull();
        expect(element.shadowRoot.querySelector('.save')).toBeNull();
        expect(summaryText(element)).toEqual([
            ['where', 'Location', 'Where', 'Scheduler'],
            ['owner', 'Owner.Name', 'Hidden', 'All']
        ]);
    });

    it('shows an empty-state line when nothing is configured', async () => {
        const element = await load('Event', null);
        expect(element.shadowRoot.querySelector('.empty')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.summary')).toBeNull();
    });

    it('opens the full editor from the header pencil', async () => {
        const element = await load('Event', '[{"key":"where","source":"Location"}]');
        expect(element.shadowRoot.querySelector('.entry')).toBeNull();

        await openEditor(element);
        expect(rowIds(element)).toHaveLength(1);
        expect(element.shadowRoot.querySelector('.save')).not.toBeNull();
        expect(
            element.shadowRoot.querySelector('.edit-toggle')
        ).toBeNull();
    });

    it('seeds the editor rows from the stored config', async () => {
        const element = await load(
            'Event',
            '[{"key":"where","source":"Location","label":"Where","showLabel":false,"views":["scheduler"]}]'
        );
        await openEditor(element);

        const [id] = rowIds(element);
        expect(input(element, id, 'key').value).toBe('where');
        expect(input(element, id, 'source').value).toBe('Location');
        expect(input(element, id, 'label').value).toBe('Where');
        expect(input(element, id, 'showLabel').checked).toBe(false);
    });

    it('drops source when it equals the name and drops an all-views selection', async () => {
        const element = await load('Event', '[{"key":"Location","source":"Location"}]');
        await openEditor(element);

        const [id] = rowIds(element);
        input(element, id, 'views').dispatchEvent(
            new CustomEvent('change', { detail: { value: ['month', 'condensed', 'scheduler'] } })
        );
        await flush();
        expect(await saveConfig(element)).toEqual([{ key: 'Location' }]);
    });

    it('adds and removes rows', async () => {
        const element = await load('Event', null);
        await openEditor(element);

        element.shadowRoot.querySelector('.add').click();
        await flush();
        expect(rowIds(element)).toHaveLength(1);

        const [id] = rowIds(element);
        element.shadowRoot
            .querySelector(`lightning-button-icon[data-id="${id}"][data-act="remove"]`)
            .click();
        await flush();
        expect(rowIds(element)).toHaveLength(0);
    });

    it('reorders rows with the move buttons', async () => {
        const element = await load('Event', '[{"key":"a"},{"key":"b"}]');
        await openEditor(element);

        const [first, second] = rowIds(element);
        element.shadowRoot
            .querySelector(`lightning-button-icon[data-id="${second}"][data-act="up"]`)
            .click();
        await flush();
        expect(rowIds(element)).toEqual([second, first]);
        expect(await saveConfig(element)).toEqual([{ key: 'b' }, { key: 'a' }]);
    });

    it('keeps Save disabled while a name is blank or duplicated', async () => {
        const element = await load('Event', '[{"key":"a"}]');
        await openEditor(element);

        const button = element.shadowRoot.querySelector('.save');
        element.shadowRoot.querySelector('.add').click();
        await flush();
        expect(button.disabled).toBe(true);

        const [, id] = rowIds(element);
        const key = input(element, id, 'key');
        key.value = 'a';
        key.dispatchEvent(new CustomEvent('change'));
        await flush();
        expect(button.disabled).toBe(true);
        expect(element.shadowRoot.querySelector('.problems').textContent).toContain('Duplicate');
    });

    it('writes Field_Config__c JSON on Save, toasts, and returns to the summary', async () => {
        const element = await load('Event', '[{"key":"where","source":"Location"}]');
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);

        const [id] = rowIds(element);
        input(element, id, 'label').value = 'Where';
        input(element, id, 'label').dispatchEvent(new CustomEvent('change'));
        await flush();

        const saved = await saveConfig(element);
        expect(updateRecord.mock.calls[0][0].fields.Id).toBe('a01000000000001');
        expect(saved).toEqual([{ key: 'where', source: 'Location', label: 'Where' }]);
        expect(toast.mock.calls[0][0].detail.variant).toBe('success');
        expect(element.shadowRoot.querySelector('.entry')).toBeNull();
        expect(element.shadowRoot.querySelector('.summary')).not.toBeNull();
    });

    it('shows an error toast and stays in the editor when the save is rejected', async () => {
        updateRecord.mockRejectedValue({ body: { message: 'source "Nope" is unknown' } });
        const element = await load('Event', '[{"key":"where","source":"Location"}]');
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);

        const [id] = rowIds(element);
        input(element, id, 'source').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Subject' } })
        );
        await flush();
        element.shadowRoot.querySelector('.save').click();
        await flush();

        expect(toast.mock.calls[0][0].detail.variant).toBe('error');
        expect(toast.mock.calls[0][0].detail.message).toBe('source "Nope" is unknown');
        expect(element.shadowRoot.querySelector('.entry')).not.toBeNull();
    });

    it('discards edits and returns to the summary on Cancel', async () => {
        const element = await load('Event', '[{"key":"where","source":"Location"}]');
        await openEditor(element);

        const [id] = rowIds(element);
        input(element, id, 'key').value = 'changed';
        input(element, id, 'key').dispatchEvent(new CustomEvent('change'));
        await flush();

        element.shadowRoot.querySelector('.cancel').click();
        await flush();

        expect(summaryText(element)).toEqual([['where', 'Location', "Field's own label", 'All']]);

        await openEditor(element);
        expect(input(element, rowIds(element)[0], 'key').value).toBe('where');
    });

    it('offers the Target Object fields in the source picker and keeps an unknown value', async () => {
        const element = await load('Event', '[{"key":"x","source":"Nope"}]');
        await openEditor(element);

        const [id] = rowIds(element);
        const combo = element.shadowRoot.querySelector(
            `lightning-combobox[data-id="${id}"][data-prop="source"]`
        );
        expect(combo.value).toBe('Nope');
        expect(combo.options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['Location', 'Description', 'Subject', 'Nope'])
        );
    });

    it('uses a free-text path for a dotted source', async () => {
        const element = await load('Event', '[{"key":"owner","source":"Owner.Name"}]');
        await openEditor(element);

        const [id] = rowIds(element);
        expect(input(element, id, 'customPath').checked).toBe(true);
        expect(
            element.shadowRoot.querySelector(`lightning-combobox[data-id="${id}"][data-prop="source"]`)
        ).toBeNull();
        expect(input(element, id, 'source').value).toBe('Owner.Name');
    });

    it('switches a row to a free-text path when Custom lookup path is toggled on', async () => {
        const element = await load('Event', '[{"key":"where","source":"Location"}]');
        await openEditor(element);

        const [id] = rowIds(element);
        const toggle = input(element, id, 'customPath');
        toggle.checked = true;
        toggle.dispatchEvent(new CustomEvent('change'));
        await flush();

        expect(
            element.shadowRoot.querySelector(`lightning-combobox[data-id="${id}"][data-prop="source"]`)
        ).toBeNull();
        expect(input(element, id, 'source').value).toBe('Location');
    });
});