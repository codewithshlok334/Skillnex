import { describe, expect, it } from 'vitest';
import { mouthOpening } from './portraitMotion';
describe('portrait speech movement', () => {
  it('returns to the closed mouth when speech stops', () => {
    expect(mouthOpening(500, 40, false)).toBe(0);
    expect(mouthOpening(0, 0, true)).toBe(0);
  });
  it('does not invent syllables without real speech boundary events', () => {
    const frames = Array.from({length:60},(_,i)=>mouthOpening(200 + i*33, 9999, true));
    expect(Math.max(...frames)).toBe(0);
    expect(Math.min(...frames)).toBe(0);
    expect(frames.every(v=>v>=0 && v<=1)).toBe(true);
  });
  it('responds to a recent word boundary without holding the mouth open', () => {
    expect(mouthOpening(430, 80, true)).toBeGreaterThan(mouthOpening(430, 9999, true));
    expect(mouthOpening(430, 900, true)).toBe(mouthOpening(430, 9999, true));
  });
});
