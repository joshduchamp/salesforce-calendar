import {
    startOfWeek,
    visibleRange,
    eachDay,
    weekRows,
    step,
    weekdayNames,
    rangeTitle,
    isSameDay
} from 'c/calCore';

describe('startOfWeek', () => {
    it('defaults to Sunday', () => {
        // 2026-08-29 is a Saturday
        expect(startOfWeek(new Date(2026, 7, 29))).toEqual(new Date(2026, 7, 23, 0, 0, 0, 0));
    });

    it('honors a Monday start', () => {
        expect(startOfWeek(new Date(2026, 7, 29), 1)).toEqual(new Date(2026, 7, 24, 0, 0, 0, 0));
    });
});

describe('visibleRange', () => {
    it('covers a single day', () => {
        const { start, end } = visibleRange('day', new Date(2026, 7, 29, 15));
        expect(start).toEqual(new Date(2026, 7, 29, 0, 0, 0, 0));
        expect(end).toEqual(new Date(2026, 7, 29, 23, 59, 59, 999));
    });

    it('covers the containing week', () => {
        const { start, end } = visibleRange('week', new Date(2026, 7, 29), { firstDayOfWeek: 1 });
        expect(start).toEqual(new Date(2026, 7, 24, 0, 0, 0, 0));
        expect(end).toEqual(new Date(2026, 7, 30, 23, 59, 59, 999));
    });

    it('expands the month to whole weeks', () => {
        // August 2026: 1st is a Saturday, 31st is a Monday
        const { start, end } = visibleRange('month', new Date(2026, 7, 15));
        expect(start).toEqual(new Date(2026, 6, 26, 0, 0, 0, 0)); // Sun Jul 26
        expect(end).toEqual(new Date(2026, 8, 5, 23, 59, 59, 999)); // Sat Sep 5
    });
});

describe('eachDay', () => {
    it('is inclusive of both ends', () => {
        const days = eachDay(new Date(2026, 7, 1), new Date(2026, 7, 3));
        expect(days).toHaveLength(3);
    });

    it('drops weekends when asked', () => {
        const days = eachDay(new Date(2026, 7, 28), new Date(2026, 8, 1), { hideWeekends: true });
        // Fri Aug 28, (skip Sat/Sun), Mon Aug 31, Tue Sep 1
        expect(days.map((d) => d.getDate())).toEqual([28, 31, 1]);
    });
});

describe('weekRows', () => {
    it('returns rows of 7 by default', () => {
        const rows = weekRows(new Date(2026, 7, 15));
        expect(rows.every((row) => row.length === 7)).toBe(true);
        expect(rows).toHaveLength(6);
    });

    it('returns rows of 5 with weekends hidden', () => {
        const rows = weekRows(new Date(2026, 7, 15), { hideWeekends: true });
        expect(rows.every((row) => row.length === 5)).toBe(true);
    });
});

describe('step', () => {
    it('moves by day / week / month', () => {
        expect(step('day', new Date(2026, 7, 29), 1)).toEqual(new Date(2026, 7, 30));
        expect(step('week', new Date(2026, 7, 29), -1)).toEqual(new Date(2026, 7, 22));
        expect(step('month', new Date(2026, 7, 29), 1).getMonth()).toBe(8);
    });
});

describe('weekdayNames', () => {
    it('starts on the configured day', () => {
        const names = weekdayNames({ firstDayOfWeek: 1, locale: 'en-US' });
        expect(names[0].label).toBe('Mon');
        expect(names).toHaveLength(7);
    });

    it('omits weekend columns when hidden', () => {
        const names = weekdayNames({ firstDayOfWeek: 1, hideWeekends: true, locale: 'en-US' });
        expect(names).toHaveLength(5);
        expect(names.map((n) => n.label)).not.toContain('Sun');
    });
});

describe('rangeTitle', () => {
    it('formats a month', () => {
        expect(rangeTitle('month', new Date(2026, 7, 15), { locale: 'en-US' })).toBe('August 2026');
    });

    it('formats a cross-month week', () => {
        // Week of Sun 2026-08-30 .. Sat 2026-09-05
        expect(rangeTitle('week', new Date(2026, 7, 30), { locale: 'en-US', firstDayOfWeek: 0 })).toBe(
            'Aug 30 – Sep 5, 2026'
        );
    });

    it('formats a within-month week', () => {
        // Week of Sun 2026-08-23 .. Sat 2026-08-29
        expect(rangeTitle('week', new Date(2026, 7, 29), { locale: 'en-US', firstDayOfWeek: 0 })).toBe(
            'Aug 23 – 29, 2026'
        );
    });
});

describe('isSameDay', () => {
    it('ignores the time component', () => {
        expect(isSameDay(new Date(2026, 7, 29, 1), new Date(2026, 7, 29, 23))).toBe(true);
        expect(isSameDay(new Date(2026, 7, 29), new Date(2026, 7, 30))).toBe(false);
    });
});
