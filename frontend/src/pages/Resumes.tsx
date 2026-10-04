import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  Download,
  Check,
  AlertCircle,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, post, download } from '../api/client';
import type { Data, Analysis } from '../types';
import {
  Card,
  PageTitle,
  SectionTitle,
  Loading,
  ErrorState,
  Empty,
  ScoreRing,
  Progress,
  AILabel,
} from '../components/Common';
import { Button } from '../components/ui/button';
export function Resumes() {
  const client = useQueryClient(),
    input = useRef<HTMLInputElement>(null);
  const operation = useRef(false);
  const list = useQuery({ queryKey: ['resumes'], queryFn: () => api<Data[]>('/resumes') });
  const [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState<unknown>(null),
    [suggestions, setSuggestions] = useState<Record<number, string>>({});
  const id = selected || list.data?.[0]?.id;
  const resume = useQuery({
    queryKey: ['resume', id],
    queryFn: () => api<Data>('/resumes/' + id),
    enabled: !!id,
  });
  async function upload(file?: File) {
    if (!file || operation.current) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) {
      toast.error('Choose a PDF or DOCX smaller than 5 MB.');
      if (input.current) input.current.value = '';
      return;
    }
    operation.current = true;
    setBusy('Reading your resume…');
    setError(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await api('/resumes', { method: 'POST', body: data });
      setSelected(result.id);
      setSuggestions({});
      client.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume uploaded. Ready to analyze.');
    } catch (e) {
      setError(e);
    } finally {
      operation.current = false;
      setBusy('');
      if (input.current) input.current.value = '';
    }
  }
  async function analyze() {
    if (!id || operation.current) return;
    operation.current = true;
    setBusy('Analyzing skills and checking ATS compatibility…');
    setError(null);
    try {
      await post('/resumes/' + id + '/analyze');
      await resume.refetch();
      setSuggestions({});
      client.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Your analysis is ready.');
    } catch (e) {
      setError(e);
    } finally {
      operation.current = false;
      setBusy('');
    }
  }
  async function fix(index: number, text: string) {
    if (operation.current) return;
    if (!text) {
      toast.info('Add your own supporting details in the resume builder.');
      return;
    }
    operation.current = true;
    setBusy('Preparing a truthful wording suggestion…');
    try {
      const result = await post('/resumes/improve', { text });
      setSuggestions((s) => ({ ...s, [index]: result.suggestion }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      operation.current = false;
      setBusy('');
    }
  }
  const analysis = resume.data?.analysis as Analysis | undefined;
  return (
    <>
      <PageTitle
        eyebrow="APPLICATION TOOLS"
        title="Resume analysis"
        description="Review your resume, identify gaps, and improve your next application."
        action={
          <Button asChild variant="secondary">
            <Link to="/app/builder">
              <PenLine size={16} />
              Build a resume
            </Link>
          </Button>
        }
      />
      <div className="two-column">
        <div className="stack">
          <Card>
            <SectionTitle
              title="Your resumes"
              subtitle="Upload a document to review or select a saved resume."
            />
            <button
              className="upload-zone"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files[0]);
              }}
              disabled={!!busy}
            >
              <span className="upload-icon">
                <Upload size={27} />
              </span>
              <strong>Drop your resume here</strong>
              <span>
                or <b>browse files</b>
              </span>
              <small>PDF or DOCX · Up to 5 MB · Text-based documents</small>
            </button>
            <input
              ref={input}
              className="sr-only"
              type="file"
              accept=".pdf,.docx"
              aria-label="Upload resume"
              disabled={!!busy}
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <div className="file-list">
              {list.data?.map((r) => (
                <button
                  key={r.id}
                  disabled={!!busy}
                  className={id === r.id ? 'selected' : ''}
                  onClick={() => {
                    setSelected(r.id);
                    setSuggestions({});
                    setError(null);
                  }}
                >
                  <FileText size={19} />
                  <span>{r.name}</span>
                  {id === r.id && <Check size={16} />}
                </button>
              ))}
            </div>
            {list.isLoading && <Loading text="Loading your resumes…" />}
            {list.error && <ErrorState error={list.error} retry={() => list.refetch()} />}
          </Card>
          <Card className="help-card">
            <ShieldNote />
            <p>
              We improve your wording using the facts you provide. Always review AI suggestions
              before adding them to your resume.
            </p>
            <Link to="/app/jobs" className="text-link">
              Have a job in mind? Check your match
              <ArrowRight size={15} />
            </Link>
          </Card>
        </div>
        <div className="stack">
          {!!error && <ErrorState error={error} />}
          {busy && <Loading text={busy} />}
          {resume.isLoading && <Loading />}
          {resume.error && <ErrorState error={resume.error} />}
          {resume.data && (
            <Card>
              <div className="section-title">
                <div>
                  <h2>{resume.data.name}</h2>
                  <p>Ready for your next opportunity.</p>
                </div>
                <Button onClick={analyze} disabled={!!busy}>
                  <Sparkles size={15} />
                  {analysis ? 'Analyze again' : 'Analyze resume'}
                </Button>
              </div>
              {analysis ? (
                <>
                  <AILabel demo={analysis.demo} />
                  <div className="analysis-summary">
                    <ScoreRing value={analysis.score} />
                    <div>
                      <h3>Estimated ATS compatibility score</h3>
                      <p>{analysis.summary}</p>
                      <small className="muted">
                        An estimate for improvement, not a prediction of a company’s ATS result.
                      </small>
                    </div>
                  </div>
                  <div className="analysis-breakdown">
                    {analysis.breakdown.map((b) => (
                      <div key={b.label}>
                        <div>
                          <span>{b.label}</span>
                          <strong>{b.score}%</strong>
                        </div>
                        <Progress value={b.score} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  title="Ready when you are."
                  description="Analyze this resume to get personalized, actionable feedback."
                />
              )}
              <details className="extracted-text">
                <summary>View extracted resume text</summary>
                <pre>{resume.data.content}</pre>
              </details>
              <div className="button-row">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    download('/resumes/' + id + '/export?format=pdf', 'resume.pdf').catch((e) =>
                      toast.error(e.message),
                    )
                  }
                >
                  <Download size={14} />
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    download('/resumes/' + id + '/export?format=docx', 'resume.docx').catch((e) =>
                      toast.error(e.message),
                    )
                  }
                >
                  <Download size={14} />
                  DOCX
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to={'/app/builder?resume=' + id}>
                    Edit in builder
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            </Card>
          )}
          {!id && !list.isLoading && !list.error && (
            <Card>
              <Empty
                title="Your next opportunity starts here."
                description="Upload a resume, or build your first one for free."
                action={
                  <Button asChild>
                    <Link to="/app/builder">
                      Create my resume
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                }
              />
            </Card>
          )}
          {analysis && (
            <Card>
              <SectionTitle
                title="Small changes. A stronger story."
                subtitle="Review each suggestion before using it."
              />
              {analysis.issues.map((issue, i) => (
                <div className="resume-issue" key={i}>
                  <div className="issue-heading">
                    <span className={'pill ' + (issue.severity === 'high' ? 'orange' : 'purple')}>
                      {issue.severity} priority
                    </span>
                    <h3>{issue.title}</h3>
                  </div>
                  {issue.original && <blockquote>{issue.original}</blockquote>}
                  <p>{suggestions[i] || issue.suggestion}</p>
                  <div className="button-row">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!busy || !issue.original}
                      onClick={() => fix(i, issue.original)}
                    >
                      <Sparkles size={14} />
                      Fix with AI
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(suggestions[i] || issue.suggestion)
                          .then(() => toast.success('Suggestion copied.'))
                          .catch(() =>
                            toast.error('Clipboard unavailable. Select and copy the suggestion.'),
                          )
                      }
                    >
                      Copy suggestion
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
function ShieldNote() {
  return (
    <h3>
      <Check size={17} />
      Your experience stays yours.
    </h3>
  );
}
