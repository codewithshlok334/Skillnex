import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, post } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('API connection recovery', () => {
  it('explains a disconnected backend and allows a subsequent retry', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json({ id: 'saved-account' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(post('/auth/login', { email: 'test@example.com' })).rejects.toMatchObject({
      status: 0, message: expect.stringContaining('server is running'),
    });
    await expect(api('/users/me')).resolves.toEqual({ id: 'saved-account' });
    expect(fetchMock.mock.calls[1][1].credentials).toBe('include');
  });

  it('preserves backend validation and provider error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
      { message: 'Email or password is incorrect.' }, { status: 401 },
    )));
    await expect(post('/auth/login', {})).rejects.toMatchObject({
      status: 401, message: 'Email or password is incorrect.',
    });
  });

  it('explains a stopped-backend proxy error without showing HTML or parsing errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Proxy error</html>', { status: 500 })));
    await expect(api('/config')).rejects.toMatchObject({
      status: 500, message: expect.stringContaining('backend is running'),
    });
  });

  it('does not treat an HTML fallback page as a successful sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>App</html>', { status: 200 })));
    await expect(post('/auth/login', {})).rejects.toMatchObject({ status: 502 });
  });

  it('preserves caller cancellation for stop and timeout controls', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(api('/assistant/threads', { signal: new AbortController().signal })).rejects.toBe(error);
  });

  it('keeps explicit headers and lets the browser set a multipart boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('file', new Blob(['resume']), 'resume.txt');
    await api('/resumes', { method: 'POST', body: form, headers: new Headers({ 'X-Test': 'kept' }) });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('X-Test')).toBe('kept');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('accepts empty successful responses and returns useful errors for expired sessions', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 })));
    await expect(api('/auth/logout')).resolves.toBeUndefined();
    await expect(api('/users/me')).rejects.toEqual(new ApiError(401, 'Your session has expired. Please sign in again.'));
  });
});
