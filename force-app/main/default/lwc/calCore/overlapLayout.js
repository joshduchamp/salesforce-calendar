/**
 * Column packing for overlapping timed events in the scheduler layout.
 * Events in a cluster of mutually-overlapping events are spread across the
 * minimum number of side-by-side columns.
 */

import { startOfDay, endOfDay } from './dateRange';
import { clamp } from './access';

/**
 * @param {Array} events normalized timed events for a single day
 * @returns {Array<{event, columnIndex, columnCount}>}
 */
export function packColumns(events) {
    const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
    const result = [];
    let cluster = [];
    let clusterEnd = -Infinity;

    const flush = () => {
        if (!cluster.length) {
            return;
        }
        const columns = [];
        const placements = [];
        for (const event of cluster) {
            let columnIndex = columns.findIndex((col) => +col[col.length - 1].end <= +event.start);
            if (columnIndex === -1) {
                columnIndex = columns.length;
                columns.push([]);
            }
            columns[columnIndex].push(event);
            placements.push({ event, columnIndex });
        }
        for (const placement of placements) {
            result.push({ ...placement, columnCount: columns.length });
        }
        cluster = [];
    };

    for (const event of sorted) {
        if (cluster.length && +event.start >= clusterEnd) {
            flush();
            clusterEnd = -Infinity;
        }
        cluster.push(event);
        clusterEnd = Math.max(clusterEnd, +event.end);
    }
    flush();

    return result;
}

/**
 * Vertical position of an event within a day column, as fractions (0..1) of the
 * visible hour window.
 */
export function eventBand(event, day, { startHour = 0, endHour = 24 } = {}) {
    const windowStart = startHour * 60;
    const windowMinutes = (endHour - startHour) * 60;
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const from = event.start < dayStart ? dayStart : event.start;
    const to = event.end > dayEnd ? dayEnd : event.end;
    const top = clamp((minutesOfDay(from) - windowStart) / windowMinutes, 0, 1);
    const bottom = clamp((minutesOfDay(to) - windowStart) / windowMinutes, 0, 1);
    return { top, height: Math.max(bottom - top, 0) };
}

function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export { minutesOfDay };