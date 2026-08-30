/**
 * Date math for the calendar. Native `Date` + `Intl` only, no third-party
 * library. All functions are pure and operate in the browser's local timezone.
 */

export const MS_PER_MINUTE = 60000;
export const MS_PER_DAY = 86400000;

export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function addDays(date, amount) {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
}

export function addMonths(date, amount) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + amount);
    return d;
}

export function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function isToday(date, now = new Date()) {
    return isSameDay(date, now);
}

export function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

export function startOfWeek(date, firstDayOfWeek = 0) {
    const d = startOfDay(date);
    const offset = (d.getDay() - firstDayOfWeek + 7) % 7;
    return addDays(d, -offset);
}

export function startOfMonth(date) {
    const d = startOfDay(date);
    d.setDate(1);
    return d;
}

export function endOfMonth(date) {
    const d = startOfMonth(date);
    d.setMonth(d.getMonth() + 1);
    return addDays(d, -1);
}

/**
 * The date range a view covers: the day itself, the containing week, or the
 * full weeks that make up the month grid.
 */
export function visibleRange(view, date, { firstDayOfWeek = 0 } = {}) {
    const d = new Date(date);
    if (view === 'day') {
        return { start: startOfDay(d), end: endOfDay(d) };
    }
    if (view === 'week') {
        const start = startOfWeek(d, firstDayOfWeek);
        return { start, end: endOfDay(addDays(start, 6)) };
    }
    const gridStart = startOfWeek(startOfMonth(d), firstDayOfWeek);
    const gridEnd = addDays(startOfWeek(endOfMonth(d), firstDayOfWeek), 6);
    return { start: gridStart, end: endOfDay(gridEnd) };
}

/** Every day (as a midnight Date) between start and end, inclusive. */
export function eachDay(start, end, { hideWeekends = false } = {}) {
    const days = [];
    let cursor = startOfDay(start);
    const last = startOfDay(end);
    while (cursor <= last) {
        if (!hideWeekends || !isWeekend(cursor)) {
            days.push(new Date(cursor));
        }
        cursor = addDays(cursor, 1);
    }
    return days;
}

/** The month grid as rows of days. */
export function weekRows(monthDate, { firstDayOfWeek = 0, hideWeekends = false } = {}) {
    const { start, end } = visibleRange('month', monthDate, { firstDayOfWeek });
    const days = eachDay(start, end, { hideWeekends });
    const perRow = hideWeekends ? 5 : 7;
    const rows = [];
    for (let i = 0; i < days.length; i += perRow) {
        rows.push(days.slice(i, i + perRow));
    }
    return rows;
}

/** Move the focused date one step backward (-1) or forward (1) for a view. */
export function step(view, date, direction) {
    if (view === 'day') {
        return addDays(date, direction);
    }
    if (view === 'week') {
        return addDays(date, 7 * direction);
    }
    return addMonths(date, direction);
}

/** Ordered weekday header labels honoring the first day of week. */
export function weekdayNames(
    { firstDayOfWeek = 0, hideWeekends = false, locale, format = 'short' } = {}
) {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: format });
    const base = startOfWeek(new Date(2023, 0, 1), firstDayOfWeek); // 2023-01-01 is a Sunday
    const names = [];
    for (let i = 0; i < 7; i += 1) {
        const day = addDays(base, i);
        if (!hideWeekends || !isWeekend(day)) {
            names.push({ index: day.getDay(), label: formatter.format(day) });
        }
    }
    return names;
}

/** Human-readable title for the current range. */
export function rangeTitle(view, date, { locale, firstDayOfWeek = 0 } = {}) {
    const d = new Date(date);
    if (view === 'day') {
        return new Intl.DateTimeFormat(locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(d);
    }
    if (view === 'week') {
        const start = startOfWeek(d, firstDayOfWeek);
        const end = addDays(start, 6);
        const sameYear = start.getFullYear() === end.getFullYear();
        const sameMonth = sameYear && start.getMonth() === end.getMonth();
        const monthName = (value) =>
            new Intl.DateTimeFormat(locale, { month: 'short' }).format(value);
        const startText = `${monthName(start)} ${start.getDate()}`;
        const endText = sameMonth
            ? `${end.getDate()}`
            : `${monthName(end)} ${end.getDate()}`;
        return `${startText} – ${endText}, ${end.getFullYear()}`;
    }
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
}

export function formatTime(date, { locale, hour12 } = {}) {
    return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: date.getMinutes() ? '2-digit' : undefined,
        hour12
    }).format(date);
}
