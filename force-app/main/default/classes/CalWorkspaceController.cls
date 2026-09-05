/**
 * LWC entry points for the calendar workspace. Marshals input/output and
 * delegates to CalWorkspaceService — no business logic, SOQL, or DML here.
 */
public with sharing class CalWorkspaceController {
    /**
     * Available calendars (mine + public) plus this user's saved preferences.
     * Not cacheable — the preferences it returns are mutated by savePreferences,
     * and a cached snapshot would make the workspace open with a stale selection.
     */
    @AuraEnabled
    public static CalDto.Workspace getWorkspace() {
        try {
            return new CalWorkspaceService().buildWorkspace();
        } catch (Exception e) {
            throw asAura(e);
        }
    }

    /** Events overlapping [rangeStart, rangeEnd] across the given calendars. */
    @AuraEnabled
    public static CalDto.EventsResult getEvents(List<Id> calendarIds, Datetime rangeStart, Datetime rangeEnd) {
        try {
            return new CalWorkspaceService().fetchEvents(calendarIds, rangeStart, rangeEnd);
        } catch (Exception e) {
            throw asAura(e);
        }
    }

    /** Upsert the running user's preference row; returns the re-read record. */
    @AuraEnabled
    public static CalDto.UserPrefs savePreferences(String prefsJson) {
        try {
            CalDto.UserPrefsInput prefs = String.isBlank(prefsJson)
                ? null
                : (CalDto.UserPrefsInput) JSON.deserialize(prefsJson, CalDto.UserPrefsInput.class);
            return new CalWorkspaceService().savePreferences(prefs);
        } catch (Exception e) {
            throw asAura(e);
        }
    }

    private static AuraHandledException asAura(Exception e) {
        AuraHandledException ex = new AuraHandledException(e.getMessage());
        ex.setMessage(e.getMessage());
        return ex;
    }
}