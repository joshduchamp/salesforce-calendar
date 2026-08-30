import { LightningElement } from 'lwc';

/**
 * Standalone demo host for `calCalendar`: hardcoded sample events, calendars,
 * field config and color rules. Shows how a host wires the calendar without any
 * SObject dependency. For manual testing in a scratch org.
 */
function iso(dayOffset, hour = 0, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

export default class CalDemo extends LightningElement {
    calendars = [
        { id: 'team', label: 'Team', color: '#1b96ff', visible: true },
        { id: 'personal', label: 'Personal', color: '#9050e9', visible: true },
        { id: 'oncall', label: 'On-call', color: '#fe9339', visible: true },
        { id: 'assessments', label: 'Assessments', color: '#5867e8', visible: true }
    ];

    events = [
        {
            id: 'e1',
            calendarId: 'team',
            title: 'Sprint planning',
            start: iso(0, 9, 0),
            end: iso(0, 10, 30),
            meta: { status: 'Scheduled', location: 'Room 4', owner: 'Dana' }
        },
        {
            id: 'e2',
            calendarId: 'team',
            title: 'Design review',
            start: iso(0, 10, 0),
            end: iso(0, 11, 0),
            meta: { status: 'Tentative', location: 'Zoom', owner: 'Lee' }
        },
        {
            id: 'e3',
            calendarId: 'personal',
            title: 'Dentist',
            start: iso(1, 14, 0),
            end: iso(1, 15, 0),
            meta: { status: 'Confirmed', location: 'Downtown' }
        },
        {
            id: 'e4',
            calendarId: 'oncall',
            title: 'On-call rotation',
            start: iso(-1, 0, 0),
            end: iso(3, 0, 0),
            allDay: true,
            meta: { status: 'Scheduled', owner: 'Sam' }
        },
        {
            id: 'e5',
            calendarId: 'team',
            title: 'All-hands',
            start: iso(2, 16, 0),
            end: iso(2, 17, 0),
            recordId: '001000000000000AAA',
            meta: { status: 'Scheduled', location: 'Auditorium' }
        },
        {
            id: 'e6',
            calendarId: 'personal',
            title: 'Focus block',
            start: iso(2, 13, 0),
            end: iso(2, 15, 30),
            meta: { status: 'Cancelled' }
        },
        // A deliberately busy day (+3 from today) to exercise the "+N more" overflow.
        {
            id: 'b1',
            calendarId: 'team',
            title: 'Standup',
            start: iso(3, 9, 0),
            end: iso(3, 9, 15),
            meta: { status: 'Scheduled', location: 'Zoom' }
        },
        {
            id: 'b2',
            calendarId: 'team',
            title: 'Roadmap sync',
            start: iso(3, 10, 0),
            end: iso(3, 11, 0),
            meta: { status: 'Scheduled', location: 'Room 2', owner: 'Dana' }
        },
        {
            id: 'b3',
            calendarId: 'personal',
            title: 'Lunch with Alex',
            start: iso(3, 12, 0),
            end: iso(3, 13, 0),
            meta: { status: 'Confirmed', location: 'Cafe' }
        },
        {
            id: 'b4',
            calendarId: 'team',
            title: 'Bug triage',
            start: iso(3, 13, 30),
            end: iso(3, 14, 0),
            meta: { status: 'Tentative', owner: 'Lee' }
        },
        {
            id: 'b5',
            calendarId: 'oncall',
            title: 'Incident review',
            start: iso(3, 14, 30),
            end: iso(3, 15, 30),
            meta: { status: 'Scheduled', owner: 'Sam' }
        },
        {
            id: 'b6',
            calendarId: 'personal',
            title: 'Gym',
            start: iso(3, 17, 0),
            end: iso(3, 18, 0),
            meta: { status: 'Confirmed' }
        },
        {
            id: 'b7',
            calendarId: 'team',
            title: 'Release cut',
            start: iso(3, 18, 30),
            end: iso(3, 19, 0),
            meta: { status: 'Scheduled', location: 'Zoom' }
        },
        // Assessments calendar: each event carries a status that drives its color.
        {
            id: 'as1',
            calendarId: 'assessments',
            title: 'Cognitive assessment',
            start: iso(-6, 10, 0),
            end: iso(-6, 11, 0),
            meta: { assessmentStatus: 'Complete', candidate: 'Jordan Reyes' }
        },
        {
            id: 'as2',
            calendarId: 'assessments',
            title: 'Skills assessment',
            start: iso(-2, 13, 0),
            end: iso(-2, 14, 0),
            meta: { assessmentStatus: 'No Show', candidate: 'Priya Nair' }
        },
        {
            id: 'as3',
            calendarId: 'assessments',
            title: 'Behavioral assessment',
            start: iso(1, 9, 0),
            end: iso(1, 10, 0),
            meta: { assessmentStatus: 'Scheduled', candidate: 'Aisha Khan' }
        },
        {
            id: 'as4',
            calendarId: 'assessments',
            title: 'Cognitive assessment',
            start: iso(2, 15, 0),
            end: iso(2, 16, 0),
            meta: { assessmentStatus: 'Canceled', candidate: 'Ruth Adler' }
        },
        {
            id: 'as5',
            calendarId: 'assessments',
            title: 'Skills assessment',
            start: iso(3, 11, 0),
            end: iso(3, 12, 0),
            meta: { assessmentStatus: 'Scheduled', candidate: 'Bea Lund' }
        },
        {
            id: 'as6',
            calendarId: 'assessments',
            title: 'Behavioral assessment',
            start: iso(4, 14, 0),
            end: iso(4, 15, 0),
            meta: { assessmentStatus: 'Scheduled', candidate: 'Omar Diaz' }
        }
    ];

    fieldConfig = [
        { key: 'location', label: 'Where', showLabel: false },
        { key: 'owner', label: 'Owner', showLabel: true, views: ['scheduler', 'condensed'] },
        { key: 'candidate', label: 'Candidate', showLabel: false },
        {
            key: 'assessmentStatus',
            label: 'Status',
            showLabel: true,
            views: ['scheduler', 'condensed']
        }
    ];

    colorRules = {
        rules: [
            { key: 'status', value: 'Cancelled', color: '#c9394a', label: 'Cancelled' },
            { key: 'status', value: 'Tentative', color: '#b0adab', label: 'Tentative' },
            {
                key: 'assessmentStatus',
                value: 'Scheduled',
                color: '#1b96ff',
                label: 'Assessment · Scheduled'
            },
            {
                key: 'assessmentStatus',
                value: 'Complete',
                color: '#2e844a',
                label: 'Assessment · Complete'
            },
            {
                key: 'assessmentStatus',
                value: 'Canceled',
                color: '#706e6b',
                label: 'Assessment · Canceled'
            },
            {
                key: 'assessmentStatus',
                value: 'No Show',
                color: '#ea001e',
                label: 'Assessment · No Show'
            }
        ],
        defaultColor: '#1b96ff'
    };

    handleRangeChange(event) {
        // eslint-disable-next-line no-console
        console.log('rangechange', event.detail);
    }

    handleEventClick(event) {
        // eslint-disable-next-line no-console
        console.log('eventclick', event.detail.event.title);
    }

    handleEventOpen(event) {
        // eslint-disable-next-line no-console
        console.log('eventopen', event.detail.event.title);
    }

    handleVisibilityChange(event) {
        // eslint-disable-next-line no-console
        console.log('calendarvisibilitychange', event.detail);
    }
}
