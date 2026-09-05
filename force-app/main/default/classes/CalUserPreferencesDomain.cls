/**
 * Record-level behavior and DML for Cal_User_Preferences__c. A user has exactly
 * one preference row; this does the find-then-insert/update since the User__c
 * lookup cannot be an external id.
 */
public with sharing class CalUserPreferencesDomain {
    private final CalUserPreferencesSelector selector = new CalUserPreferencesSelector();

    /**
     * Persist `draft` as the running user's preference row. `draft` carries the
     * preference fields only; ownership and the User__c link are set here.
     */
    public Cal_User_Preferences__c saveForCurrentUser(Cal_User_Preferences__c draft) {
        Id me = UserInfo.getUserId();
        Cal_User_Preferences__c existing = selector.selectForCurrentUser();

        Cal_User_Preferences__c record = (existing == null) ? new Cal_User_Preferences__c() : existing;
        record.User__c = me;
        record.OwnerId = me;
        record.Selected_Calendar_Ids__c = draft.Selected_Calendar_Ids__c;
        record.Primary_Calendar__c = draft.Primary_Calendar__c;
        record.Last_View__c = draft.Last_View__c;
        record.Last_Layout__c = draft.Last_Layout__c;
        record.First_Day_Of_Week__c = draft.First_Day_Of_Week__c;
        record.Scheduler_Start_Hour__c = draft.Scheduler_Start_Hour__c;
        record.Scheduler_End_Hour__c = draft.Scheduler_End_Hour__c;
        record.Max_Events_Per_Day__c = draft.Max_Events_Per_Day__c;
        record.Hide_Weekends__c = draft.Hide_Weekends__c;
        record.Hide_Legend__c = draft.Hide_Legend__c;
        record.Show_Legend_Counts__c = draft.Show_Legend_Counts__c;
        record.Locale__c = draft.Locale__c;

        if (existing == null) {
            insert record;
        } else {
            update record;
        }
        return record;
    }
}