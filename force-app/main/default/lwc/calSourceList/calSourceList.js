import { LightningElement, api } from 'lwc';

/**
 * The list of calendars with per-calendar show/hide checkboxes. Emits
 * `calendarvisibilitychange` with the toggled calendar and the full set of
 * currently-visible ids so the host can persist state and/or narrow its fetch.
 */
export default class CalSourceList extends LightningElement {
    /** [{ id, label, color, visible }] */
    @api calendars = [];
    @api heading = 'Calendars';

    get items() {
        return (this.calendars || []).map((calendar) => ({
            id: calendar.id,
            label: calendar.label,
            visible: calendar.visible !== false,
            style: `--cal-source-color: ${calendar.color || '#1b96ff'};`
        }));
    }

    get hasCalendars() {
        return this.items.length > 0;
    }

    handleToggle(event) {
        const { id } = event.target.dataset;
        const visible = event.target.checked;
        const visibleCalendarIds = this.items
            .map((item) => (item.id === id ? { ...item, visible } : item))
            .filter((item) => item.visible)
            .map((item) => item.id);

        this.dispatchEvent(
            new CustomEvent('calendarvisibilitychange', {
                detail: { calendarId: id, visible, visibleCalendarIds }
            })
        );
    }
}
