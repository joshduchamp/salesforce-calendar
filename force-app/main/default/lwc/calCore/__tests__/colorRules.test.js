import { normalizeEvent, resolveColor, matchRule, activeLegend, DEFAULT_EVENT_COLOR } from 'c/calCore';

const event = (meta) => normalizeEvent({ id: 'a', start: '2026-08-29T09:00:00', meta });

describe('matchRule', () => {
    it('reads keys from the meta bag', () => {
        expect(matchRule(event({ status: 'Scheduled' }), { key: 'status', value: 'Scheduled' })).toBe(
            true
        );
    });

    it('supports operators', () => {
        const e = event({ priority: 5, name: 'Weekly sync' });
        expect(matchRule(e, { key: 'priority', operator: 'greaterThan', value: 3 })).toBe(true);
        expect(matchRule(e, { key: 'name', operator: 'contains', value: 'sync' })).toBe(true);
        expect(matchRule(e, { key: 'status', operator: 'isBlank' })).toBe(true);
    });

    it('reads top-level fields too', () => {
        expect(matchRule(event({}), { key: 'title', operator: 'isBlank' })).toBe(true);
    });
});

describe('resolveColor', () => {
    const colorRules = {
        rules: [
            { key: 'status', value: 'Cancelled', color: '#c23' },
            { key: 'status', value: 'Scheduled', color: '#1b7' }
        ],
        defaultColor: '#888'
    };

    it('returns the first matching rule color', () => {
        expect(resolveColor(event({ status: 'Scheduled' }), colorRules)).toBe('#1b7');
    });

    it('falls back to the calendar color when no rule matches', () => {
        expect(resolveColor(event({ status: 'Done' }), colorRules, { color: '#09c' })).toBe('#09c');
    });

    it('falls back to the configured default with no calendar color', () => {
        expect(resolveColor(event({ status: 'Done' }), colorRules)).toBe('#888');
    });

    it('falls back to the built-in default with no config at all', () => {
        expect(resolveColor(event({}), null)).toBe(DEFAULT_EVENT_COLOR);
    });

    it('lets a rule win over the calendar color', () => {
        expect(resolveColor(event({ status: 'Scheduled' }), colorRules, { color: '#09c' })).toBe(
            '#1b7'
        );
    });
});

describe('activeLegend', () => {
    it('lists only rules that colored at least one event', () => {
        const events = [event({ status: 'Scheduled' }), event({ status: 'Scheduled' })];
        const colorRules = {
            rules: [
                { key: 'status', value: 'Scheduled', color: '#1b7', label: 'Scheduled' },
                { key: 'status', value: 'Cancelled', color: '#c23', label: 'Cancelled' }
            ]
        };
        const legend = activeLegend(events, colorRules);
        expect(legend).toHaveLength(1);
        expect(legend[0]).toMatchObject({ label: 'Scheduled', color: '#1b7', count: 2 });
    });
});
