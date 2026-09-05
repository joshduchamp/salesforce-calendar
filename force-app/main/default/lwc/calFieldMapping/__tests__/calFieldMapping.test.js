import { createElement } from 'lwc';
import CalFieldMapping from 'c/calFieldMapping';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

const OBJECT_INFO = {
    apiName: 'Event',
    fields: {
        Subject: { apiName: 'Subject', label: 'Subject', dataType: 'String' },
        Description: { apiName: 'Description', label: 'Description', dataType: 'TextArea' },
        StartDateTime: { apiName: 'StartDateTime', label: 'Start', dataType: 'DateTime' },
        EndDateTime: { apiName: 'EndDateTime', label: 'End', dataType: 'DateTime' },
        ActivityDate: { apiName: 'ActivityDate', label: 'Due Date', dataType: 'Date' },
        IsAllDayEvent: { apiName: 'IsAllDayEvent', label: 'All-Day Event', dataType: 'Boolean' },
        WhatId: { apiName: 'WhatId', label: 'Related To ID', dataType: 'Reference' }
    }
};

function record(targetObject, fieldMappings) {
    return {
        apiName: 'Cal_Calendar__c',
        id: 'a01000000000001',
        fields: {
            Target_Object__c: { value: targetObject, displayValue: null },
            Field_Mappings__c: { value: fieldMappings, displayValue: null }
        }
    };
}

function setup() {
    const element = createElement('c-cal-field-mapping', { is: CalFieldMapping });
    element.recordId = 'a01000000000001';
    document.body.appendChild(element);
    return element;
}

function flush() {
    return Promise.resolve().then(() => Promise.resolve());
}

/** Emit both wires and settle. */
async function load(targetObject, fieldMappings) {
    const element = setup();
    getRecord.emit(record(targetObject, fieldMappings));
    getObjectInfo.emit(OBJECT_INFO);
    await flush();
    return element;
}

/** Click the header pencil to open the guided picker. */
async function openEditor(element) {
    element.shadowRoot.querySelector('.edit-toggle').click();
    await flush();
}

function combobox(element, slot) {
    return element.shadowRoot.querySelector(`lightning-combobox[data-slot="${slot}"]`);
}

function summaryText(element) {
    return [...element.shadowRoot.querySelectorAll('.summary tr')].map((tr) => [
        tr.querySelector('th').textContent,
        tr.querySelector('td').textContent
    ]);
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

describe('c-cal-field-mapping', () => {
    it('prompts for a Target Object when none is set', async () => {
        const element = await load(null, null);
        expect(element.shadowRoot.querySelector('.hint')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.edit-toggle')).toBeNull();
        expect(combobox(element, 'title')).toBeNull();
    });

    it('defaults to a condensed read-only summary of the stored mapping', async () => {
        const element = await load(
            'Event',
            '{"title":"Subject","start":"StartDateTime","allDay":true,"recordId":"Id"}'
        );

        expect(combobox(element, 'title')).toBeNull();
        expect(element.shadowRoot.querySelector('.save')).toBeNull();
        expect(summaryText(element)).toEqual([
            ['Title', 'Subject'],
            ['Start', 'StartDateTime'],
            ['End', 'Point in time (no end)'],
            ['All-day', 'Always all-day'],
            ['Record link', 'This record (Id)']
        ]);
    });

    it('opens the guided picker from the header pencil', async () => {
        const element = await load('Event', '{"title":"Subject","start":"StartDateTime"}');
        expect(combobox(element, 'title')).toBeNull();

        await openEditor(element);
        expect(combobox(element, 'title')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.save')).not.toBeNull();
        expect(element.shadowRoot.querySelector('.edit-toggle')).toBeNull();
    });

    it('renders a combobox per slot with options filtered by field type', async () => {
        const element = await load('Event', null);
        await openEditor(element);

        expect(combobox(element, 'title').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['Subject', 'Description', 'WhatId'])
        );
        const startValues = combobox(element, 'start').options.map((o) => o.value);
        expect(startValues).toEqual(expect.arrayContaining(['StartDateTime', 'ActivityDate']));
        expect(startValues).not.toContain('Subject');
        expect(combobox(element, 'allDay').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['__true__', '__false__', 'IsAllDayEvent'])
        );
        expect(combobox(element, 'recordId').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['Id', 'WhatId'])
        );
    });

    it('seeds the pickers from the stored mapping', async () => {
        const element = await load(
            'Event',
            '{"title":"Subject","start":"StartDateTime","allDay":true}'
        );
        await openEditor(element);

        expect(combobox(element, 'title').value).toBe('Subject');
        expect(combobox(element, 'allDay').value).toBe('__true__');
    });

    it('keeps Save disabled until title and start are chosen', async () => {
        const element = await load('Event', null);
        await openEditor(element);

        const button = element.shadowRoot.querySelector('.save');
        expect(button.disabled).toBe(true);

        combobox(element, 'title').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Subject' } })
        );
        await flush();
        expect(button.disabled).toBe(true);

        combobox(element, 'start').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'StartDateTime' } })
        );
        await flush();
        expect(button.disabled).toBe(false);
    });

    it('writes Field_Mappings__c JSON on Save, toasts, and returns to the summary', async () => {
        const element = await load('Event', '{"title":"Subject","start":"StartDateTime"}');
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);

        combobox(element, 'end').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'EndDateTime' } })
        );
        await flush();
        element.shadowRoot.querySelector('.save').click();
        await flush();

        const { fields } = updateRecord.mock.calls[0][0];
        expect(fields.Id).toBe('a01000000000001');
        expect(JSON.parse(fields.Field_Mappings__c)).toEqual({
            title: 'Subject',
            start: 'StartDateTime',
            end: 'EndDateTime'
        });
        expect(toast.mock.calls[0][0].detail.variant).toBe('success');
        expect(combobox(element, 'title')).toBeNull();
        expect(element.shadowRoot.querySelector('.summary')).not.toBeNull();
    });

    it('shows an error toast and stays in the editor when the save is rejected', async () => {
        updateRecord.mockRejectedValue({ body: { message: 'title="Bad" is unknown' } });
        const element = await load('Event', '{"title":"Subject","start":"StartDateTime"}');
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        await openEditor(element);

        combobox(element, 'title').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Description' } })
        );
        await flush();
        element.shadowRoot.querySelector('.save').click();
        await flush();

        expect(toast.mock.calls[0][0].detail.variant).toBe('error');
        expect(toast.mock.calls[0][0].detail.message).toBe('title="Bad" is unknown');
        expect(combobox(element, 'title')).not.toBeNull();
    });

    it('discards edits and returns to the summary on Cancel', async () => {
        const element = await load('Event', '{"title":"Subject","start":"StartDateTime"}');
        await openEditor(element);

        combobox(element, 'title').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Description' } })
        );
        await flush();

        element.shadowRoot.querySelector('.cancel').click();
        await flush();

        expect(summaryText(element)[0]).toEqual(['Title', 'Subject']);

        await openEditor(element);
        expect(combobox(element, 'title').value).toBe('Subject');
    });
});