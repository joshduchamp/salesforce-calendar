/**
 * All SOQL for Cal_Calendar__c. `with sharing` makes a query return the running
 * user's own calendars plus every Public calendar (shared by the
 * Public_Calendars_Visible_To_All rule). Access to the object/fields themselves
 * is gated by the Calendar_User / Calendar_Admin permission sets, so the query
 * runs in system mode for field access.
 */
public with sharing class CalCalendarSelector {
    private static final List<String> FIELDS = new List<String>{
        'Id',
        'Name',
        'OwnerId',
        'Target_Object__c',
        'Field_Mappings__c',
        'Field_Config__c',
        'Color_Rules__c',
        'Filter_Criteria__c',
        'Default_Color__c',
        'Visibility__c',
        'Active__c',
        'Row_Limit__c',
        'Description__c'
    };

    public List<Cal_Calendar__c> selectActive() {
        return Database.query(baseQuery() + ' WHERE Active__c = true ORDER BY Name');
    }

    public List<Cal_Calendar__c> selectActiveByIds(Set<Id> ids) {
        return Database.query(baseQuery() + ' WHERE Active__c = true AND Id IN :ids ORDER BY Name');
    }

    public List<Cal_Calendar__c> selectByIds(Set<Id> ids) {
        return Database.query(baseQuery() + ' WHERE Id IN :ids ORDER BY Name');
    }

    private String baseQuery() {
        return 'SELECT ' + String.join(FIELDS, ', ') + ' FROM Cal_Calendar__c';
    }
}
