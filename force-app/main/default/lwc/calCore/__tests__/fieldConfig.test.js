import { normalizeEvent, resolveFields } from 'c/calCore';

const event = normalizeEvent({
    id: 'a',
    title: 'Weekly sync',
    start: '2026-08-29T09:00:00',
    meta: {
        location: 'Room 4',
        owner: 'Dana',
        notes: 'Bring the quarterly numbers and the roadmap draft',
        attendees: ['Dana', 'Lee', 'Sam']
    }
});

describe('resolveFields', () => {
    it('returns configured fields in order', () => {
        const fields = resolveFields(
            event,
            [
                { key: 'owner', label: 'Owner', showLabel: true },
                { key: 'location' }
            ],
            'month'
        );
        expect(fields.map((f) => f.key)).toEqual(['owner', 'location']);
        expect(fields[0]).toMatchObject({ label: 'Owner', showLabel: true, value: 'Dana' });
        expect(fields[1]).toMatchObject({ label: 'location', showLabel: false });
    });

    it('drops empty values', () => {
        const fields = resolveFields(event, [{ key: 'missing' }, { key: 'owner' }], 'month');
        expect(fields.map((f) => f.key)).toEqual(['owner']);
    });

    it('filters by view', () => {
        const config = [
            { key: 'owner', views: ['scheduler'] },
            { key: 'location', views: ['month', 'scheduler'] }
        ];
        expect(resolveFields(event, config, 'month').map((f) => f.key)).toEqual(['location']);
        expect(resolveFields(event, config, 'scheduler').map((f) => f.key)).toEqual([
            'owner',
            'location'
        ]);
    });

    it('truncates long values', () => {
        const [field] = resolveFields(event, [{ key: 'notes', truncate: 20 }], 'month');
        expect(field.value).toHaveLength(20);
        expect(field.value.endsWith('…')).toBe(true);
    });

    it('joins array values', () => {
        const [field] = resolveFields(event, [{ key: 'attendees' }], 'month');
        expect(field.value).toBe('Dana, Lee, Sam');
    });
});
