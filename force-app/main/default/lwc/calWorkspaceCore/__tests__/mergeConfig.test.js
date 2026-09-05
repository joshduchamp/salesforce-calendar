import { mergeColorRules, mergeFieldConfig, resolveDisplayConfig } from 'c/calWorkspaceCore';

describe('mergeColorRules', () => {
    it('concatenates rules primary-first and takes defaultColor from the primary', () => {
        const primary = {
            colorRules: { rules: [{ key: 'a', value: '1', color: '#a' }], defaultColor: '#primary' }
        };
        const other = {
            colorRules: { rules: [{ key: 'b', value: '2', color: '#b' }], defaultColor: '#other' }
        };
        const merged = mergeColorRules([primary, other]);
        expect(merged.rules.map((r) => r.key)).toEqual(['a', 'b']);
        expect(merged.defaultColor).toBe('#primary');
    });

    it('drops duplicate rules by key/operator/value', () => {
        const a = { colorRules: { rules: [{ key: 'k', value: 'x', color: '#1' }] } };
        const b = { colorRules: { rules: [{ key: 'k', value: 'x', color: '#2' }] } };
        expect(mergeColorRules([a, b]).rules).toHaveLength(1);
    });

    it('ignores calendars with no color rules', () => {
        expect(mergeColorRules([{}, { colorRules: null }]).rules).toEqual([]);
    });
});

describe('mergeFieldConfig', () => {
    it('unions by key, first occurrence wins, order preserved', () => {
        const a = { fieldConfig: [{ key: 'loc', label: 'A' }, { key: 'own', label: 'Owner' }] };
        const b = { fieldConfig: [{ key: 'loc', label: 'B' }, { key: 'cand', label: 'Cand' }] };
        const merged = mergeFieldConfig([a, b]);
        expect(merged.map((e) => e.key)).toEqual(['loc', 'own', 'cand']);
        expect(merged[0].label).toBe('A');
    });
});

describe('resolveDisplayConfig', () => {
    it('keeps set values and omits null/undefined so component defaults win', () => {
        const resolved = resolveDisplayConfig({
            displayConfig: {
                view: 'week',
                layout: null,
                firstDayOfWeek: 0,
                hideWeekends: true,
                schedulerStartHour: undefined
            }
        });
        expect(resolved).toEqual({ view: 'week', firstDayOfWeek: 0, hideWeekends: true });
    });

    it('returns an empty object when there is no preference', () => {
        expect(resolveDisplayConfig(null)).toEqual({});
    });
});
