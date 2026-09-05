trigger CalUserPreferencesTrigger on Cal_User_Preferences__c(before insert, before update) {
    CalUserPreferencesTriggerHandler handler = new CalUserPreferencesTriggerHandler();
    if (Trigger.isInsert) {
        handler.beforeInsert(Trigger.new);
    } else if (Trigger.isUpdate) {
        handler.beforeUpdate(Trigger.new);
    }
}