trigger CalCalendarTrigger on Cal_Calendar__c(before insert, before update) {
    CalCalendarTriggerHandler handler = new CalCalendarTriggerHandler();
    if (Trigger.isInsert) {
        handler.beforeInsert(Trigger.new);
    } else if (Trigger.isUpdate) {
        handler.beforeUpdate(Trigger.new, Trigger.oldMap);
    }
}
