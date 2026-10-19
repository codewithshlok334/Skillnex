import { describe, expect, it } from 'vitest';
import { activityCalendar, activityDate, activityLevel } from './codingActivity';

describe('coding activity calendar', () => {
  it('includes leap day, every month boundary and zero-activity days', () => {
    const days = activityCalendar(2024, [{ date: '2024-02-29', count: 3 }], '2024-10-19');
    expect(days).toHaveLength(366);
    expect(days[0]).toMatchObject({ date: '2024-01-01', weekday: 1, week: 0, count: 0 });
    expect(days.find(day => day.date === '2024-02-29')).toMatchObject({ count: 3, weekday: 4 });
    expect(days.at(-1)).toMatchObject({ date: '2024-12-31', week: 52, future: true });
    expect(days.filter(day => !day.future).at(-1)?.date).toBe('2024-10-19');
    expect(days.filter(day => day.date.endsWith('-01'))).toHaveLength(12);
  });
  it('keeps Sunday starts and dates in the right cells regardless of local timezone', () => {
    expect(activityCalendar(2023, [], '2026-10-19')[0]).toMatchObject({ weekday: 0, week: 0 });
    expect(activityCalendar(2023, [], '2026-10-19')).toHaveLength(365);
    expect(activityDate('2024-01-01')).toBe('1 January 2024');
  });
  it('uses predictable darker levels for more solved questions', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 50].map(activityLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});
