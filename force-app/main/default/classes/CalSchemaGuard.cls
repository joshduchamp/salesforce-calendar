/**
 * The security boundary for dynamic SOQL. Every object and field identifier that
 * reaches a query string must first be validated here against the schema and the
 * running user's read access. Also holds the value-formatting helpers the row
 * mapper uses.
 *
 * Stateless apart from a transaction-local describe cache.
 */
public inherited sharing class CalSchemaGuard {
    private static final Integer MAX_PATH_DEPTH = 5;
    private static final String ISO_UTC = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';
    private static Map<String, SObjectType> describeCache = new Map<String, SObjectType>();

    public class SchemaException extends Exception {}

    /**
     * Resolve an object API name to its token, rejecting anything that is not a
     * real, queryable, readable SObject.
     */
    public static SObjectType describeObject(String objectApiName) {
        if (String.isBlank(objectApiName)) {
            throw new SchemaException('Target object is required.');
        }
        String key = objectApiName.trim().toLowerCase();
        if (describeCache.containsKey(key)) {
            return describeCache.get(key);
        }
        SObjectType token = Schema.getGlobalDescribe().get(objectApiName.trim());
        if (token == null) {
            throw new SchemaException('Unknown object: ' + objectApiName);
        }
        DescribeSObjectResult d = token.getDescribe();
        if (!d.isQueryable() || !d.isAccessible()) {
            throw new SchemaException('You do not have access to ' + objectApiName + '.');
        }
        describeCache.put(key, token);
        return token;
    }

    public static Boolean isQueryable(SObjectType token) {
        return token != null && token.getDescribe().isQueryable() && token.getDescribe().isAccessible();
    }

    /**
     * True when `path` (a field API name, optionally dotted through lookup
     * relationships) exists on `root` and every segment is readable by the
     * running user. Relationship depth is capped at MAX_PATH_DEPTH.
     */
    public static Boolean validateFieldPath(SObjectType root, String path) {
        if (root == null || String.isBlank(path)) {
            return false;
        }
        List<String> parts = path.trim().split('\\.');
        if (parts.isEmpty() || parts.size() > MAX_PATH_DEPTH) {
            return false;
        }
        SObjectType current = root;
        for (Integer i = 0; i < parts.size(); i++) {
            String segment = parts[i].trim();
            if (String.isBlank(segment)) {
                return false;
            }
            Map<String, SObjectField> fieldMap = current.getDescribe().fields.getMap();
            Boolean isLast = (i == parts.size() - 1);
            if (isLast) {
                SObjectField field = fieldMap.get(segment.toLowerCase());
                return field != null && field.getDescribe().isAccessible();
            }
            SObjectType next = relationshipTarget(fieldMap, segment);
            if (next == null) {
                return false;
            }
            current = next;
        }
        return false;
    }

    /** The subset of `paths` that pass validateFieldPath, order not preserved. */
    public static Set<String> filterValidPaths(SObjectType root, Set<String> paths) {
        Set<String> valid = new Set<String>();
        for (String path : paths) {
            if (validateFieldPath(root, path)) {
                valid.add(path);
            }
        }
        return valid;
    }

    public static String toIsoUtc(Datetime value) {
        return value == null ? null : value.formatGmt(ISO_UTC);
    }

    /** Coerce a queried field value to something JSON-friendly for the meta bag. */
    public static Object stringifyForMeta(Object raw) {
        if (raw == null) {
            return null;
        }
        // A Date value also satisfies `instanceof Datetime` in Apex, so test Date first.
        if (raw instanceof Date) {
            return String.valueOf((Date) raw);
        }
        if (raw instanceof Datetime) {
            return ((Datetime) raw).formatGmt(ISO_UTC);
        }
        return raw;
    }

    private static SObjectType relationshipTarget(Map<String, SObjectField> fieldMap, String relationshipName) {
        for (SObjectField field : fieldMap.values()) {
            DescribeFieldResult dfr = field.getDescribe();
            if (
                dfr.getRelationshipName() != null &&
                dfr.getRelationshipName().equalsIgnoreCase(relationshipName) &&
                dfr.isAccessible() &&
                !dfr.getReferenceTo().isEmpty()
            ) {
                return dfr.getReferenceTo()[0];
            }
        }
        return null;
    }
}