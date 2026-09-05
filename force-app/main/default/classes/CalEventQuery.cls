/**
 * Turns one Cal_Calendar__c definition into generic calendar events for a date
 * range. This is the only place dynamic SOQL against an arbitrary target object
 * is built and run. Every identifier in the query string is validated by
 * CalSchemaGuard first; all user-supplied values are bind variables; the query
 * runs in USER_MODE so the viewing user's CRUD/FLS always applies.
 */
public with sharing class CalEventQuery {
    public class QueryConfigException extends Exception {}

    private static final String ISO_UTC = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';

    private final Cal_Calendar__c def;
    private final String calendarId;

    public CalEventQuery(Cal_Calendar__c definition) {
        this.def = definition;
        this.calendarId = String.valueOf(definition.Id);
    }

    public List<CalDto.Event> run(Datetime rangeStart, Datetime rangeEnd, Integer rowLimit) {
        CalJsonConfig.Parsed cfg = CalJsonConfig.parse(def);
        SObjectType token = CalSchemaGuard.describeObject(def.Target_Object__c);
        CalJsonConfig.Mappings m = cfg.mappings;

        String titleField = requireField(token, m.title, 'title');
        String startField = requireField(token, m.startField, 'start');
        String endField = String.isBlank(m.endField) ? null : requireField(token, m.endField, 'end');
        String recordIdField = String.isBlank(m.recordId) ? null : requireField(token, m.recordId, 'recordId');
        String allDayField = (m.allDay != null && !m.allDayIsLiteral() && String.isNotBlank(m.allDay))
            ? requireField(token, m.allDay, 'allDay')
            : null;

        // Optional meta fields: silently dropped when invalid or not readable.
        Map<String, String> metaKeyToPath = new Map<String, String>();
        for (CalJsonConfig.FieldConfigEntry entry : cfg.fieldConfig) {
            if (entry == null || String.isBlank(entry.key)) {
                continue;
            }
            String path = entry.effectiveSource();
            if (CalSchemaGuard.validateFieldPath(token, path)) {
                metaKeyToPath.put(entry.key, path);
            }
        }

        Set<String> selectFields = new Set<String>{ 'Id', titleField, startField };
        if (endField != null) {
            selectFields.add(endField);
        }
        if (recordIdField != null) {
            selectFields.add(recordIdField);
        }
        if (allDayField != null) {
            selectFields.add(allDayField);
        }
        selectFields.addAll(metaKeyToPath.values());

        String coverEndField = (endField != null) ? endField : startField;

        Map<String, Object> binds = new Map<String, Object>{
            'rangeStart' => rangeStart,
            'rangeEnd' => rangeEnd,
            'currentUserId' => UserInfo.getUserId(),
            'rowLimit' => rowLimit
        };

        String soql =
            'SELECT ' +
            String.join(new List<String>(selectFields), ', ') +
            ' FROM ' +
            token.getDescribe().getName() +
            ' WHERE ' +
            startField +
            ' <= :rangeEnd AND ' +
            coverEndField +
            ' >= :rangeStart';

        String filter = expandFilter(def.Filter_Criteria__c);
        if (String.isNotBlank(filter)) {
            soql += ' AND (' + filter + ')';
        }
        soql += ' ORDER BY ' + startField + ' LIMIT :rowLimit';

        List<SObject> rows = Database.queryWithBinds(soql, binds, AccessLevel.USER_MODE);
        rows = Security.stripInaccessible(AccessType.READABLE, rows).getRecords();

        return mapRows(rows, m, titleField, startField, endField, recordIdField, allDayField, metaKeyToPath);
    }

    private List<CalDto.Event> mapRows(
        List<SObject> rows,
        CalJsonConfig.Mappings m,
        String titleField,
        String startField,
        String endField,
        String recordIdField,
        String allDayField,
        Map<String, String> metaKeyToPath
    ) {
        List<CalDto.Event> events = new List<CalDto.Event>();
        for (SObject row : rows) {
            Boolean allDay = m.allDayIsLiteral()
                ? m.allDayLiteralValue()
                : toBool(getPath(row, allDayField));

            CalDto.Event e = new CalDto.Event();
            e.id = calendarId + ':' + String.valueOf(row.get('Id'));
            e.calendarId = calendarId;
            e.title = toStringValue(getPath(row, titleField));
            e.start = formatInstant(getPath(row, startField), allDay);
            e.endsAt = (endField == null) ? e.start : formatInstant(getPath(row, endField), allDay);
            e.allDay = allDay;
            e.recordId = (recordIdField == null) ? null : toStringValue(getPath(row, recordIdField));
            e.meta = new Map<String, Object>();
            for (String key : metaKeyToPath.keySet()) {
                e.meta.put(key, CalSchemaGuard.stringifyForMeta(getPath(row, metaKeyToPath.get(key))));
            }
            events.add(e);
        }
        return events;
    }

    private String requireField(SObjectType token, String path, String label) {
        if (!CalSchemaGuard.validateFieldPath(token, path)) {
            throw new QueryConfigException(
                'Calendar "' + def.Name + '": mapped ' + label + ' field "' + path + '" is not valid or not readable.'
            );
        }
        return path.trim();
    }

    /** Replace the documented placeholders with bind references — never values. */
    private String expandFilter(String raw) {
        if (String.isBlank(raw)) {
            return null;
        }
        return raw.trim()
            .replace('$CURRENT_USER_ID', ':currentUserId')
            .replace('$RANGE_START', ':rangeStart')
            .replace('$RANGE_END', ':rangeEnd');
    }

    private static Object getPath(SObject row, String path) {
        if (row == null || String.isBlank(path)) {
            return null;
        }
        if (!path.contains('.')) {
            return row.get(path);
        }
        List<String> parts = path.split('\\.');
        SObject current = row;
        for (Integer i = 0; i < parts.size() - 1; i++) {
            if (current == null) {
                return null;
            }
            current = current.getSObject(parts[i]);
        }
        return current == null ? null : current.get(parts[parts.size() - 1]);
    }

    private static String formatInstant(Object raw, Boolean allDay) {
        if (raw == null) {
            return null;
        }
        // A Date value also satisfies `instanceof Datetime` in Apex, so test Date first.
        if (raw instanceof Date) {
            return String.valueOf((Date) raw) + 'T00:00:00';
        }
        if (raw instanceof Datetime) {
            Datetime dt = (Datetime) raw;
            return allDay ? dt.format('yyyy-MM-dd') + 'T00:00:00' : dt.formatGmt(ISO_UTC);
        }
        return String.valueOf(raw);
    }

    private static Boolean toBool(Object raw) {
        return raw instanceof Boolean ? (Boolean) raw : false;
    }

    private static String toStringValue(Object raw) {
        return raw == null ? '' : String.valueOf(raw);
    }
}
