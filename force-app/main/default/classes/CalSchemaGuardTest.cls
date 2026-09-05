@IsTest
private class CalSchemaGuardTest {
    @IsTest
    static void describesRealObject() {
        Test.startTest();
        SObjectType token = CalSchemaGuard.describeObject('Event');
        Test.stopTest();
        System.assertEquals('Event', token.getDescribe().getName());
    }

    @IsTest
    static void rejectsUnknownObject() {
        try {
            CalSchemaGuard.describeObject('Totally_Not_Real__x');
            System.assert(false, 'expected SchemaException');
        } catch (CalSchemaGuard.SchemaException e) {
            System.assert(e.getMessage().containsIgnoreCase('unknown'));
        }
    }

    @IsTest
    static void rejectsBlankObject() {
        try {
            CalSchemaGuard.describeObject('  ');
            System.assert(false, 'expected SchemaException');
        } catch (CalSchemaGuard.SchemaException e) {
            System.assert(true);
        }
    }

    @IsTest
    static void validatesSimpleAndRelationshipPaths() {
        SObjectType t = CalSchemaGuard.describeObject('Event');
        System.assert(CalSchemaGuard.validateFieldPath(t, 'Subject'));
        System.assert(CalSchemaGuard.validateFieldPath(t, 'Owner.Name'));
        System.assert(!CalSchemaGuard.validateFieldPath(t, 'Not_A_Field__c'));
        System.assert(!CalSchemaGuard.validateFieldPath(t, 'Owner.Not_A_Field__c'));
        System.assert(!CalSchemaGuard.validateFieldPath(t, ''));
        System.assert(!CalSchemaGuard.validateFieldPath(t, 'a.b.c.d.e.f'));
    }

    @IsTest
    static void filterValidPathsKeepsOnlyValid() {
        SObjectType t = CalSchemaGuard.describeObject('Event');
        Set<String> valid = CalSchemaGuard.filterValidPaths(
            t,
            new Set<String>{ 'Subject', 'Location', 'Bogus__c' }
        );
        System.assertEquals(new Set<String>{ 'Subject', 'Location' }, valid);
    }

    @IsTest
    static void formatsValues() {
        Datetime dt = Datetime.newInstanceGmt(2026, 8, 31, 14, 30, 0);
        System.assertEquals('2026-08-31T14:30:00Z', CalSchemaGuard.toIsoUtc(dt));
        System.assertEquals(null, CalSchemaGuard.toIsoUtc(null));
        System.assertEquals('2026-08-31T14:30:00Z', CalSchemaGuard.stringifyForMeta(dt));
        System.assertEquals('2026-08-31', CalSchemaGuard.stringifyForMeta(Date.newInstance(2026, 8, 31)));
        System.assertEquals('hello', CalSchemaGuard.stringifyForMeta('hello'));
        System.assertEquals(null, CalSchemaGuard.stringifyForMeta(null));
    }
}