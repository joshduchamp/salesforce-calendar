/**
 * Lane packing for horizontal bars: multi-day / all-day events in month rows
 * and in the scheduler's all-day band. Each event is assigned a lane (stacked
 * row) so bars never overlap, plus the column span across the visible days.
 */

import { startOfDay } from './dateRange';
import { lastCoveredDay } from './eventModel';

/**
 * @param {Array} events normalized events (typically all-day / multi-day)
 * @param {Array<Date>} days the visible, ordered day list for the row
 * @returns {{placements: Array<{event, lane, startIndex, endIndex, span}>, laneCount: number}}
 */
export function packLanes(events, days) {
    const dayKeys = days.map((day) => +startOfDay(day));
    const firstKey = dayKeys[0];
    const lastKey = dayKeys[dayKeys.length - 1];
    const lanes = [];
    const placements = [];

    const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
    for (const event of sorted) {
        const eventStartKey = +startOfDay(event.start);
        const eventEndKey = +lastCoveredDay(event);
        if (eventEndKey < firstKey || eventStartKey > lastKey) {
            continue;
        }
        const startIndex = indexOnOrAfter(dayKeys, eventStartKey);
        const endIndex = indexOnOrBefore(dayKeys, eventEndKey);
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            continue;
        }
        let lane = lanes.findIndex((segments) =>
            segments.every((seg) => seg.endIndex < startIndex || seg.startIndex > endIndex)
        );
        if (lane === -1) {
            lane = lanes.length;
            lanes.push([]);
        }
        lanes[lane].push({ startIndex, endIndex });
        placements.push({
            event,
            lane,
            startIndex,
            endIndex,
            span: endIndex - startIndex + 1,
            continuesBefore: eventStartKey < firstKey,
            continuesAfter: eventEndKey > lastKey
        });
    }

    return { placements, laneCount: lanes.length };
}

function indexOnOrAfter(sortedKeys, key) {
    for (let i = 0; i < sortedKeys.length; i += 1) {
        if (sortedKeys[i] >= key) {
            return i;
        }
    }
    return -1;
}

function indexOnOrBefore(sortedKeys, key) {
    for (let i = sortedKeys.length - 1; i >= 0; i -= 1) {
        if (sortedKeys[i] <= key) {
            return i;
        }
    }
    return -1;
}