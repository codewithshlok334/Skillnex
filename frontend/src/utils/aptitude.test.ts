import { describe, expect, it } from 'vitest';
import { remainingSeconds, timerLabel, mockTotals } from './aptitude';

describe('Aptitude test timing', () => {
  it('uses the server deadline even when the browser clock is far ahead', () => {
    expect(remainingSeconds(160000, 100000, 999000000, 999015000)).toBe(45);
  });
  it('does not go below zero after a suspended tab resumes', () => {
    expect(remainingSeconds(160000, 100000, 1000, 1000000)).toBe(0);
  });
  it('supports user-selected long durations and a zero timer', () => {
    expect(timerLabel(3 * 3600)).toBe('180:00'); expect(timerLabel(0)).toBe('00:00'); expect(timerLabel(61)).toBe('01:01');
  });
  it('counts option A as answered and distinguishes wrong from skipped', () => {
    const mock = { total: 3, score: 1, answers: { '2': 0, '9': 3 }, questions: [{ id: 2 }, { id: 9 }, { id: 12 }] };
    expect(mockTotals(mock)).toEqual({ answered: 2, correct: 1, wrong: 1, skipped: 1, percent: 33 });
  });
});
