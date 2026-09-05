/**
 * Parses the JSON configuration fields on Cal_Calendar__c into typed structures.
 * One implementation shared by CalEventQuery (runtime) and
 * CalCalendarTriggerHandler (save-time validation) so the two never disagree.
 */
public inherited sharing class CalJsonConfig {
    public class ConfigException extends Exception {}

    public class Mappings {
        public String title;
        public String startField;
        public String endField;
        public String allDay;
        public String recordId;

        public Boolean allDayIsLiteral() {
            return allDay != null && (allDay.equalsIgnoreCase('true') || allDay.equalsIgnoreCase('false'));
        }

        public Boolean allDayLiteralValue() {
            return allDay != null && allDay.equalsIgnoreCase('true');
        }
    }

    public class FieldConfigEntry {
        public String key;
        public String source;
        public String label;
        public Boolean showLabel;
        public List<String> views;
        public Integer truncate;

        public String effectiveSource() {
            return String.isBlank(source) ? key : source;
        }
    }

    /**
     * Only `key` and `color` are read by Apex (trigger validation). `operator`,
     * `value`, and `label` are evaluated in the browser, so they are not modeled
     * here — JSON.deserialize ignores the unmapped properties.
     */
    public class ColorRule {
        public String key;
        public String color;
    }

    public class ColorRules {
        public List<ColorRule> rules;
        public String defaultColor;

        public ColorRules() {
            rules = new List<ColorRule>();
        }
    }

    public class Parsed {
        public Mappings mappings;
        public List<FieldConfigEntry> fieldConfig;
        public ColorRules colorRules;
    }

    public static Parsed parse(Cal_Calendar__c def) {
        Parsed result = new Parsed();
        result.mappings = parseMappings(def.Field_Mappings__c);
        result.fieldConfig = parseFieldConfig(def.Field_Config__c);
        result.colorRules = parseColorRules(def.Color_Rules__c);
        return result;
    }

    /** Every same-object field path the query needs: base mappings + each entry source. */
    public static Set<String> collectFieldPaths(Parsed parsed) {
        Set<String> paths = new Set<String>();
        Mappings m = parsed.mappings;
        addIfPresent(paths, m.title);
        addIfPresent(paths, m.startField);
        addIfPresent(paths, m.endField);
        addIfPresent(paths, m.recordId);
        if (m.allDay != null && !m.allDayIsLiteral()) {
            addIfPresent(paths, m.allDay);
        }
        for (FieldConfigEntry entry : parsed.fieldConfig) {
            if (entry != null && String.isNotBlank(entry.key)) {
                addIfPresent(paths, entry.effectiveSource());
            }
        }
        return paths;
    }

    private static Mappings parseMappings(String raw) {
        if (String.isBlank(raw)) {
            throw new ConfigException('Field Mappings is required.');
        }
        Map<String, Object> src;
        try {
            src = (Map<String, Object>) JSON.deserializeUntyped(raw);
        } catch (Exception e) {
            throw new ConfigException('Field Mappings is not valid JSON: ' + e.getMessage());
        }
        if (src == null) {
            throw new ConfigException('Field Mappings must include "title" and "start".');
        }
        Mappings m = new Mappings();
        m.title = asString(src.get('title'));
        m.startField = asString(src.get('start'));
        m.endField = asString(src.get('end'));
        m.allDay = asString(src.get('allDay'));
        m.recordId = asString(src.get('recordId'));
        if (String.isBlank(m.title) || String.isBlank(m.startField)) {
            throw new ConfigException('Field Mappings must include "title" and "start".');
        }
        return m;
    }

    private static List<FieldConfigEntry> parseFieldConfig(String raw) {
        if (String.isBlank(raw)) {
            return new List<FieldConfigEntry>();
        }
        try {
            List<FieldConfigEntry> entries = (List<FieldConfigEntry>) JSON.deserialize(
                raw,
                List<FieldConfigEntry>.class
            );
            return entries == null ? new List<FieldConfigEntry>() : entries;
        } catch (Exception e) {
            throw new ConfigException('Field Config is not valid JSON: ' + e.getMessage());
        }
    }

    private static ColorRules parseColorRules(String raw) {
        if (String.isBlank(raw)) {
            return new ColorRules();
        }
        try {
            ColorRules rules = (ColorRules) JSON.deserialize(raw, ColorRules.class);
            if (rules == null) {
                return new ColorRules();
            }
            if (rules.rules == null) {
                rules.rules = new List<ColorRule>();
            }
            return rules;
        } catch (Exception e) {
            throw new ConfigException('Color Rules is not valid JSON: ' + e.getMessage());
        }
    }

    private static void addIfPresent(Set<String> paths, String path) {
        if (String.isNotBlank(path)) {
            paths.add(path.trim());
        }
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
