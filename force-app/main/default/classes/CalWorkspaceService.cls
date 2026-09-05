/**
 * Orchestrates the calendar workspace: assembles the available calendars + the
 * running user's preferences, fans out per-calendar event queries for a visible
 * range, and persists preference changes. Holds the governor-limit policy.
 */
public with sharing class CalWorkspaceService {
    @TestVisible
    private static final Integer MAX_CALENDARS_PER_FETCH = 25;
    @TestVisible
    private static final Integer HARD_ROW_CAP = 1000;
    @TestVisible
    private static final Integer DEFAULT_ROW_LIMIT = 500;
    @TestVisible
    private static final Integer AGGREGATE_ROW_BUDGET = 20000;

    private final CalCalendarSelector calendarSelector = new CalCalendarSelector();
    private final CalUserPreferencesSelector prefSelector = new CalUserPreferencesSelector();

    public CalDto.Workspace buildWorkspace() {
        CalDto.Workspace ws = new CalDto.Workspace();
        ws.maxCalendarsPerFetch = MAX_CALENDARS_PER_FETCH;
        ws.calendars = new List<CalDto.Calendar>();

        Id me = UserInfo.getUserId();
        for (Cal_Calendar__c c : calendarSelector.selectActive()) {
            CalDto.Calendar dto = new CalDto.Calendar();
            dto.id = c.Id;
            dto.label = c.Name;
            dto.color = String.isBlank(c.Default_Color__c) ? '#1b96ff' : c.Default_Color__c;
            dto.visibility = c.Visibility__c;
            dto.isMine = (c.OwnerId == me);
            dto.targetObject = c.Target_Object__c;
            dto.description = c.Description__c;
            dto.fieldConfigJson = c.Field_Config__c;
            dto.colorRulesJson = c.Color_Rules__c;
            ws.calendars.add(dto);
        }

        ws.preferences = toPrefsDto(prefSelector.selectForCurrentUser());
        return ws;
    }

    public CalDto.EventsResult fetchEvents(List<Id> calendarIds, Datetime rangeStart, Datetime rangeEnd) {
        CalDto.EventsResult result = new CalDto.EventsResult();
        result.events = new List<CalDto.Event>();
        result.queriedCalendarIds = new List<Id>();
        result.truncated = false;

        if (calendarIds == null || calendarIds.isEmpty() || rangeStart == null || rangeEnd == null) {
            return result;
        }

        Boolean truncated = false;
        List<Id> ids = new List<Id>(new Set<Id>(calendarIds));
        if (ids.size() > MAX_CALENDARS_PER_FETCH) {
            List<Id> trimmed = new List<Id>();
            for (Id x : ids) {
                if (trimmed.size() == MAX_CALENDARS_PER_FETCH) {
                    break;
                }
                trimmed.add(x);
            }
            ids = trimmed;
            truncated = true;
        }

        Integer running = 0;
        for (Cal_Calendar__c c : calendarSelector.selectActiveByIds(new Set<Id>(ids))) {
            if (running >= AGGREGATE_ROW_BUDGET) {
                truncated = true;
                break;
            }
            List<CalDto.Event> batch = new CalEventQuery(c)
                .run(rangeStart, rangeEnd, resolveRowLimit(c.Row_Limit__c));
            result.events.addAll(batch);
            result.queriedCalendarIds.add(c.Id);
            running += batch.size();
        }

        result.truncated = truncated;
        return result;
    }

    public CalDto.UserPrefs savePreferences(CalDto.UserPrefsInput input) {
        if (input == null) {
            throw new CalWorkspaceException('No preferences supplied.');
        }

        List<Id> requestedIds = toIdList(input.selectedCalendarIds);
        Id requestedPrimary = toId(input.primaryCalendarId);

        // Store exactly the Cal_Calendar__c ids the client sent. A calendar the
        // user can no longer see is dropped on read (getWorkspace / getEvents),
        // so there is no need to re-query here — and re-querying was silently
        // wiping the selection.
        Cal_User_Preferences__c draft = new Cal_User_Preferences__c();
        draft.Selected_Calendar_Ids__c = JSON.serialize(requestedIds);
        draft.Primary_Calendar__c = (requestedPrimary != null && requestedIds.contains(requestedPrimary))
            ? requestedPrimary
            : null;
        draft.Last_View__c = input.view;
        draft.Last_Layout__c = input.layout;
        draft.First_Day_Of_Week__c = clamp(input.firstDayOfWeek, 0, 6);
        draft.Scheduler_Start_Hour__c = clamp(input.schedulerStartHour, 0, 24);
        draft.Scheduler_End_Hour__c = clamp(input.schedulerEndHour, 0, 24);
        draft.Max_Events_Per_Day__c = clamp(input.maxEventsPerDay, 1, 99);
        draft.Hide_Weekends__c = input.hideWeekends == true;
        draft.Hide_Legend__c = input.hideLegend == true;
        draft.Show_Legend_Counts__c = input.showLegendCounts == true;
        draft.Locale__c = input.locale;

        if (
            draft.Scheduler_Start_Hour__c != null &&
            draft.Scheduler_End_Hour__c != null &&
            draft.Scheduler_End_Hour__c <= draft.Scheduler_Start_Hour__c
        ) {
            draft.Scheduler_End_Hour__c = null;
            draft.Scheduler_Start_Hour__c = null;
        }

        new CalUserPreferencesDomain().saveForCurrentUser(draft);
        return toPrefsDto(prefSelector.selectForCurrentUser());
    }

    private List<Id> toIdList(List<String> raw) {
        List<Id> ids = new List<Id>();
        if (raw == null) {
            return ids;
        }
        for (String value : raw) {
            Id parsed = toId(value);
            if (parsed != null) {
                ids.add(parsed);
            }
        }
        return ids;
    }

    private Id toId(String value) {
        if (String.isBlank(value)) {
            return null;
        }
        try {
            return Id.valueOf(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private Integer resolveRowLimit(Decimal configured) {
        Integer n = (configured == null) ? DEFAULT_ROW_LIMIT : configured.intValue();
        return Math.min(Math.max(n, 1), HARD_ROW_CAP);
    }

    private Integer clamp(Integer value, Integer lo, Integer hi) {
        if (value == null) {
            return null;
        }
        return Math.min(Math.max(value, lo), hi);
    }

    private CalDto.UserPrefs toPrefsDto(Cal_User_Preferences__c row) {
        CalDto.UserPrefs prefs = new CalDto.UserPrefs();
        prefs.displayConfig = new CalDto.DisplayConfig();
        if (row == null) {
            prefs.selectedCalendarIds = new List<Id>();
            return prefs;
        }

        prefs.selectedCalendarIds = parseIds(row.Selected_Calendar_Ids__c);
        prefs.primaryCalendarId = row.Primary_Calendar__c;

        CalDto.DisplayConfig dc = prefs.displayConfig;
        dc.view = row.Last_View__c;
        dc.layout = row.Last_Layout__c;
        dc.firstDayOfWeek = asInt(row.First_Day_Of_Week__c);
        dc.hideWeekends = row.Hide_Weekends__c;
        dc.schedulerStartHour = asInt(row.Scheduler_Start_Hour__c);
        dc.schedulerEndHour = asInt(row.Scheduler_End_Hour__c);
        dc.maxEventsPerDay = asInt(row.Max_Events_Per_Day__c);
        dc.hideLegend = row.Hide_Legend__c;
        dc.showLegendCounts = row.Show_Legend_Counts__c;
        dc.locale = row.Locale__c;
        return prefs;
    }

    private List<Id> parseIds(String raw) {
        List<Id> ids = new List<Id>();
        if (String.isBlank(raw)) {
            return ids;
        }
        try {
            for (Object item : (List<Object>) JSON.deserializeUntyped(raw)) {
                if (item != null) {
                    ids.add((Id) String.valueOf(item));
                }
            }
        } catch (Exception ignored) {
            // A malformed stored value degrades to "nothing selected".
        }
        return ids;
    }

    private Integer asInt(Decimal value) {
        return value == null ? null : value.intValue();
    }

    public class CalWorkspaceException extends Exception {}
}