/**
 * calCore — pure, DOM-free logic shared by every calendar component
 * (date math, layout packing, color + field resolution, the event model).
 *
 * Import as: `import { visibleRange, packColumns } from 'c/calCore';`
 */

export * from './dateRange';
export * from './eventModel';
export * from './overlapLayout';
export * from './spanLayout';
export * from './colorRules';
export * from './fieldConfig';
export { getEventValue, clamp } from './access';
