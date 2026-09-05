@IsTest
private class CalWorkspaceTest {
    @IsTest
    static void buildWorkspaceReturnsCalendarsAndDefaultPrefs() {
        Cal_Calendar__c cal = CalTestData.insertCalendar('Team', 'Public');

        Test.startTest();
        CalDto.Workspace ws = CalWorkspaceController.getWorkspace();
        Test.stopTest();

        System.assertEquals(1, ws.calendars.size());
        System.assertEquals(cal.Id, ws.calendars[0].id);
        System.assertEquals('Team', ws.calendars[0].label);
        System.assertEquals(true, ws.calendars[0].isMine);
        System.assertEquals('Public', ws.calendars[0].visibility);
        System.assertNotEquals(null, ws.calendars[0].colorRulesJson);
        System.assertEquals(0, ws.preferences.selectedCalendarIds.size());
        System.assertEquals(null, ws.preferences.displayConfig.view);
        System.assertEquals(25, ws.maxCalendarsPerFetch);
    }

    @IsTest
    static void getEventsAggregatesAcrossCalendars() {
        Cal_Calendar__c a = CalTestData.insertCalendar('A', 'Public');
        Cal_Calendar__c b = CalTestData.insertCalendar('B', 'Private');
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 9, 0, 0);
        CalTestData.insertEvents(2, base);

        Test.startTest();
        CalDto.EventsResult result = CalWorkspaceController.getEvents(
            new List<Id>{ a.Id, b.Id },
            base.addHours(-1),
            base.addHours(24)
        );
        Test.stopTest();

        System.assertEquals(4, result.events.size());
        System.assertEquals(false, result.truncated);
        System.assertEquals(2, result.queriedCalendarIds.size());
        Set<String> ids = new Set<String>();
        for (CalDto.Event e : result.events) {
            ids.add(e.id);
        }
        System.assertEquals(4, ids.size(), 'composite ids must be unique per calendar');
    }

    @IsTest
    static void getEventsHandlesEmptyRequest() {
        Test.startTest();
        CalDto.EventsResult result = CalWorkspaceController.getEvents(new List<Id>(), null, null);
        Test.stopTest();
        System.assertEquals(0, result.events.size());
    }

    @IsTest
    static void getEventsTruncatesBeyondCalendarCap() {
        List<Cal_Calendar__c> cals = new List<Cal_Calendar__c>();
        for (Integer i = 0; i < 27; i++) {
            cals.add(CalTestData.calendar('C' + i, 'Public'));
        }
        insert cals;
        List<Id> ids = new List<Id>();
        for (Cal_Calendar__c c : cals) {
            ids.add(c.Id);
        }
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 9, 0, 0);

        Test.startTest();
        CalDto.EventsResult result = CalWorkspaceController.getEvents(ids, base, base.addHours(24));
        Test.stopTest();

        System.assertEquals(true, result.truncated);
        System.assert(result.queriedCalendarIds.size() <= 25);
    }

    @IsTest
    static void savePreferencesRoundTripsAndClamps() {
        Cal_Calendar__c cal = CalTestData.insertCalendar('Team', 'Public');
        CalDto.UserPrefsInput input = new CalDto.UserPrefsInput();
        input.selectedCalendarIds = new List<String>{ cal.Id };
        input.primaryCalendarId = cal.Id;
        input.view = 'week';
        input.layout = 'condensed';
        input.firstDayOfWeek = 9; // clamps to 6
        input.schedulerStartHour = 8;
        input.schedulerEndHour = 30; // clamps to 24
        input.hideWeekends = true;

        Test.startTest();
        CalDto.UserPrefs saved = CalWorkspaceController.savePreferences(JSON.serialize(input));
        // second save must update the same row, not create another
        input.view = 'day';
        CalWorkspaceController.savePreferences(JSON.serialize(input));
        Test.stopTest();

        System.assertEquals(1, [SELECT COUNT() FROM Cal_User_Preferences__c]);
        System.assertEquals(new List<Id>{ cal.Id }, saved.selectedCalendarIds);
        System.assertEquals(cal.Id, saved.primaryCalendarId);
        System.assertEquals(6, saved.displayConfig.firstDayOfWeek);
        System.assertEquals(24, saved.displayConfig.schedulerEndHour);
        System.assertEquals(true, saved.displayConfig.hideWeekends);
        Cal_User_Preferences__c row = [SELECT Last_View__c FROM Cal_User_Preferences__c LIMIT 1];
        System.assertEquals('day', row.Last_View__c);
    }

    @IsTest
    static void savePreferencesDropsUnparseableIds() {
        Cal_Calendar__c calA = CalTestData.insertCalendar('Team', 'Public');
        CalDto.UserPrefsInput input = new CalDto.UserPrefsInput();
        input.selectedCalendarIds = new List<String>{ calA.Id, 'not-an-id', '', null };

        Test.startTest();
        CalDto.UserPrefs saved = CalWorkspaceController.savePreferences(JSON.serialize(input));
        Test.stopTest();

        System.assertEquals(new List<Id>{ calA.Id }, saved.selectedCalendarIds);
    }

    @IsTest
    static void controllerWrapsErrorsAsAura() {
        try {
            CalWorkspaceController.savePreferences((String) null);
            System.assert(false, 'expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
    }

    @IsTest
    static void privateCalendarsAreNotVisibleToOtherUsers() {
        Cal_Calendar__c mine = CalTestData.insertCalendar('Admin Private', 'Private');
        Cal_Calendar__c shared = CalTestData.insertCalendar('Team Public', 'Public');
        User other = CalTestData.standardUser();
        insert new Cal_Calendar__Share(
            ParentId = shared.Id,
            UserOrGroupId = other.Id,
            AccessLevel = 'Read',
            RowCause = 'Manual'
        );

        System.runAs(other) {
            List<Cal_Calendar__c> visible = new CalCalendarSelector().selectActive();
            Set<Id> ids = new Map<Id, Cal_Calendar__c>(visible).keySet();
            System.assert(ids.contains(shared.Id), 'shared public calendar should be visible');
            System.assert(!ids.contains(mine.Id), 'another user private calendar must not be visible');
        }
    }

    @IsTest
    static void preferenceRowRejectsForeignUser() {
        User other = CalTestData.standardUser();
        Cal_User_Preferences__c row = new Cal_User_Preferences__c(User__c = other.Id);
        try {
            insert row;
            System.assert(false, 'expected the trigger to block a foreign User__c');
        } catch (DmlException e) {
            System.assert(e.getMessage().containsIgnoreCase('your own'));
        }
    }
}