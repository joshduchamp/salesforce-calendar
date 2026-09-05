import { createElement } from 'lwc';
import CalColorRules from 'c/calColorRules';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';

const FIELD_CONFIG = '[{"key":"status"},{"key":"priority"}]';

function record(colorRules, fieldConfig = FIELD_CONFIG) {
    return {
        apiName: 'Cal_Calendar__c',
        id: 'a01000000000001',
        fields: {
            Color_Rules__c: { value: colorRules, displayValue: null },
            Field_Config__c: { value: fieldConfig, displayValue: null }
        }
    };
}

function flush() {
    return Promise.resolve().then(() => Promise.resolve());
}

async function load(colorRules, fieldConfig) {
    const element = createElement('c-cal-color-rules', { is: CalColorRules });
    element.recordId = 'a01000000000001';
    document.body.appendChild(element);
    getRecord.emit(record(colorRules, fieldConfig));
    await flush();
    return element;
}

async function openEditor(element) {
    element.shadowRoot.querySelector('.edit-toggle').click();
    await flush();
}

function input(element, id, prop) {
    return element.shadowRoot.querySelector(`[data-id="${id}"][data-prop="${prop}"]`);
}

function rowIds(element) {
    return [...element.shadowRoot.querySelectorAll('.entry')].map(
        (el) => el.querySelector('[data-prop="key"]').dataset.id
    );
}

function summaryText(element) {
    return [...element.shadowRoot.querySelectorAll('.summary tbody tr')].map((tr) =>
        [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())
    );
}

async function saveRules(element) {
    element.shadowRoot.querySelector('.save').click();
    await flush();
    return JSON.parse(updateRecord.mock.calls[0][0].fields.Color_Rules__c);
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

describe('c-cal-color-rules', () => {
    it('prompts for Field Configuration keys when none exist', async () => {
        const element = await load(null, '[]');
        expect(element.shadowRoot.querySelector('.hint')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.edit-toggle')).toBeNull();
    });

    it('defaults to a condensed read-only summary', async () => {
        const element = await load(
            JSON.stringify({
                rules: [
                    { key: 'status', value: 'Cancelled', color: '#ba0517', label: 'Cancelled' },
                    { key: 'priority', operator: 'isSet', color: '#2e844a' }
                ],
                defaultColor: '#1b96ff'
            })
        );

        expect(element.shadowRoot.querySelector('.entry')).toBeNull();
        expect(summaryText(element)).toEqual([
            ['', 'status', 'equals Cancelled', 'Cancelled'],
            ['', 'priority', 'is set', '—'],
            ['', 'Default — used when no rule above matches']
        ]);
    });

    it('shows just the default color when nothing is configured', async () => {
        const element = await load(null);
        expect(element.shadowRoot.querySelector('.empty')).toBeNull();
        expect(summaryText(element)).toEqual([
            ['', "Default — falls back to the calendar's own color"]
        ]);
    });

    it('opens the full editor from the header pencil', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'X', color: '#ba0517' }] }));
        await openEditor(element);
        expect(rowIds(element)).toHaveLength(1);
        expect(element.shadowRoot.querySelector('.save')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.edit-toggle')).toBeNull();
    });

    it('seeds editor rows from the stored rules', async () => {
        const element = await load(
            JSON.stringify({ rules: [{ key: 'status', operator: 'contains', value: 'X', color: '#ba0517', label: 'L' }] })
        );
        await openEditor(element);
        const [id] = rowIds(element);
        expect(input(element, id, 'key').value).toBe('status');
        expect(input(element, id, 'operator').value).toBe('contains');
        expect(input(element, id, 'value').value).toBe('X');
        expect(input(element, id, 'label').value).toBe('L');
    });

    it('hides the value input for operators that take no value', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', operator: 'isBlank', color: '#ba0517' }] }));
        await openEditor(element);
        const [id] = rowIds(element);
        expect(input(element, id, 'value')).toBeNull();
    });

    it('writes the color rules JSON on Save, omitting equals and empty label', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'Cancelled', color: '#ba0517' }] }));
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);

        expect(await saveRules(element)).toEqual({
            rules: [{ key: 'status', color: '#ba0517', value: 'Cancelled' }]
        });
        expect(updateRecord.mock.calls[0][0].fields.Id).toBe('a01000000000001');
        expect(toast.mock.calls[0][0].detail.variant).toBe('success');
        expect(element.shadowRoot.querySelector('.entry')).toBeNull();
    });

    it('splits an "is one of" value into an array', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', operator: 'in', value: 'A, B', color: '#ba0517' }] }));
        await openEditor(element);
        expect(await saveRules(element)).toEqual({
            rules: [{ key: 'status', operator: 'in', color: '#ba0517', value: ['A', 'B'] }]
        });
    });

    it('takes a color from the picker', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'X', color: '#ba0517' }] }));
        await openEditor(element);
        const [id] = rowIds(element);
        element.shadowRoot
            .querySelector(`c-cal-color-picker[data-id="${id}"]`)
            .dispatchEvent(new CustomEvent('change', { detail: { value: '#2e844a' } }));
        await flush();
        expect((await saveRules(element)).rules[0].color).toBe('#2e844a');
    });

    it('keeps Save disabled until every rule has a field and a value', async () => {
        const element = await load(null);
        await openEditor(element);
        element.shadowRoot.querySelector('.add').click();
        await flush();

        const button = element.shadowRoot.querySelector('.save');
        expect(button.disabled).toBe(true);
        expect(element.shadowRoot.querySelector('.problems').textContent).toContain('choose a field');

        const [id] = rowIds(element);
        input(element, id, 'key').dispatchEvent(new CustomEvent('change', { detail: { value: 'status' } }));
        input(element, id, 'value').dispatchEvent(new CustomEvent('change', { detail: { value: 'Cancelled' } }));
        await flush();
        expect(button.disabled).toBe(false);
    });

    it('adds, removes and reorders rules', async () => {
        const element = await load(
            JSON.stringify({
                rules: [
                    { key: 'status', value: 'A', color: '#ba0517' },
                    { key: 'priority', value: 'B', color: '#2e844a' }
                ]
            })
        );
        await openEditor(element);

        const [first, second] = rowIds(element);
        element.shadowRoot
            .querySelector(`lightning-button-icon[data-id="${second}"][data-act="up"]`)
            .click();
        await flush();
        expect(rowIds(element)).toEqual([second, first]);

        element.shadowRoot
            .querySelector(`lightning-button-icon[data-id="${first}"][data-act="remove"]`)
            .click();
        await flush();
        expect(rowIds(element)).toEqual([second]);
    });

    it('persists the default color even with no rules', async () => {
        const element = await load(null);
        await openEditor(element);
        element.shadowRoot
            .querySelector('.default-block c-cal-color-picker')
            .dispatchEvent(new CustomEvent('change', { detail: { value: '#5c5c66' } }));
        await flush();
        expect(await saveRules(element)).toEqual({ rules: [], defaultColor: '#5c5c66' });
    });

    it('writes an empty string when there are no rules and no default', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'X', color: '#ba0517' }] }));
        await openEditor(element);
        const [id] = rowIds(element);
        element.shadowRoot
            .querySelector(`lightning-button-icon[data-id="${id}"][data-act="remove"]`)
            .click();
        await flush();
        element.shadowRoot.querySelector('.save').click();
        await flush();
        expect(updateRecord.mock.calls[0][0].fields.Color_Rules__c).toBe('');
    });

    it('keeps a stored key selectable after its Field Config entry is gone', async () => {
        const element = await load(
            JSON.stringify({ rules: [{ key: 'gone', value: 'X', color: '#ba0517' }] })
        );
        await openEditor(element);
        const [id] = rowIds(element);
        const combo = element.shadowRoot.querySelector(
            `lightning-combobox[data-id="${id}"][data-prop="key"]`
        );
        expect(combo.value).toBe('gone');
        expect(combo.options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['status', 'priority', 'gone'])
        );
    });

    it('shows an error toast and stays in the editor when the save is rejected', async () => {
        updateRecord.mockRejectedValue({ body: { message: 'rule key "status" is not a Field Config key' } });
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'X', color: '#ba0517' }] }));
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);
        element.shadowRoot.querySelector('.save').click();
        await flush();

        expect(toast.mock.calls[0][0].detail.variant).toBe('error');
        expect(element.shadowRoot.querySelector('.entry')).not.toBeNull();
    });

    it('discards edits and returns to the summary on Cancel', async () => {
        const element = await load(JSON.stringify({ rules: [{ key: 'status', value: 'Cancelled', color: '#ba0517' }] }));
        await openEditor(element);
        const [id] = rowIds(element);
        input(element, id, 'value').dispatchEvent(new CustomEvent('change', { detail: { value: 'changed' } }));
        await flush();

        element.shadowRoot.querySelector('.cancel').click();
        await flush();
        expect(summaryText(element)).toEqual([
            ['', 'status', 'equals Cancelled', '—'],
            ['', "Default — falls back to the calendar's own color"]
        ]);
    });
});