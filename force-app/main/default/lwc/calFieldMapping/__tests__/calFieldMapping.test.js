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

function combobox(element, slot) {
    return element.shadowRoot.querySelector(`lightning-combobox[data-slot="${slot}"]`);
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
});

describe('c-cal-field-mapping', () => {
    it('prompts for a Target Object when none is set', async () => {
        const element = setup();
        getRecord.emit(record(null, null));
        await flush();
        expect(element.shadowRoot.querySelector('.hint')).not.toBeNull();
        expect(combobox(element, 'title')).toBeNull();
    });

    it('renders a combobox per slot with options filtered by field type', async () => {
        const element = setup();
        getRecord.emit(record('Event', null));
        getObjectInfo.emit(OBJECT_INFO);
        await flush();

        expect(combobox(element, 'title').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['Subject', 'Description', 'WhatId'])
        );
        // start accepts date/datetime only
        const startValues = combobox(element, 'start').options.map((o) => o.value);
        expect(startValues).toEqual(expect.arrayContaining(['StartDateTime', 'ActivityDate']));
        expect(startValues).not.toContain('Subject');
        // allDay offers the literal choices plus boolean fields
        expect(combobox(element, 'allDay').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['__true__', '__false__', 'IsAllDayEvent'])
        );
        // recordId offers "this record" plus reference fields
        expect(combobox(element, 'recordId').options.map((o) => o.value)).toEqual(
            expect.arrayContaining(['Id', 'WhatId'])
        );
    });

    it('seeds the pickers and JSON preview from the stored mapping', async () => {
        const element = setup();
        getRecord.emit(
            record('Event', '{"title":"Subject","start":"StartDateTime","allDay":true}')
        );
        getObjectInfo.emit(OBJECT_INFO);
        await flush();

        expect(combobox(element, 'title').value).toBe('Subject');
        expect(combobox(element, 'allDay').value).toBe('__true__');
        const preview = JSON.parse(element.shadowRoot.querySelector('pre').textContent);
        expect(preview).toEqual({ title: 'Subject', start: 'StartDateTime', allDay: true });
    });

    it('keeps Save disabled until title and start are chosen', async () => {
        const element = setup();
        getRecord.emit(record('Event', null));
        getObjectInfo.emit(OBJECT_INFO);
        await flush();

        const button = element.shadowRoot.querySelector('lightning-button');
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

    it('writes Field_Mappings__c JSON on Save and shows a success toast', async () => {
        updateRecord.mockResolvedValue({});
        const element = setup();
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        getRecord.emit(record('Event', '{"title":"Subject","start":"StartDateTime"}'));
        getObjectInfo.emit(OBJECT_INFO);
        await flush();

        combobox(element, 'end').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'EndDateTime' } })
        );
        await flush();
        element.shadowRoot.querySelector('lightning-button').click();
        await flush();

        const { fields } = updateRecord.mock.calls[0][0];
        expect(fields.Id).toBe('a01000000000001');
        expect(JSON.parse(fields.Field_Mappings__c)).toEqual({
            title: 'Subject',
            start: 'StartDateTime',
            end: 'EndDateTime'
        });
        expect(toast.mock.calls[0][0].detail.variant).toBe('success');
    });

    it('shows an error toast when the save is rejected', async () => {
        updateRecord.mockRejectedValue({ body: { message: 'title="Bad" is unknown' } });
        const element = setup();
        const toast = jest.fn();
        element.addEventListener('lightning__showtoast', toast);
        getRecord.emit(record('Event', '{"title":"Subject","start":"StartDateTime"}'));
        getObjectInfo.emit(OBJECT_INFO);
        await flush();

        combobox(element, 'title').dispatchEvent(
            new CustomEvent('change', { detail: { value: 'Description' } })
        );
        await flush();
        element.shadowRoot.querySelector('lightning-button').click();
        await flush();

        expect(toast.mock.calls[0][0].detail.variant).toBe('error');
        expect(toast.mock.calls[0][0].detail.message).toBe('title="Bad" is unknown');
    });
});