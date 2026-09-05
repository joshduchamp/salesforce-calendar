@IsTest
private class CalFilterControllerTest {
    @IsTest
    static void acceptsABlankFragment() {
        CalDto.FilterCheck result = CalFilterController.checkFilter('Event', '   ');
        System.assertEquals(true, result.valid);
        System.assertEquals(null, result.message);
    }

    @IsTest
    static void acceptsAFragmentThatUsesEveryPlaceholder() {
        CalDto.FilterCheck result = CalFilterController.checkFilter(
            'Event',
            'OwnerId = $CURRENT_USER_ID AND StartDateTime >= $RANGE_START AND EndDateTime <= $RANGE_END'
        );
        System.assertEquals(true, result.valid, 'expected a valid fragment: ' + result.message);
    }

    @IsTest
    static void rejectsAFragmentThatDoesNotCompile() {
        CalDto.FilterCheck result = CalFilterController.checkFilter('Event', 'ShowAs = = Busy');
        System.assertEquals(false, result.valid);
        System.assert(
            result.message.containsIgnoreCase('does not compile'),
            'message was: ' + result.message
        );
    }

    @IsTest
    static void rejectsSemicolonsAndComments() {
        CalDto.FilterCheck result = CalFilterController.checkFilter('Event', 'ShowAs = \'Busy\'; DELETE');
        System.assertEquals(false, result.valid);
        System.assert(result.message.contains('";"'), 'message was: ' + result.message);
    }

    @IsTest
    static void rejectsAnUnknownTargetObject() {
        CalDto.FilterCheck result = CalFilterController.checkFilter('No_Such_Object__x', 'Id != null');
        System.assertEquals(false, result.valid);
        System.assert(
            result.message.containsIgnoreCase('object'),
            'message was: ' + result.message
        );
    }

    @IsTest
    static void expandSwapsPlaceholdersForBindReferences() {
        String expanded = CalFilterCompiler.expand('OwnerId = $CURRENT_USER_ID');
        System.assertEquals('OwnerId = :currentUserId', expanded);
        System.assertEquals(null, CalFilterCompiler.expand('  '));
    }
}