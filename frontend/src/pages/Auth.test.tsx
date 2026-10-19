import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './Auth';
import { useConfig } from '../hooks/useSession';

vi.mock('../hooks/useSession', () => ({ useConfig: vi.fn() }));
vi.mock('../layouts/AppLayout', () => ({ Logo: () => <span>SkillNex</span> }));
vi.mock('./Dashboard', () => ({ OrbitArt: () => null }));

function renderForgot() {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Auth mode="forgot" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function config(input: Record<string, unknown>) {
  vi.mocked(useConfig).mockReturnValue(input as unknown as ReturnType<typeof useConfig>);
}

describe('password recovery availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains missing delivery without offering a form or claiming a link can be sent', () => {
    config({ data: { passwordResetAvailable: false }, isLoading: false });
    const html = renderForgot();
    expect(html).toContain('email delivery has not been set up');
    expect(html).toContain('Back to sign in');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Send reset link');
    expect(html).not.toContain('We’ll send you a link');
  });

  it('waits for configuration before offering password recovery', () => {
    config({ isLoading: true });
    const html = renderForgot();
    expect(html).toContain('Checking password recovery');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('email delivery has not been set up');
  });

  it('shows a retryable configuration error instead of an unusable form', () => {
    config({ isLoading: false, error: new Error('Server unavailable'), refetch: vi.fn() });
    const html = renderForgot();
    expect(html).toContain('Server unavailable');
    expect(html).not.toContain('<form');
  });

  it('offers email recovery when delivery is configured', () => {
    config({ data: { passwordResetAvailable: true, demo: false }, isLoading: false });
    const html = renderForgot();
    expect(html).toContain('<form');
    expect(html).toContain('Send reset link');
    expect(html).toContain('We’ll send you a link');
  });

  it('keeps demo recovery available without promising email delivery', () => {
    config({ data: { passwordResetAvailable: true, demo: true }, isLoading: false });
    const html = renderForgot();
    expect(html).toContain('<form');
    expect(html).toContain('Create a password-reset link for this local demo');
    expect(html).not.toContain('We’ll send you a link');
  });
});
