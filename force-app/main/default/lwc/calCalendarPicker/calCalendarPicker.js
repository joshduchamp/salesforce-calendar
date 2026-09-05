import { LightningElement, api } from 'lwc';

/**
 * Chooses which calendar definitions the workspace should load, grouped into
 * "My calendars" and "Shared calendars". Emits `calendarselectionchange` when the
 * set changes and `primarychange` when the primary calendar changes. This is a
 * different concern from `calSourceList` inside `calCalendar`, which only
 * show/hides calendars that are already loaded.
 */
export default class CalCalendarPicker extends LightningElement {
    /** [{ id, label, color, isMine, visibility, description }] */
    @api calendars = [];
    /** Ids currently chosen for display. */
    @api selectedIds = [];
    /** Id of the primary calendar (drives merged defaults). */
    @api primaryId;
    @api heading = 'Calendars';

    get hasCalendars() {
        return (this.calendars || []).length > 0;
    }

    get groups() {
        const selected = new Set(this.selectedIds || []);
        const rows = (this.calendars || []).map((calendar) => ({
            id: calendar.id,
            label: calendar.label,
            description: calendar.description,
            selected: selected.has(calendar.id),
            isPrimary: calendar.id === this.primaryId,
            isMine: calendar.isMine === true,
            style: `--cal-source-color: ${calendar.color || '#1b96ff'};`
        }));
        return [
            { key: 'mine', heading: 'My calendars', items: rows.filter((row) => row.isMine) },
            { key: 'shared', heading: 'Shared calendars', items: rows.filter((row) => !row.isMine) }
        ].filter((group) => group.items.length > 0);
    }

    handleToggle(event) {
        const { id } = event.target.dataset;
        const checked = event.target.checked;
        // eslint-disable-next-line no-console
        console.log('[calWS] picker.handleToggle', id, 'checked=', checked, 'currentSel=', JSON.stringify(this.selectedIds));
        const next = new Set(this.selectedIds || []);
        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        const selectedIds = [...next];
        this.dispatchEvent(new CustomEvent('calendarselectionchange', { detail: { selectedIds } }));

        if (!checked && id === this.primaryId) {
            this.dispatchEvent(
                new CustomEvent('primarychange', { detail: { primaryId: selectedIds[0] || null } })
            );
        }
    }

    handlePrimary(event) {
        this.dispatchEvent(
            new CustomEvent('primarychange', { detail: { primaryId: event.target.dataset.id } })
        );
    }
}