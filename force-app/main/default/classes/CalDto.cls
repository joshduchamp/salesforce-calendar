/**
 * Wire-format data transfer objects exchanged between the calendar workspace LWC
 * and Apex. Pure structs — no logic. The `Event` struct matches the generic
 * event shape the `c/calCalendar` component consumes 1:1.
 */
public class CalDto {
    public class Workspace {
        @AuraEnabled
        public List<Calendar> calendars;
        @AuraEnabled
        public UserPrefs preferences;
        @AuraEnabled
        public Integer maxCalendarsPerFetch;
    }

    public class Calendar {
        @AuraEnabled
        public Id id;
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String color;
        @AuraEnabled
        public String visibility;
        @AuraEnabled
        public Boolean isMine;
        @AuraEnabled
        public String targetObject;
        @AuraEnabled
        public String description;
        /** Raw JSON from Cal_Calendar__c.Field_Config__c — parsed in the browser. */
        @AuraEnabled
        public String fieldConfigJson;
        /** Raw JSON from Cal_Calendar__c.Color_Rules__c — parsed in the browser. */
        @AuraEnabled
        public String colorRulesJson;
    }

    public class DisplayConfig {
        @AuraEnabled
        public String view;
        @AuraEnabled
        public String layout;
        @AuraEnabled
        public Integer firstDayOfWeek;
        @AuraEnabled
        public Boolean hideWeekends;
        @AuraEnabled
        public Integer schedulerStartHour;
        @AuraEnabled
        public Integer schedulerEndHour;
        @AuraEnabled
        public Integer maxEventsPerDay;
        @AuraEnabled
        public Boolean hideLegend;
        @AuraEnabled
        public Boolean showLegendCounts;
        @AuraEnabled
        public String locale;
    }

    public class UserPrefs {
        @AuraEnabled
        public List<Id> selectedCalendarIds;
        @AuraEnabled
        public Id primaryCalendarId;
        @AuraEnabled
        public DisplayConfig displayConfig;
    }

    public class UserPrefsInput {
        // Strings, not List<Id>/Id — nested Id-typed fields on an @AuraEnabled
        // wrapper do not deserialize reliably from LWC; convert in Apex.
        @AuraEnabled
        public List<String> selectedCalendarIds;
        @AuraEnabled
        public String primaryCalendarId;
        @AuraEnabled
        public String view;
        @AuraEnabled
        public String layout;
        @AuraEnabled
        public Integer firstDayOfWeek;
        @AuraEnabled
        public Boolean hideWeekends;
        @AuraEnabled
        public Integer schedulerStartHour;
        @AuraEnabled
        public Integer schedulerEndHour;
        @AuraEnabled
        public Integer maxEventsPerDay;
        @AuraEnabled
        public Boolean hideLegend;
        @AuraEnabled
        public Boolean showLegendCounts;
        @AuraEnabled
        public String locale;
    }

    public class Event {
        @AuraEnabled
        public String id;
        @AuraEnabled
        public String calendarId;
        @AuraEnabled
        public String title;
        @AuraEnabled
        public String start;
        /** ISO 8601. Serialized as `endsAt`; the LWC adapter maps it back to `end`. */
        @AuraEnabled
        public String endsAt;
        @AuraEnabled
        public Boolean allDay;
        @AuraEnabled
        public String recordId;
        @AuraEnabled
        public Map<String, Object> meta;
    }

    public class EventsResult {
        @AuraEnabled
        public List<Event> events;
        @AuraEnabled
        public Boolean truncated;
        @AuraEnabled
        public List<Id> queriedCalendarIds;
    }
}
