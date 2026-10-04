import { api } from './client';

// The server gives the provider 30 seconds; allow a little extra for transport.
export async function assistantPost<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 35000);
  try {
    return await api<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        timedOut
          ? 'The reply is taking too long. Your message is kept. Retry in a moment.'
          : 'Stopped waiting. Your message is kept. The server may still finish; retrying this message will not save it twice.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
