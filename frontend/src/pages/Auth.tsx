import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Sparkles, ArrowLeft, Check } from 'lucide-react';
import { post } from '../api/client';
import { useConfig } from '../hooks/useSession';
import { Logo } from '../layouts/AppLayout';
import { Button } from '../components/ui/button';
import { ErrorState, Loading } from '../components/Common';
import { OrbitArt } from './Dashboard';
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'demo';

export function Auth({ mode = 'login' }: { mode?: AuthMode }) {
  const [params] = useSearchParams();
  // Each route needs its own form state, including a fresh password-reset link.
  return <AuthForm key={`${mode}:${params.get('token') || ''}:${params.get('error') || ''}`} mode={mode} />;
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const config = useConfig(),
    navigate = useNavigate(),
    client = useQueryClient();
  const [params] = useSearchParams();
  const requestPending = useRef(false);
  const automaticDemoStarted = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(
      params.get('error')
        ? new Error(
            'Google sign-in failed or this email already uses a password. Please sign in with your existing password.',
          )
        : null,
    ),
    [result, setResult] = useState<any>(null);
  async function demo(role = 'student') {
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setError(null);
    try {
      await post('/auth/login', { email: role + '@careerx.demo', password: 'CareerX-demo-2026!' });
      client.clear();
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (mode === 'demo' && config.data?.demo && !automaticDemoStarted.current) {
      automaticDemoStarted.current = true;
      void demo();
    }
  }, [mode, config.data?.demo]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (requestPending.current || mode === 'demo') return;
    requestPending.current = true;
    setBusy(true);
    setError(null);
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (typeof values.email === 'string') values.email = values.email.trim();
    if (typeof values.name === 'string') values.name = values.name.trim();
    try {
      if (mode === 'login' || mode === 'signup') {
        await post('/auth/' + mode, values);
        client.clear();
        navigate('/app', { replace: true });
      } else if (mode === 'forgot') {
        setResult(await post('/auth/forgot-password', values));
      } else {
        await post('/auth/reset-password', { ...values, token: params.get('token') || '' });
        setResult({ message: 'Password updated. Sign in with your new password.' });
      }
    } catch (e) {
      setError(e);
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }
  const title =
    mode === 'signup'
      ? 'Your next chapter starts here.'
      : mode === 'forgot'
        ? 'Let’s get you back in.'
        : mode === 'reset'
          ? 'A fresh start.'
          : 'Welcome to your next chapter.';
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <span className="eyebrow">THE FUTURE IS YOURS TO BUILD</span>
          <h1>
            Big dreams.
            <br />
            Real progress.
            <br />
            <em>All you.</em>
          </h1>
          <p>
            Your career isn’t a straight line. We’re here for every step, every question, and every
            new beginning.
          </p>
          <OrbitArt />
        </div>
        <span className="auth-caption">
          <Sparkles size={15} />
          Craft Your Resume. Crack Your Interview
        </span>
      </div>
      <div className="auth-form-wrap">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Back to SkillNex
        </Link>
        <div className="auth-form">
          <span className="eyebrow">LET’S MAKE THINGS HAPPEN</span>
          <h2>{title}</h2>
          <p className="muted">
            {mode === 'signup'
              ? 'Start free. Build at your own pace.'
              : mode === 'forgot'
                ? 'We’ll send you a link to reset your password.'
                : mode === 'reset'
                  ? 'Choose a new password with at least 10 characters.'
                  : 'Your goals, your growth, your workspace.'}
          </p>
          {!!error && <ErrorState error={error} />}
          {result ? (
            <div className="success-box">
              <Check size={20} />
              <p>{result.message}</p>
              {result.demoResetUrl && (
                <Link to={result.demoResetUrl}>Open demo reset link (local demo only)</Link>
              )}
              <Link to="/login">Back to sign in</Link>
            </div>
          ) : mode === 'demo' ? (
            config.isLoading || busy ? (
              <Loading text="Opening your demo workspace…" />
            ) : config.error ? (
              <ErrorState error={config.error} retry={() => { void config.refetch(); }} />
            ) : (
              <div className="stack">
                {config.data?.demo ? (
                  <Button type="button" onClick={() => void demo()}>Try opening the demo again</Button>
                ) : (
                  <p>Demo accounts are not available here. Sign in with your own account.</p>
                )}
                <Link to="/login">Back to sign in</Link>
              </div>
            )
          ) : (
            <form onSubmit={submit} className="stack">
              {mode === 'signup' && (
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    placeholder="Alex Morgan"
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@university.edu"
                  />
                </label>
              )}
              {mode !== 'forgot' && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'login' ? 1 : 10}
                    maxLength={72}
                    placeholder={
                      mode === 'login' ? 'Enter your password' : 'At least 10 characters'
                    }
                  />
                </label>
              )}
              {mode === 'signup' && (
                <details className="optional-fields">
                  <summary>
                    Make it yours <span>Optional profile details</span>
                  </summary>
                  <div className="form-grid">
                    {[
                      ['college', 'College'],
                      ['course', 'Course'],
                      ['branch', 'Branch'],
                      ['studyYear', 'Year of study'],
                      ['graduationYear', 'Graduation year'],
                      ['careerGoal', 'Career goal'],
                    ].map(([name, label]) => (
                      <label key={name}>
                        {label}
                        <input
                          name={name}
                          maxLength={
                            name === 'graduationYear' ? 10 : name === 'studyYear' ? 20 : 100
                          }
                        />
                      </label>
                    ))}
                  </div>
                </details>
              )}
              {mode === 'login' && (
                <Link className="auth-forgot" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <Button disabled={busy} type="submit">
                {busy
                  ? 'One moment…'
                  : mode === 'signup'
                    ? 'Create free account'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : mode === 'reset'
                        ? 'Update password'
                        : 'Sign in'}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {(mode === 'login' || mode === 'signup') && (
            <>
              {config.data?.googleEnabled && (
                <>
                  <div className="divider-text">or continue with</div>
                  <Button asChild variant="secondary">
                    <a href="/oauth2/authorization/google">
                      <span className="google-g">G</span>Continue with Google
                    </a>
                  </Button>
                </>
              )}
              <p className="auth-switch">
                {mode === 'login' ? 'New around here?' : 'Already have an account?'}{' '}
                <Link to={mode === 'login' ? '/signup' : '/login'}>
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </Link>
              </p>
              {config.data?.demo && (
                <div className="demo-login">
                  <span>TAKE A LOOK AROUND</span>
                  <div>
                    {['student', 'faculty', 'admin'].map((role) => (
                      <Button
                        type="button"
                        key={role}
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => demo(role)}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)} demo
                      </Button>
                    ))}
                  </div>
                  <small>Populated sample accounts. No setup required.</small>
                </div>
              )}
            </>
          )}
        </div>
        <p className="auth-legal">A little progress, every day. That’s the SkillNex way.</p>
      </div>
    </div>
  );
}
