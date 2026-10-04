import { describe, expect, it, vi } from 'vitest';
import { saveInterviewTurn } from './interviewFlow';

describe('spoken interview turn persistence', () => {
  it('acknowledges only a saved answer and before requesting the next question', async () => {
    const events: string[] = [];
    const action = vi.fn(async (path: string) => { events.push(path); return true; });
    await saveInterviewTurn(action, 'q1', 'My answer', false, undefined, () => { events.push('acknowledge'); });
    expect(events).toEqual(['answer', 'acknowledge', 'next']);
    const acknowledge = vi.fn();
    await saveInterviewTurn(vi.fn().mockResolvedValue(false), 'q1', 'My answer', false, undefined, acknowledge);
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it('saves the answer before asking for the next question', async () => {
    const action = vi.fn().mockResolvedValue(true);
    expect(await saveInterviewTurn(action, 'q1', '  My example  ', false)).toBe('advanced');
    expect(action.mock.calls).toEqual([
      ['answer', { questionId: 'q1', text: 'My example' }],
      ['next'],
    ]);
  });
  it('does not request another question when saving failed', async () => {
    const action = vi.fn().mockResolvedValue(false);
    expect(await saveInterviewTurn(action, 'q1', 'My example', false)).toBe('save-failed');
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('reports a retryable follow-up failure without resubmitting the answer', async () => {
    const action = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await saveInterviewTurn(action, 'q1', 'My example', false)).toBe('followup-failed');
    expect(action.mock.calls.filter(([path]) => path === 'answer')).toHaveLength(1);
  });
  it('finishes at the question limit and ignores blank transcripts', async () => {
    const action = vi.fn().mockResolvedValue(true);
    expect(await saveInterviewTurn(action, 'q20', 'Last answer', true)).toBe('finished');
    expect(action).toHaveBeenCalledTimes(1);
    expect(await saveInterviewTurn(action, 'q20', '   ', false)).toBe('empty');
    expect(action).toHaveBeenCalledTimes(1);
  });
});
