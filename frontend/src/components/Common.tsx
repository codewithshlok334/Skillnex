import type { ReactNode } from 'react';
import { ArrowRight, AlertCircle, Sparkles, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>{children}</section>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  to,
  label = 'View all',
}: {
  title: string;
  subtitle?: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {to && (
        <Link className="text-link" to={to}>
          {label}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sparkles size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading({ text = 'Loading your workspace…' }: { text?: string }) {
  return (
    <div role="status" className="loading">
      <span>
        <LoaderCircle className="spin" size={18} />
        {text}
      </span>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-box">
      <AlertCircle size={20} />
      <div>
        <strong>We couldn’t complete that request</strong>
        <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
        {retry && (
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
export function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div
      className={'progress ' + className}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: Math.min(100, Math.max(0, value)) + '%' }} />
    </div>
  );
}
export function AILabel({ demo = false }: { demo?: boolean }) {
  return (
    <span className="ai-label">
      <Sparkles size={12} />
      {demo ? 'Sample AI result · Demo' : 'AI-generated · Review before using'}
    </span>
  );
}
export function ScoreRing({ value, size = 120 }: { value: number; size?: number }) {
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120">
        <circle className="ring-track" cx="60" cy="60" r="50" />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r="50"
          strokeDasharray={Math.PI * 100}
          strokeDashoffset={Math.PI * 100 * (1 - value / 100)}
        />
      </svg>
      <div>
        <strong>{value}</strong>
        <small>out of 100</small>
      </div>
    </div>
  );
}
