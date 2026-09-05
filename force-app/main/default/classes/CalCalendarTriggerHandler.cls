/**
 * Save-time validation for Cal_Calendar__c. Rejects a record whose JSON config,
 * target object, mapped fields, color-rule keys, or filter fragment would break
 * the runtime query — so a bad calendar can never reach CalEventQuery.
 */
public with sharing class CalCalendarTriggerHandler {
    public void beforeInsert(List<Cal_Calendar__c> newList) {
        validate(newList);
    }

    public void beforeUpdate(List<Cal_Calendar__c> newList, Map<Id, Cal_Calendar__c> oldMap) {
        List<Cal_Calendar__c> changed = new List<Cal_Calendar__c>();
        for (Cal_Calendar__c record : newList) {
            if (configChanged(record, oldMap.get(record.Id))) {
                changed.add(record);
            }
        }
        validate(changed);
    }

    private Boolean configChanged(Cal_Calendar__c n, Cal_Calendar__c o) {
        return o == null ||
            n.Target_Object__c != o.Target_Object__c ||
            n.Field_Mappings__c != o.Field_Mappings__c ||
            n.Field_Config__c != o.Field_Config__c ||
            n.Color_Rules__c != o.Color_Rules__c ||
            n.Filter_Criteria__c != o.Filter_Criteria__c;
    }

    private void validate(List<Cal_Calendar__c> records) {
        for (Cal_Calendar__c record : records) {
            CalJsonConfig.Parsed cfg;
            try {
                cfg = CalJsonConfig.parse(record);
            } catch (CalJsonConfig.ConfigException e) {
                record.addError(e.getMessage());
                continue;
            }

            SObjectType token;
            try {
                token = CalSchemaGuard.describeObject(record.Target_Object__c);
            } catch (Exception e) {
                record.addError('Target Object: ' + e.getMessage());
                continue;
            }

            if (!validateMappings(record, token, cfg)) {
                continue;
            }
            if (!validateFieldConfigSources(record, token, cfg)) {
                continue;
            }
            if (!validateColorRuleKeys(record, cfg)) {
                continue;
            }
            validateFilter(record, token);
        }
    }

    private Boolean validateMappings(Cal_Calendar__c record, SObjectType token, CalJsonConfig.Parsed cfg) {
        CalJsonConfig.Mappings m = cfg.mappings;
        List<String> bad = new List<String>();
        checkPath(token, m.title, 'title', bad);
        checkPath(token, m.startField, 'start', bad);
        if (String.isNotBlank(m.endField)) {
            checkPath(token, m.endField, 'end', bad);
        }
        if (String.isNotBlank(m.recordId)) {
            checkPath(token, m.recordId, 'recordId', bad);
        }
        if (m.allDay != null && !m.allDayIsLiteral() && String.isNotBlank(m.allDay)) {
            checkPath(token, m.allDay, 'allDay', bad);
        }
        if (!bad.isEmpty()) {
            record.addError('Field Mappings: unknown or unreadable field(s) — ' + String.join(bad, ', '));
            return false;
        }
        return true;
    }

    private Boolean validateFieldConfigSources(Cal_Calendar__c record, SObjectType token, CalJsonConfig.Parsed cfg) {
        List<String> bad = new List<String>();
        for (CalJsonConfig.FieldConfigEntry entry : cfg.fieldConfig) {
            if (entry == null || String.isBlank(entry.key)) {
                record.addError('Field Config: every entry needs a "key".');
                return false;
            }
            if (!CalSchemaGuard.validateFieldPath(token, entry.effectiveSource())) {
                bad.add(entry.effectiveSource());
            }
        }
        if (!bad.isEmpty()) {
            record.addError('Field Config: unknown or unreadable source field(s) — ' + String.join(bad, ', '));
            return false;
        }
        return true;
    }

    private Boolean validateColorRuleKeys(Cal_Calendar__c record, CalJsonConfig.Parsed cfg) {
        Set<String> knownKeys = new Set<String>();
        for (CalJsonConfig.FieldConfigEntry entry : cfg.fieldConfig) {
            if (entry != null && String.isNotBlank(entry.key)) {
                knownKeys.add(entry.key);
            }
        }
        for (CalJsonConfig.ColorRule rule : cfg.colorRules.rules) {
            if (rule == null || String.isBlank(rule.key)) {
                record.addError('Color Rules: every rule needs a "key".');
                return false;
            }
            if (!knownKeys.contains(rule.key)) {
                record.addError('Color Rules: rule key "' + rule.key + '" is not a Field Config key.');
                return false;
            }
            if (String.isBlank(rule.color)) {
                record.addError('Color Rules: rule "' + rule.key + '" needs a "color".');
                return false;
            }
        }
        return true;
    }

    private void validateFilter(Cal_Calendar__c record, SObjectType token) {
        String reason = CalFilterCompiler.problem(token, record.Filter_Criteria__c);
        if (reason != null) {
            record.addError('Filter Criteria ' + reason);
        }
    }

    private void checkPath(SObjectType token, String path, String label, List<String> bad) {
        if (!CalSchemaGuard.validateFieldPath(token, path)) {
            bad.add(label + '="' + path + '"');
        }
    }
}