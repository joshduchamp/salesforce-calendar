/**
 * Test-data factory for the calendar harness. Builds Cal_Calendar__c definitions
 * pointed at the standard Event object and a matching set of Event records.
 */
@IsTest
public class CalTestData {
    public static final String EVENT_MAPPINGS = JSON.serialize(
        new Map<String, Object>{
            'title' => 'Subject',
            'start' => 'StartDateTime',
            'end' => 'EndDateTime',
            'allDay' => 'IsAllDayEvent',
            'recordId' => 'Id'
        }
    );

    public static final String EVENT_FIELD_CONFIG = JSON.serialize(
        new List<Object>{
            new Map<String, Object>{ 'key' => 'location', 'source' => 'Location', 'label' => 'Where' },
            new Map<String, Object>{ 'key' => 'show', 'source' => 'ShowAs', 'label' => 'Show As' }
        }
    );

    public static final String EVENT_COLOR_RULES = JSON.serialize(
        new Map<String, Object>{
            'rules' => new List<Object>{
                new Map<String, Object>{ 'key' => 'show', 'value' => 'Busy', 'color' => '#c9394a', 'label' => 'Busy' }
            },
            'defaultColor' => '#1b96ff'
        }
    );

    public static Cal_Calendar__c calendar(String name, String visibility) {
        return new Cal_Calendar__c(
            Name = name,
            Target_Object__c = 'Event',
            Field_Mappings__c = EVENT_MAPPINGS,
            Field_Config__c = EVENT_FIELD_CONFIG,
            Color_Rules__c = EVENT_COLOR_RULES,
            Default_Color__c = '#1b96ff',
            Visibility__c = visibility,
            Active__c = true,
            Row_Limit__c = 500
        );
    }

    public static Cal_Calendar__c insertCalendar(String name, String visibility) {
        Cal_Calendar__c c = calendar(name, visibility);
        insert c;
        return c;
    }

    public static List<Event> insertEvents(Integer count, Datetime firstStart) {
        List<Event> events = new List<Event>();
        for (Integer i = 0; i < count; i++) {
            Datetime start = firstStart.addHours(i);
            events.add(
                new Event(
                    Subject = 'Event ' + i,
                    StartDateTime = start,
                    EndDateTime = start.addHours(1),
                    IsAllDayEvent = false,
                    Location = 'Room ' + i,
                    ShowAs = Math.mod(i, 2) == 0 ? 'Busy' : 'Free'
                )
            );
        }
        insert events;
        return events;
    }

    /**
     * A Standard User with the Calendar_User permission set. Created inside a
     * System.runAs block so the caller can freely mix it with non-setup DML.
     */
    public static User standardUser() {
        User u;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            String nonce = String.valueOf(Crypto.getRandomInteger()).replace('-', '');
            u = new User(
                ProfileId = p.Id,
                LastName = 'Cal',
                Email = 'cal.tester@example.com',
                Username = 'cal.tester.' + nonce + '@calendar.test',
                Alias = 'caltest',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                LanguageLocaleKey = 'en_US'
            );
            insert u;
            insert new PermissionSetAssignment(
                AssigneeId = u.Id,
                PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'Calendar_User' LIMIT 1].Id
            );
        }
        return u;
    }
}