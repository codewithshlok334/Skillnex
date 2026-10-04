import { describe, it, expect } from 'vitest';
import { timestamp, date, initials } from './cn';
describe('server dates', () => {
  it('honors explicit offsets instead of adding a second timezone', () => {
    expect(timestamp('2026-09-24T23:56:00+05:30')).toBe(Date.parse('2026-09-24T18:26:00Z'));
    expect(timestamp('2026-09-24T18:26:00Z')).toBe(Date.parse('2026-09-24T18:26:00Z'));
  });
  it('treats offset-free API timestamps as UTC and supports unscheduled sessions', () => {
    expect(timestamp('2026-09-24T18:26:00')).toBe(Date.parse('2026-09-24T18:26:00Z'));
    expect(date(null)).toBe('On your schedule');
  });
  it('builds concise avatar labels', () => {
    expect(initials('Alex Morgan')).toBe('AM');
  });
});
