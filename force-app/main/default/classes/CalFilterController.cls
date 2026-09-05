/**
 * Record-page helper endpoint for Cal_Calendar__c.Filter_Criteria__c. Trial-
 * compiles a candidate WHERE fragment against a target object so the admin sees
 * problems before saving. Marshals input/output only — the rules live in
 * CalFilterCompiler.
 */
public with sharing class CalFilterController {
    /**
     * Checks `filterCriteria` as a WHERE fragment for `targetObject`.
     * Returns { valid, message } — `message` is the reason when invalid, and a
     * blank fragment is valid (it means "no filter").
     */
    @AuraEnabled(cacheable=true)
    public static CalDto.FilterCheck checkFilter(String targetObject, String filterCriteria) {
        try {
            SObjectType token = CalSchemaGuard.describeObject(targetObject);
            return result(CalFilterCompiler.problem(token, filterCriteria));
        } catch (CalSchemaGuard.SchemaException e) {
            return result(e.getMessage());
        }
    }

    /** A FilterCheck: `reason` null means the fragment is usable. */
    private static CalDto.FilterCheck result(String reason) {
        CalDto.FilterCheck check = new CalDto.FilterCheck();
        check.valid = reason == null;
        check.message = reason;
        return check;
    }
}