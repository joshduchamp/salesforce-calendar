/**
 * All SOQL for Cal_User_Preferences__c. OWD is Private and there is no sharing
 * rule, so a `with sharing` query only ever sees the running user's own row.
 */
public with sharing class CalUserPreferencesSelector {
    public Cal_User_Preferences__c selectForCurrentUser() {
        List<Cal_User_Preferences__c> rows = [
            SELECT
                Id,
                OwnerId,
                User__c,
                Selected_Calendar_Ids__c,
                Primary_Calendar__c,
                Last_View__c,
                Last_Layout__c,
                First_Day_Of_Week__c,
                Scheduler_Start_Hour__c,
                Scheduler_End_Hour__c,
                Max_Events_Per_Day__c,
                Hide_Weekends__c,
                Hide_Legend__c,
                Show_Legend_Counts__c,
                Locale__c,
                Preferences_JSON__c
            FROM Cal_User_Preferences__c
            WHERE User__c = :UserInfo.getUserId()
            LIMIT 1
        ];
        return rows.isEmpty() ? null : rows[0];
    }
}