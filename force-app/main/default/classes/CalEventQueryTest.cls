@IsTest
private class CalEventQueryTest {
    @IsTest
    static void mapsEventRowsToGenericShape() {
        Cal_Calendar__c cal = CalTestData.insertCalendar('Team', 'Public');
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 15, 0, 0);
        CalTestData.insertEvents(3, base);

        Test.startTest();
        List<CalDto.Event> events = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-1), base.addHours(24), 500);
        Test.stopTest();

        System.assertEquals(3, events.size());
        CalDto.Event first = events[0];
        System.assertEquals(String.valueOf(cal.Id) + ':' + first.recordId, first.id);
        System.assertEquals(cal.Id, first.calendarId);
        System.assertEquals('Event 0', first.title);
        System.assertEquals('2026-08-31T15:00:00Z', first.start);
        System.assertEquals('2026-08-31T16:00:00Z', first.endsAt);
        System.assertEquals(false, first.allDay);
        System.assertEquals('Room 0', first.meta.get('location'));
        System.assertEquals('Busy', first.meta.get('show'));
    }

    @IsTest
    static void honoursRowLimit() {
        Cal_Calendar__c cal = CalTestData.insertCalendar('Team', 'Public');
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 8, 0, 0);
        CalTestData.insertEvents(5, base);

        Test.startTest();
        List<CalDto.Event> events = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-1), base.addHours(24), 2);
        Test.stopTest();

        System.assertEquals(2, events.size());
    }

    @IsTest
    static void excludesEventsOutsideTheRange() {
        Cal_Calendar__c cal = CalTestData.insertCalendar('Team', 'Public');
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 12, 0, 0);
        CalTestData.insertEvents(1, base);

        Test.startTest();
        List<CalDto.Event> before = new CalEventQuery(reload(cal.Id))
            .run(base.addDays(-5), base.addDays(-4), 500);
        List<CalDto.Event> covering = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-2), base.addHours(2), 500);
        Test.stopTest();

        System.assertEquals(0, before.size());
        System.assertEquals(1, covering.size());
    }

    @IsTest
    static void appliesFilterCriteria() {
        Cal_Calendar__c cal = CalTestData.calendar('Team', 'Public');
        cal.Filter_Criteria__c = 'ShowAs = \'Busy\'';
        insert cal;
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 9, 0, 0);
        CalTestData.insertEvents(4, base);

        Test.startTest();
        List<CalDto.Event> events = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-1), base.addHours(24), 500);
        Test.stopTest();

        System.assertEquals(2, events.size());
        for (CalDto.Event e : events) {
            System.assertEquals('Busy', e.meta.get('show'));
        }
    }

    @IsTest
    static void synthesizesEndWhenUnmapped() {
        Cal_Calendar__c cal = CalTestData.calendar('Team', 'Public');
        cal.Field_Mappings__c = JSON.serialize(
            new Map<String, Object>{ 'title' => 'Subject', 'start' => 'StartDateTime', 'recordId' => 'Id' }
        );
        insert cal;
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 10, 0, 0);
        CalTestData.insertEvents(1, base);

        Test.startTest();
        List<CalDto.Event> events = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-1), base.addHours(24), 500);
        Test.stopTest();

        System.assertEquals(1, events.size());
        System.assertEquals(events[0].start, events[0].endsAt);
    }

    @IsTest
    static void expandsCurrentUserPlaceholder() {
        Cal_Calendar__c cal = CalTestData.calendar('Mine', 'Private');
        cal.Filter_Criteria__c = 'OwnerId = $CURRENT_USER_ID';
        insert cal;
        Datetime base = Datetime.newInstanceGmt(2026, 8, 31, 11, 0, 0);
        CalTestData.insertEvents(2, base);

        Test.startTest();
        List<CalDto.Event> events = new CalEventQuery(reload(cal.Id))
            .run(base.addHours(-1), base.addHours(24), 500);
        Test.stopTest();

        System.assertEquals(2, events.size());
    }

    private static Cal_Calendar__c reload(Id calendarId) {
        return new CalCalendarSelector().selectByIds(new Set<Id>{ calendarId })[0];
    }
}