/**
 * Guards Cal_User_Preferences__c: a row may only ever belong to the running user.
 * OWD Private already blocks reading another user's row; this blocks writing one.
 */
public with sharing class CalUserPreferencesTriggerHandler {
    public void beforeInsert(List<Cal_User_Preferences__c> newList) {
        guardOwnership(newList);
    }

    public void beforeUpdate(List<Cal_User_Preferences__c> newList) {
        guardOwnership(newList);
    }

    private void guardOwnership(List<Cal_User_Preferences__c> records) {
        Id me = UserInfo.getUserId();
        for (Cal_User_Preferences__c record : records) {
            if (record.User__c != me) {
                record.addError('You can only edit your own calendar preferences.');
            }
        }
    }
}