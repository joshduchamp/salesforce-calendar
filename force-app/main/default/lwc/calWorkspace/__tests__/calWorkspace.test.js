import { createElement } from 'lwc';
import CalWorkspace from 'c/calWorkspace';
import getWorkspace from '@salesforce/apex/CalWorkspaceController.getWorkspace';
import getEvents from '@salesforce/apex/CalWorkspaceController.getEvents';
import savePreferences from '@salesforce/apex/CalWorkspaceController.savePreferences';

jest.mock(
    '@salesforce/apex/CalWorkspaceController.getWorkspace',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/CalWorkspaceController.getEvents',
    () => ({ default: jest.fn(() => Promise.resolve({ events: [], truncated: false })) }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/CalWorkspaceController.savePreferences',
    () => ({ default: jest.fn((args) => Promise.resolve({ ...JSON.parse(args.prefsJson) })) }),
    { virtual: true }
);

const WORKSPACE = {
    maxCalendarsPerFetch: 25,
    calendars: [
        {
            id: 'a',
            label: 'Team',
            color: '#1b96ff',
            visibility: 'Public',
            isMine: true,
            description: 'The team calendar',
            fieldConfigJson: '[{"key":"loc","source":"Location","label":"Where"}]',
            colorRulesJson: '{"rules":[{"key":"loc","value":"Room 4","color":"#c00"}],"defaultColor":"#1b96ff"}'
        }
    ],
    preferences: { selectedCalendarIds: ['a'], primaryCalendarId: 'a', displayConfig: { view: 'week' } }
};

function flush() {
    return Promise.resolve()
        .then(() => Promise.resolve())
        .then(() => Promise.resolve());
}

async function load(workspace = WORKSPACE) {
    getWorkspace.mockResolvedValue(workspace);
    const element = createElement('c-cal-workspace', { is: CalWorkspace });
    document.body.appendChild(element);
    await flush();
    return element;
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
});

describe('c-cal-workspace', () => {
    it('reads the workspace imperatively (never a cacheable wire)', async () => {
        await load();
        expect(getWorkspace).toHaveBeenCalledTimes(1);
        expect(getWorkspace.mock.calls[0]).toEqual([]);
    });

    it('renders the picker and calendar with the loaded preferences', async () => {
        const element = await load();
        expect(element.shadowRoot.querySelector('c-cal-calendar-picker')).not.toBeNull();
        const calendar = element.shadowRoot.querySelector('c-cal-calendar');
        expect(calendar).not.toBeNull();
        expect(calendar.calendars).toEqual([{ id: 'a', label: 'Team', color: '#1b96ff', visible: true }]);
        expect(calendar.view).toBe('week');
    });

    it('loads the workspace only once even if reconnected', async () => {
        const element = await load();
        document.body.removeChild(element);
        document.body.appendChild(element);
        await flush();
        expect(getWorkspace).toHaveBeenCalledTimes(1);
    });

    it('autosaves preference changes once, debounced', async () => {
        const element = await load();
        const calendar = element.shadowRoot.querySelector('c-cal-calendar');
        calendar.dispatchEvent(new CustomEvent('viewchange', { detail: { view: 'day' } }));
        calendar.dispatchEvent(new CustomEvent('layoutchange', { detail: { layout: 'condensed' } }));
        const picker = element.shadowRoot.querySelector('c-cal-calendar-picker');
        picker.dispatchEvent(new CustomEvent('primarychange', { detail: { primaryId: 'a' } }));

        jest.advanceTimersByTime(999);
        expect(savePreferences).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        await flush();

        expect(savePreferences).toHaveBeenCalledTimes(1);
        const sent = JSON.parse(savePreferences.mock.calls[0][0].prefsJson);
        expect(sent.primaryCalendarId).toBe('a');
        expect(sent.view).toBe('day');
        expect(sent.layout).toBe('condensed');
    });

    it('autosaves a selection change, and flushes a pending save on teardown', async () => {
        const element = await load({
            ...WORKSPACE,
            preferences: { selectedCalendarIds: [], displayConfig: {} }
        });
        const picker = element.shadowRoot.querySelector('c-cal-calendar-picker');
        picker.dispatchEvent(
            new CustomEvent('calendarselectionchange', { detail: { selectedIds: ['a'] } })
        );
        await flush();

        // change is still within the debounce window
        expect(savePreferences).not.toHaveBeenCalled();

        document.body.removeChild(element);
        await flush();

        expect(savePreferences).toHaveBeenCalledTimes(1);
        expect(JSON.parse(savePreferences.mock.calls[0][0].prefsJson).selectedCalendarIds).toEqual([
            'a'
        ]);
    });

    it('keeps the selection the user chose even if the save response is empty', async () => {
        savePreferences.mockResolvedValueOnce({ selectedCalendarIds: [], primaryCalendarId: null });
        const element = await load({
            ...WORKSPACE,
            preferences: { selectedCalendarIds: [], displayConfig: {} }
        });
        const picker = element.shadowRoot.querySelector('c-cal-calendar-picker');
        picker.dispatchEvent(
            new CustomEvent('calendarselectionchange', { detail: { selectedIds: ['a'] } })
        );
        jest.advanceTimersByTime(1000);
        await flush();

        // the calendar must still be selected/rendered
        expect(element.shadowRoot.querySelector('c-cal-calendar')).not.toBeNull();
        expect(element.shadowRoot.querySelector('c-cal-calendar').calendars).toEqual([
            { id: 'a', label: 'Team', color: '#1b96ff', visible: true }
        ]);
    });

    it('fetches events for the range emitted by the calendar', async () => {
        getEvents.mockResolvedValueOnce({
            events: [
                {
                    id: 'a:1',
                    calendarId: 'a',
                    title: 'Sync',
                    start: '2026-08-31T15:00:00Z',
                    endsAt: '2026-08-31T16:00:00Z',
                    allDay: false,
                    recordId: '1',
                    meta: {}
                }
            ],
            truncated: false
        });
        const element = await load();
        const calendar = element.shadowRoot.querySelector('c-cal-calendar');
        calendar.dispatchEvent(
            new CustomEvent('rangechange', {
                detail: { view: 'month', start: '2026-08-01T00:00:00Z', end: '2026-09-05T00:00:00Z' }
            })
        );
        jest.advanceTimersByTime(250);
        await flush();

        expect(getEvents).toHaveBeenCalledWith({
            calendarIds: ['a'],
            rangeStart: '2026-08-01T00:00:00Z',
            rangeEnd: '2026-09-05T00:00:00Z'
        });
        await flush();
        expect(element.shadowRoot.querySelector('c-cal-calendar').events).toHaveLength(1);
    });

    it('ignores stale event responses', async () => {
        let resolveFirst;
        getEvents.mockImplementationOnce(() => new Promise((res) => (resolveFirst = res)));
        getEvents.mockResolvedValueOnce({
            events: [
                {
                    id: 'a:2',
                    calendarId: 'a',
                    title: 'Fresh',
                    start: '2026-08-31T15:00:00Z',
                    endsAt: '2026-08-31T16:00:00Z',
                    allDay: false,
                    recordId: '2',
                    meta: {}
                }
            ],
            truncated: false
        });
        const element = await load();
        const calendar = element.shadowRoot.querySelector('c-cal-calendar');

        calendar.dispatchEvent(
            new CustomEvent('rangechange', {
                detail: { view: 'month', start: '2026-08-01T00:00:00Z', end: '2026-09-01T00:00:00Z' }
            })
        );
        jest.advanceTimersByTime(250);
        await flush();

        calendar.dispatchEvent(
            new CustomEvent('rangechange', {
                detail: { view: 'month', start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z' }
            })
        );
        jest.advanceTimersByTime(250);
        await flush();

        resolveFirst({
            events: [{ id: 'a:stale', calendarId: 'a', title: 'Stale', start: 'x', endsAt: 'x', meta: {} }]
        });
        await flush();

        const events = element.shadowRoot.querySelector('c-cal-calendar').events;
        expect(events).toHaveLength(1);
        expect(events[0].title).toBe('Fresh');
    });
});
