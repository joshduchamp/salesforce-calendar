@IsTest
private class CalCalendarValidationTest {
    @IsTest
    static void acceptsACleanDefinition() {
        insert CalTestData.calendar('Team', 'Public');
        System.assertEquals(1, [SELECT COUNT() FROM Cal_Calendar__c]);
    }

    @IsTest
    static void rejectsMalformedMappingsJson() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Field_Mappings__c = '{ bad';
        assertBlocked(c, 'Field Mappings');
    }

    @IsTest
    static void rejectsMalformedFieldConfigJson() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Field_Config__c = '[ bad';
        assertBlocked(c, 'Field Config');
    }

    @IsTest
    static void rejectsMalformedColorRulesJson() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Color_Rules__c = '{ bad';
        assertBlocked(c, 'Color Rules');
    }

    @IsTest
    static void rejectsUnknownObject() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Target_Object__c = 'No_Such_Object__x';
        assertBlocked(c, 'Target Object');
    }

    @IsTest
    static void rejectsUnknownMappedField() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Field_Mappings__c = JSON.serialize(
            new Map<String, Object>{ 'title' => 'Nope__c', 'start' => 'StartDateTime' }
        );
        assertBlocked(c, 'Field Mappings');
    }

    @IsTest
    static void rejectsUnknownFieldConfigSource() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Field_Config__c = JSON.serialize(
            new List<Object>{ new Map<String, Object>{ 'key' => 'x', 'source' => 'Nope__c' } }
        );
        assertBlocked(c, 'Field Config');
    }

    @IsTest
    static void rejectsColorRuleKeyNotInFieldConfig() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Color_Rules__c = JSON.serialize(
            new Map<String, Object>{
                'rules' => new List<Object>{
                    new Map<String, Object>{ 'key' => 'ghost', 'value' => 'x', 'color' => '#000' }
                }
            }
        );
        assertBlocked(c, 'Color Rules');
    }

    @IsTest
    static void rejectsUncompilableFilter() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Filter_Criteria__c = 'ShowAs = = Busy';
        assertBlocked(c, 'Filter Criteria');
    }

    @IsTest
    static void rejectsSemicolonInFilter() {
        Cal_Calendar__c c = CalTestData.calendar('Bad', 'Private');
        c.Filter_Criteria__c = 'ShowAs = \'Busy\'; DELETE';
        assertBlocked(c, 'Filter Criteria');
    }

    @IsTest
    static void revalidatesOnlyWhenConfigChanges() {
        Cal_Calendar__c c = CalTestData.calendar('Team', 'Public');
        insert c;
        c.Description__c = 'just a description edit';
        update c;
        System.assertEquals(
            'just a description edit',
            [SELECT Description__c FROM Cal_Calendar__c WHERE Id = :c.Id].Description__c
        );
    }

    private static void assertBlocked(Cal_Calendar__c c, String expectedFragment) {
        try {
            insert c;
            System.assert(false, 'expected the insert to be blocked (' + expectedFragment + ')');
        } catch (DmlException e) {
            System.assert(
                e.getMessage().containsIgnoreCase(expectedFragment),
                'message "' + e.getMessage() + '" should mention ' + expectedFragment
            );
        }
    }
}