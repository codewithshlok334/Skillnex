import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';
import { assistantPost } from './assistantRequest';

vi.mock('./client', async (importOriginal) => {
  const original = await importOriginal<typeof import('./client')>();
  return { ...original, api: vi.fn() };
});
afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});
function hangUntilAborted() {
  vi.mocked(api).mockImplementation(
    (_path, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
}
describe('assistant requests', () => {
  it('can send successive questions after a completed reply', async () => {
    vi.mocked(api).mockResolvedValueOnce({ reply: '4' }).mockResolvedValueOnce({ reply: '7' });
    expect(
      await assistantPost(
        '/assistant/threads/t/messages',
        { text: '2+2' },
        new AbortController().signal,
      ),
    ).toEqual({ reply: '4' });
    expect(
      await assistantPost(
        '/assistant/threads/t/messages',
        { text: 'add 3' },
        new AbortController().signal,
      ),
    ).toEqual({ reply: '7' });
    expect(api).toHaveBeenCalledTimes(2);
  });
  it('releases a stalled request after the deadline', async () => {
    vi.useFakeTimers();
    hangUntilAborted();
    const result = assistantPost('/assistant/threads/t/messages', {}, new AbortController().signal);
    const rejected = expect(result).rejects.toThrow('taking too long');
    await vi.advanceTimersByTimeAsync(35000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('lets the user stop waiting and send again', async () => {
    hangUntilAborted();
    const controller = new AbortController();
    const result = assistantPost('/assistant/threads/t/messages', {}, controller.signal);
    const rejected = expect(result).rejects.toThrow('Stopped waiting');
    controller.abort();
    await rejected;
    vi.mocked(api).mockResolvedValueOnce({ reply: 'saved' });
    expect(
      await assistantPost('/assistant/threads/t/messages', {}, new AbortController().signal),
    ).toEqual({ reply: 'saved' });
  });
  it('preserves the actual provider quota error', async () => {
    vi.mocked(api).mockRejectedValueOnce(new ApiError(429, 'AI provider quota reached'));
    await expect(
      assistantPost('/assistant/threads/t/messages', {}, new AbortController().signal),
    ).rejects.toThrow('AI provider quota reached');
  });
});
