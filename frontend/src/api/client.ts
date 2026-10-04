export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let res: Response;
  try {
    res = await fetch('/api' + path, { ...options, credentials: 'include', headers });
  } catch (error) {
    // Callers use aborts for navigation, cancellation and their own timeouts.
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(0, 'Cannot reach SkillNex. Check your connection and make sure the server is running, then try again.');
  }
  if (!res.ok) {
    let message = res.status === 401
      ? 'Your session has expired. Please sign in again.'
      : res.status === 403
        ? 'This request is not allowed. Refresh the page and try again.'
        : res.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : res.status >= 500
            ? 'SkillNex could not complete the request. If running locally, make sure the backend is running, then try again.'
            : 'Could not complete this request. Please try again.';
    try {
      const body = await res.json();
      if (typeof body?.message === 'string' && body.message.trim()) message = body.message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  try {
    return await res.json();
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError(502, 'SkillNex returned an incomplete response. Refresh the page and try again.');
  }
}
export const post = <T = any>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const put = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export async function download(path: string, filename: string) {
  const response = await fetch('/api' + path, { credentials: 'include' });
  if (!response.ok) throw new Error('Download failed. Please try again.');
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
