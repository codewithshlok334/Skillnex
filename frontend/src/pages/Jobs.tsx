import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ScanLine, Sparkles, Check, Plus, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import type { Data } from '../types';
import {
  PageTitle,
  Card,
  Empty,
  Loading,
  ErrorState,
  ScoreRing,
  AILabel,
  SectionTitle,
} from '../components/Common';
import { Button } from '../components/ui/button';
export function Jobs() {
  const resumes = useQuery({ queryKey: ['resumes'], queryFn: () => api<Data[]>('/resumes') });
  const [resume, setResume] = useState(''),
    [jd, setJd] = useState(''),
    [result, setResult] = useState<Data | null>(null),
    [tailored, setTailored] = useState<Data | null>(null),
    [busy, setBusy] = useState(''),
    [error, setError] = useState<unknown>(null);
  const client = useQueryClient();
  const operation = useRef(false);
  async function run(tailor = false) {
    if (operation.current || !(resume || resumes.data?.[0]?.id)) return;
    if (jd.trim().length < 30) {
      setError(new Error('Add at least 30 characters describing the role and required skills.'));
      return;
    }
    operation.current = true;
    if (!tailor) {
      setResult(null);
      setTailored(null);
    }
    setBusy(
      tailor
        ? 'Tailoring your story using only your experience…'
        : 'Comparing your experience with this opportunity…',
    );
    setError(null);
    try {
      const out = await post(tailor ? '/resumes/tailor' : '/jobs/match', {
        resumeId: resume || resumes.data?.[0]?.id,
        jobDescription: jd,
      });
      tailor ? setTailored(out) : setResult(out);
    } catch (e) {
      setError(e);
    } finally {
      operation.current = false;
      setBusy('');
    }
  }
  async function save() {
    if (operation.current || !tailored?.tailored?.content) return;
    operation.current = true;
    setBusy('Saving your reviewed resume…');
    try {
      await post('/resumes/build', {
        name: 'Tailored resume',
        content: tailored?.tailored.content,
        document: null,
      });
      client.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Saved to your resume library.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      operation.current = false;
      setBusy('');
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="FIND YOUR FIT"
        title="Your experience. Their opportunity."
        description="See where you align, what to work on, and how to tell a more relevant story."
      />
      <div className="two-column">
        <Card>
          <SectionTitle
            title="Let’s connect the dots"
            subtitle="Start with your resume and a role that interests you."
          />
          {resumes.data?.length ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                run();
              }}
            >
              <label>
                Your resume
                <select
                  disabled={!!busy}
                  value={resume || resumes.data[0].id}
                  onChange={(e) => {
                    setResume(e.target.value);
                    setResult(null);
                    setTailored(null);
                  }}
                >
                  {resumes.data.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Job description
                <textarea
                  disabled={!!busy}
                  rows={14}
                  placeholder="Paste the role, responsibilities, and required skills here…"
                  required
                  minLength={30}
                  maxLength={20000}
                  value={jd}
                  onChange={(e) => {
                    setJd(e.target.value);
                    setResult(null);
                    setTailored(null);
                  }}
                />
              </label>
              <Button type="submit" disabled={!!busy}>
                <ScanLine size={16} />
                Check my match
                <ArrowRight size={15} />
              </Button>
              <small className="muted">
                A match score is guidance. It cannot guarantee interview selection.
              </small>
            </form>
          ) : resumes.isLoading ? (
            <Loading />
          ) : resumes.error ? (
            <ErrorState error={resumes.error} retry={() => resumes.refetch()} />
          ) : (
            <Empty
              title="Bring your resume first."
              description="Upload a resume or create one, then compare it with any job."
              action={
                <Button asChild>
                  <Link to="/app/resumes">Upload resume</Link>
                </Button>
              }
            />
          )}
        </Card>
        <div className="stack">
          {!!error && <ErrorState error={error} />}
          {busy && <Loading text={busy} />}
          {result ? (
            <>
              <Card>
                <AILabel />
                <div className="analysis-summary">
                  <ScoreRing value={result.score} />
                  <div>
                    <h2>Your estimated match</h2>
                    <p>
                      Use this comparison to prioritize your preparation and highlight relevant
                      experience.
                    </p>
                  </div>
                </div>
                <div className="match-columns">
                  <div>
                    <h3>Already in your toolkit</h3>
                    {result.matchingSkills.map((s: string) => (
                      <p className="skill-match" key={s}>
                        <Check size={15} />
                        {s}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3>Room to grow</h3>
                    {result.missingSkills.map((s: string) => (
                      <p className="skill-gap" key={s}>
                        <Plus size={15} />
                        {s}
                      </p>
                    ))}
                  </div>
                </div>
                <h3>Important keywords</h3>
                <div className="tag-list">
                  {result.keywords.map((s: string) => (
                    <span className="pill" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionTitle title="Make your next move count" />
                <h3>Project ideas</h3>
                <ul className="advice-list">
                  {result.projects.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <h3>Preparation topics</h3>
                <ul className="advice-list">
                  {result.topics.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <Button disabled={!!busy} onClick={() => run(true)}>
                  <Sparkles size={16} />
                  Tailor resume for this job
                </Button>
                <p className="small muted">
                  Only supported experience and skills will be used. Review all changes.
                </p>
              </Card>
            </>
          ) : (
            !busy && (
              <Card className="job-empty">
                <Empty
                  title="The right story for the right role."
                  description="Your match breakdown, missing skills, and preparation ideas will appear here."
                />
                <div className="match-example">
                  <span className="pill green">
                    <Check size={13} />
                    Your strengths
                  </span>
                  <span className="pill purple">
                    <Sparkles size={13} />
                    Your next steps
                  </span>
                </div>
              </Card>
            )
          )}
        </div>
      </div>
      {tailored && (
        <Card className="tailor-results">
          <SectionTitle
            title="Your story, focused"
            subtitle="Compare the original with the AI suggestion before saving."
          />
          <AILabel />
          <div className="comparison-grid">
            <div>
              <h3>Original resume</h3>
              <pre>{tailored.original}</pre>
            </div>
            <div>
              <h3>Tailored suggestion</h3>
              <pre>{tailored.tailored.content}</pre>
            </div>
          </div>
          <h3>What changed & why</h3>
          {tailored.tailored.changes.map((c: Data, i: number) => (
            <div className="change-row" key={i}>
              <del>{c.original}</del>
              <ins>{c.replacement}</ins>
              <small>{c.reason}</small>
            </div>
          ))}
          <Button onClick={save} disabled={!!busy}>
            <Save size={15} />
            Save reviewed version
          </Button>
        </Card>
      )}
    </>
  );
}
