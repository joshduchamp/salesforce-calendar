@IsTest
private class CalJsonConfigTest {
    @IsTest
    static void parsesAWellFormedDefinition() {
        Cal_Calendar__c def = CalTestData.calendar('Team', 'Public');
        CalJsonConfig.Parsed parsed = CalJsonConfig.parse(def);

        System.assertEquals('Subject', parsed.mappings.title);
        System.assertEquals('StartDateTime', parsed.mappings.startField);
        System.assertEquals('EndDateTime', parsed.mappings.endField);
        System.assertEquals('IsAllDayEvent', parsed.mappings.allDay);
        System.assertEquals(2, parsed.fieldConfig.size());
        System.assertEquals('Location', parsed.fieldConfig[0].effectiveSource());
        System.assertEquals(1, parsed.colorRules.rules.size());
        System.assertEquals('#1b96ff', parsed.colorRules.defaultColor);

        Set<String> paths = CalJsonConfig.collectFieldPaths(parsed);
        System.assert(paths.contains('Subject'));
        System.assert(paths.contains('Location'));
        System.assert(paths.contains('ShowAs'));
    }

    @IsTest
    static void rejectsMalformedMappings() {
        Cal_Calendar__c def = CalTestData.calendar('X', 'Private');
        def.Field_Mappings__c = '{ not json';
        try {
            CalJsonConfig.parse(def);
            System.assert(false, 'expected ConfigException');
        } catch (CalJsonConfig.ConfigException e) {
            System.assert(e.getMessage().containsIgnoreCase('Field Mappings'));
        }
    }

    @IsTest
    static void requiresTitleAndStart() {
        Cal_Calendar__c def = CalTestData.calendar('X', 'Private');
        def.Field_Mappings__c = JSON.serialize(new Map<String, Object>{ 'title' => 'Subject' });
        try {
            CalJsonConfig.parse(def);
            System.assert(false, 'expected ConfigException');
        } catch (CalJsonConfig.ConfigException e) {
            System.assert(e.getMessage().containsIgnoreCase('start'));
        }
    }

    @IsTest
    static void rejectsMalformedColorRules() {
        Cal_Calendar__c def = CalTestData.calendar('X', 'Private');
        def.Color_Rules__c = '{ "rules": ';
        try {
            CalJsonConfig.parse(def);
            System.assert(false, 'expected ConfigException');
        } catch (CalJsonConfig.ConfigException e) {
            System.assert(e.getMessage().containsIgnoreCase('Color Rules'));
        }
    }

    @IsTest
    static void toleratesBlankOptionalConfig() {
        Cal_Calendar__c def = CalTestData.calendar('X', 'Private');
        def.Field_Config__c = null;
        def.Color_Rules__c = '';
        CalJsonConfig.Parsed parsed = CalJsonConfig.parse(def);
        System.assertEquals(0, parsed.fieldConfig.size());
        System.assertEquals(0, parsed.colorRules.rules.size());
    }
}