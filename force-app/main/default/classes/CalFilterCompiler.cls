/**
 * The Filter_Criteria__c rules in one place: placeholder expansion and the
 * trial-compile. Shared by the save-time validation (CalCalendarTriggerHandler),
 * the runtime query (CalEventQuery), and the record-page helper's pre-save check
 * (CalFilterController). Stateless.
 *
 * Placeholders expand to bind references, never to literal values.
 */
public inherited sharing class CalFilterCompiler {
    /** Documented placeholder → the bind it expands to. */
    private static final Map<String, String> PLACEHOLDERS = new Map<String, String>{
        '$CURRENT_USER_ID' => ':currentUserId',
        '$RANGE_START' => ':rangeStart',
        '$RANGE_END' => ':rangeEnd'
    };

    /** Replace the documented placeholders with bind references — never values. */
    public static String expand(String raw) {
        if (String.isBlank(raw)) {
            return null;
        }
        String out = raw.trim();
        for (String token : PLACEHOLDERS.keySet()) {
            out = out.replace(token, PLACEHOLDERS.get(token));
        }
        return out;
    }

    /** The bind map the expanded fragment references. */
    public static Map<String, Object> binds(Datetime rangeStart, Datetime rangeEnd) {
        return new Map<String, Object>{
            'currentUserId' => UserInfo.getUserId(),
            'rangeStart' => rangeStart,
            'rangeEnd' => rangeEnd
        };
    }

    /**
     * Null when `raw` is a usable WHERE fragment for `token`; otherwise a
     * user-facing reason. Compiles the fragment with LIMIT 0 so nothing runs.
     */
    public static String problem(SObjectType token, String raw) {
        if (String.isBlank(raw)) {
            return null;
        }
        if (raw.contains(';') || raw.contains('//') || raw.contains('/*')) {
            return '";" and comments are not allowed.';
        }
        String probe =
            'SELECT Id FROM ' +
            token.getDescribe().getName() +
            ' WHERE (' +
            expand(raw) +
            ') LIMIT 0';
        try {
            Database.queryWithBinds(probe, binds(Datetime.now(), Datetime.now()), AccessLevel.SYSTEM_MODE);
        } catch (Exception e) {
            return 'does not compile: ' + e.getMessage();
        }
        return null;
    }
}