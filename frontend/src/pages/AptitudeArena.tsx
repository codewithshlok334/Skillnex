import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BookOpen, Brain, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, Flag, LoaderCircle, Search, Star, Target, TrendingUp, X, XCircle } from 'lucide-react';
import { api, post, put, ApiError } from '../api/client';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { ErrorState, Loading } from '../components/Common';
import { useSession } from '../hooks/useSession';
import { AchievementSticker, celebrateAchievements } from '../components/Achievements';
import { mockTotals, remainingSeconds, timerLabel } from '../utils/aptitude';
import type { AptitudeQuestion as Question, AptitudeFeedback as Feedback, AptitudeMock as Mock, AptitudeSource as Source, AptitudeProgress as Progress } from '../utils/aptitude';
import '../aptitude.css';

type Catalog = { questions: Question[]; total: number; page: number; pageSize: number; bankTotal: number; solved: number; topics: { category: string; topic: string }[]; categories: { category: string; total: number }[] };
const categories = ['Quantitative', 'Reasoning', 'Verbal'];
const categoryNames: Record<string, string> = { Quantitative: 'Quantitative aptitude', Reasoning: 'Logical reasoning', Verbal: 'Verbal ability' };
const letters = 'ABCD';
function Difficulty({ value }: { value: string }) { return <span className={'aa-difficulty aa-' + value.toLowerCase()}>{value}</span>; }
function SolvedStar() { return <Star size={16} className="aa-star" fill="currentColor" aria-label="Solved correctly" role="img" />; }
function SourceNote({ source }: { source?: Source }) {
  if (!source) return null;
  return <div className="aa-source"><BookOpen size={15} /><div><span>{source.label}</span>{source.kind === 'GATE_PYQ' && <small>Paraphrased from the official paper. Option order may differ.</small>}
    {source.url && <a href={source.url} target="_blank" rel="noreferrer">Official question paper <ExternalLink size={12} /></a>}
    {source.answerKeyUrl && <a href={source.answerKeyUrl} target="_blank" rel="noreferrer">Final answer key <ExternalLink size={12} /></a>}</div></div>;
}
function AnswerOptions({ question, selected, onSelect, disabled, feedback }: { question: Question; selected: number | null; onSelect?: (index: number) => void; disabled?: boolean; feedback?: Feedback }) {
  return <fieldset className="aa-options"><legend className="sr-only">Choose one answer</legend>{question.options.map((option, index) => {
    const right = feedback?.correctIndex === index, wrong = !!feedback && selected === index && !right;
    return <label key={index} className={'aa-option' + (selected === index ? ' selected' : '') + (right ? ' correct' : '') + (wrong ? ' incorrect' : '')}>
      <input type="radio" name={'answer-' + question.id} checked={selected === index} disabled={disabled || !!feedback} onChange={() => onSelect?.(index)} />
      <span className="aa-option-letter">{letters[index]}</span><span className="aa-option-text">{option}</span>
      {right ? <CheckCircle2 size={20} aria-label="Correct option" /> : wrong ? <XCircle size={20} aria-label="Your incorrect choice" /> : null}
    </label>;
  })}</fieldset>;
}
function Solution({ question, feedback }: { question: Question; feedback: Feedback }) {
  return <section className={'aa-solution ' + (feedback.correct ? 'is-correct' : 'is-wrong')} aria-live="polite">
    <strong>{feedback.correct ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}{feedback.correct ? 'Correct — nicely done.' : feedback.selectedIndex === null ? 'You left this question unanswered.' : 'Not quite. Here’s the solution.'}</strong>
    <p className="aa-answer-line">Correct answer: <b>{letters[feedback.correctIndex]}. {question.options[feedback.correctIndex]}</b></p>
    <h3>How to solve it</h3><p className="aa-explanation">{feedback.explanation}</p><SourceNote source={feedback.source} />
  </section>;
}
function StartMock({ open, onClose, activeId }: { open: boolean; onClose: () => void; activeId?: string }) {
  const navigate = useNavigate(), cache = useQueryClient();
  const { user } = useSession();
  const [category, setCategory] = useState(''), [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(20), [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const request = useRef({ key: crypto.randomUUID(), signature: '' });
  async function start(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(undefined);
    const signature = JSON.stringify({ category, difficulty, count, minutes });
    if (request.current.signature !== signature) request.current = { key: crypto.randomUUID(), signature };
    try {
      const mock = await post<Mock>('/aptitude/mocks', { category, difficulty, count, minutes, requestKey: request.current.key });
      cache.setQueryData(['aptitude-mock', user.id, mock.id], mock);
      request.current = { key: crypto.randomUUID(), signature: '' };
      void cache.invalidateQueries({ queryKey: ['aptitude-progress', user.id] });
      onClose(); navigate('/app/aptitude/mock/' + mock.id);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!value && !busy) onClose(); }} title="Build your mock test" description="Choose your questions and set one timer for the whole test.">
    <form className="aa-mock-form" onSubmit={start}>
      {activeId ? <div className="aa-notice"><p>Your previous mock is still running. Its timer continues while you’re away.</p><Link className="btn btn-primary" to={'/app/aptitude/mock/' + activeId} onClick={onClose}>Resume mock <ArrowRight size={16} /></Link></div> : <>
        <label>Subject<select value={category} onChange={e => setCategory(e.target.value)}>{['', ...categories].map(c => <option key={c} value={c}>{categoryNames[c] || 'Mixed — all three subjects'}</option>)}</select></label>
        <label>Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['', 'Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d}>{d || 'Mixed difficulty'}</option>)}</select></label>
        <div className="aa-form-pair"><label>Number of questions<input type="number" min={1} max={100} step={1} required value={count} onChange={e => setCount(Number(e.target.value))} /></label><label>Total time (minutes)<input type="number" min={1} max={180} step={1} required value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label></div>
        <ul className="aa-rules"><li>Single-correct MCQs. +1 correct, 0 wrong or skipped.</li><li>One timer for the entire test; no per-question timer.</li><li>Answers save as you choose. Refreshing does not reset the clock.</li><li>Solutions unlock after submission or time runs out.</li></ul>
        <p className="aa-muted">Choose 20 or more questions to unlock score-based achievement stickers.</p>
        {error ? <ErrorState error={error} /> : null}<Button type="submit" disabled={busy} className="aa-start">{busy ? <LoaderCircle size={17} className="spin" /> : <Clock3 size={17} />}{busy ? 'Preparing your test…' : 'Start mock test'}</Button>
      </>}
    </form>
  </Dialog>;
}

export function AptitudeArena() {
  const { user } = useSession(); const [params, setParams] = useSearchParams();
  const [mockOpen, setMockOpen] = useState(false), [searchDraft, setSearchDraft] = useState(params.get('search') || '');
  const page = Math.min(1000, Math.max(0, Math.floor(Number(params.get('page')) || 0)));
  const search = params.get('search') || '', category = params.get('category') || '', topic = params.get('topic') || '', difficulty = params.get('difficulty') || '', progress = params.get('progress') || '', source = params.get('source') || '';
  const view = params.get('view') === 'progress' ? 'progress' : 'practice';
  const query = new URLSearchParams({ search, category, topic, difficulty, progress, source, page: String(page) });
  const bank = useQuery({ queryKey: ['aptitude-bank', user.id, query.toString()], queryFn: () => api<Catalog>('/aptitude/questions?' + query), refetchOnMount: 'always' });
  const stats = useQuery({ queryKey: ['aptitude-progress', user.id], queryFn: () => api<Progress>('/aptitude/progress'), refetchOnMount: 'always' });
  const active = stats.data?.mocks.find(m => m.status === 'ACTIVE');
  function filter(key: string, value: string) { setParams(current => { const next = new URLSearchParams(current); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.delete('page'); if (key === 'category') next.delete('topic'); return next; }); }
  useEffect(() => setSearchDraft(search), [search]);
  useEffect(() => { if (searchDraft.trim() === search) return; const timer = window.setTimeout(() => filter('search', searchDraft.trim()), 250); return () => window.clearTimeout(timer); }, [searchDraft, search]);
  const rows = bank.data?.questions || [];
  return <div className="aptitude-arena">
    <header className="aa-header"><div><span className="aa-eyebrow"><Brain size={17} /> A LITTLE PRACTICE, EVERY DAY</span><h1>Aptitude Arena</h1><p>Think it through. Choose your answer. Learn the why.</p></div><Button onClick={() => setMockOpen(true)}><Clock3 size={17} />Start mock test</Button></header>
    <div className="aa-summary"><div><BookOpen size={19} /><span><b>{bank.data?.bankTotal ?? '—'}</b> MCQ questions</span></div><div><Star size={19} /><span><b>{bank.data?.solved ?? '—'}</b> solved correctly</span></div><div><Target size={19} /><span><b>{stats.data ? stats.data.accuracy + '%' : '—'}</b> answer accuracy</span></div><div><Brain size={19} /><span>Quant · Reasoning · Verbal</span></div></div>
    <div className="aa-view-tabs" role="group" aria-label="Aptitude sections"><button aria-pressed={view === 'practice'} onClick={() => filter('view', '')}><BookOpen size={16} />Practice questions</button><button aria-pressed={view === 'progress'} onClick={() => filter('view', 'progress')}><TrendingUp size={16} />Your progress</button><span>Practice at your own pace. No timer.</span></div>
    {active && <div className="aa-active"><Clock3 size={18} /><div><b>You have an active mock</b><span>Resume your saved answers. The test timer is still running.</span></div><Link to={'/app/aptitude/mock/' + active.id}>Resume <ArrowRight size={16} /></Link></div>}
    {view === 'progress' ? stats.isLoading ? <Loading text="Opening your practice record…" /> : stats.error ? <ErrorState error={stats.error} retry={() => stats.refetch()} /> : stats.data ? <ProgressView progress={stats.data} onTopic={t => { const next = new URLSearchParams({ topic: t }); setParams(next); }} /> : null : <>
      <div className="aa-subjects" role="group" aria-label="Choose a subject">{['', ...categories].map(c => <button key={c} aria-pressed={category === c} onClick={() => filter('category', c)}>{categoryNames[c] || 'All questions'}<span>{c ? bank.data?.categories.find(x => x.category === c)?.total ?? '—' : bank.data?.bankTotal ?? '—'}</span></button>)}</div>
      <div className="aa-filters"><div className="aa-search"><Search size={17} /><input aria-label="Search aptitude questions" placeholder="Search a topic or question…" maxLength={120} value={searchDraft} onChange={e => setSearchDraft(e.target.value)} /></div>
        <select aria-label="Filter topic" value={topic} onChange={e => filter('topic', e.target.value)}><option value="">All topics</option>{bank.data?.topics.filter(t => !category || t.category === category).map(t => <option key={t.category + t.topic} value={t.topic}>{t.topic}</option>)}</select>
        <select aria-label="Filter difficulty" value={difficulty} onChange={e => filter('difficulty', e.target.value)}><option value="">All levels</option>{['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}</select>
        <select aria-label="Filter solved questions" value={progress} onChange={e => filter('progress', e.target.value)}><option value="">All progress</option><option value="solved">Starred — solved</option><option value="todo">Not solved yet</option></select>
        <select aria-label="Filter question source" value={source} onChange={e => filter('source', e.target.value)}><option value="">All sources</option><option value="ORIGINAL">Original practice</option><option value="GATE_PYQ">Verified GATE PYQs</option></select>
      </div>
      {(search || topic || difficulty || progress || source || category) && <div className="aa-filter-note"><span>{bank.data?.total ?? '…'} matching questions</span><button onClick={() => { setSearchDraft(''); setParams({}); }}><X size={13} />Clear filters</button></div>}
      {bank.isLoading ? <Loading text="Opening the question bank…" /> : bank.error ? <ErrorState error={bank.error} retry={() => bank.refetch()} /> : <div className="aa-bank"><div className="aa-bank-heading"><span>QUESTION</span><span>SUBJECT</span><span>LEVEL</span><span /></div>
        {rows.map(question => <Link className="aa-question-row" key={question.id} to={`/app/aptitude/practice/${question.id}?${query}`}><div className="aa-question-name"><span className="aa-number">{String(question.id).padStart(3, '0')}</span><div><strong>{question.title}</strong><small>{question.topic}{question.source?.kind === 'GATE_PYQ' ? ' · Official GATE reference' : ''}</small></div>{question.solved && <SolvedStar />}</div><span className="aa-category">{question.category}</span><Difficulty value={question.difficulty} /><ChevronRight size={17} /></Link>)}
        {!rows.length && <div className="aa-empty"><Search size={27} /><h3>No matching questions</h3><p>Try a wider topic or clear a filter.</p></div>}
      </div>}
      <div className="aa-pagination"><span>{bank.data?.total ?? 0} questions · ⭐ means solved correctly</span><div><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => filter('page', String(page - 1))}><ChevronLeft size={15} />Previous</Button><span>Page {page + 1} of {Math.max(1, Math.ceil((bank.data?.total ?? 0) / 20))}</span><Button size="sm" variant="secondary" disabled={(page + 1) * 20 >= (bank.data?.total ?? 0)} onClick={() => filter('page', String(page + 1))}>Next<ChevronRight size={15} /></Button></div></div>
      <details className="aa-provenance"><summary>About this question bank</summary><p>480 original placement/GATE-pattern exercises and 20 paraphrased GATE questions with official paper and final-key references. 195 quantitative, 162 reasoning and 143 verbal questions. Hard is SkillNex’s difficulty rating.</p><p>Company interview topics vary by role. Original exercises are preparation material, not claims that Microsoft, Meta or another company asked that exact question.</p><a target="_blank" rel="noreferrer" href="https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing.html">Microsoft’s official technical interview guide <ExternalLink size={12} /></a><a target="_blank" rel="noreferrer" href="https://www.amazon.jobs/content/en-gb/how-we-hire/interview-prep/software-development-topics">Amazon’s official preparation topics <ExternalLink size={12} /></a></details>
    </>}
    <StartMock open={mockOpen} onClose={() => setMockOpen(false)} activeId={active?.id} />
  </div>;
}

export function AptitudePractice() {
  const { user } = useSession(), { id } = useParams(); const [params] = useSearchParams();
  const cache = useQueryClient(); const questionId = Number(id);
  const question = useQuery({ queryKey: ['aptitude-question', user.id, questionId], queryFn: () => api<Question>('/aptitude/questions/' + questionId), enabled: Number.isInteger(questionId) && questionId > 0 });
  const [selected, setSelected] = useState<number | null>(null), [feedback, setFeedback] = useState<Feedback>();
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  const requestKey = useRef(crypto.randomUUID()), currentId = useRef(questionId); currentId.current = questionId;
  useEffect(() => { setSelected(null); setFeedback(undefined); setError(undefined); requestKey.current = crypto.randomUUID(); }, [questionId]);
  async function check() {
    if (selected === null || busy || feedback) return; setBusy(true); setError(undefined);
    const checkingId = questionId;
    try {
      const result = await post<Feedback>(`/aptitude/questions/${questionId}/answers`, { answerIndex: selected, requestKey: requestKey.current });
      if (checkingId === currentId.current) setFeedback(result);
      cache.setQueryData<Question>(['aptitude-question', user.id, checkingId], old => old ? { ...old, solved: !!result.solved } : old);
      void cache.invalidateQueries({ queryKey: ['aptitude-bank', user.id] }); void cache.invalidateQueries({ queryKey: ['aptitude-progress', user.id] });
    } catch (e) { if (checkingId === currentId.current) setError(e); } finally { setBusy(false); }
  }
  const url = params.toString(); const back = '/app/aptitude' + (url ? '?' + url : '');
  const data = question.data;
  return <div className="aptitude-arena aa-practice"><header className="aa-session-heading"><Link to={back}><ArrowLeft size={16} />Question bank</Link><span><Brain size={17} />APTITUDE ARENA</span><small>Practice · no timer</small></header>
    {question.isLoading ? <Loading text="Opening your question…" /> : question.error || !data ? <ErrorState error={question.error || new Error('Question not found.')} retry={() => question.refetch()} /> : <>
      <article className="aa-question-card"><div className="aa-card-top"><span className="aa-number">{String(data.id).padStart(3, '0')}</span><div><span>{data.category} / {data.topic}</span><div className="aa-question-meta"><span>MCQ · single correct answer</span><Difficulty value={data.difficulty} /></div></div>{(data.solved || feedback?.correct) && <SolvedStar />}</div>
        <div className="aa-question-body">{data.passage && <blockquote className="aa-passage">{data.passage}</blockquote>}<h1 className="aa-prompt">{data.prompt}</h1>
          <AnswerOptions question={data} selected={selected} onSelect={i => { setSelected(i); requestKey.current = crypto.randomUUID(); setError(undefined); }} disabled={busy} feedback={feedback} />
          {error ? <ErrorState error={error} /> : null}<div className="aa-check-bar"><Button disabled={selected === null || busy || !!feedback} onClick={check}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{busy ? 'Checking…' : feedback ? 'Answer checked' : 'Check my answer'}</Button>{!feedback && <span>Choose one option, then check your answer.</span>}{feedback && <button className="aa-text-button" onClick={() => { setFeedback(undefined); setSelected(null); requestKey.current = crypto.randomUUID(); }}>Try again</button>}</div>
          {feedback && <Solution question={data} feedback={feedback} />}{!feedback && <SourceNote source={data.source} />}
        </div>
      </article>
      <nav className="aa-question-nav" aria-label="Practice question navigation">{questionId > 1 ? <Link className="btn btn-secondary" to={`/app/aptitude/practice/${questionId - 1}?${url}`}><ChevronLeft size={17} />Previous</Link> : <span />}<span>Question {questionId} of 500</span>{questionId < 500 ? <Link className="btn btn-primary" to={`/app/aptitude/practice/${questionId + 1}?${url}`}>Next<ChevronRight size={17} /></Link> : <Link className="btn btn-primary" to={back}>Back to questions</Link>}</nav>
    </>}
  </div>;
}

function ProgressView({ progress, onTopic }: { progress: Progress; onTopic: (topic: string) => void }) {
  const completed = progress.mocks.filter(m => m.status === 'COMPLETED').slice(0, 10).reverse();
  const points = completed.map((m, i) => `${30 + i * 440 / Math.max(1, completed.length - 1)},${145 - (m.score ?? 0) * 120 / m.total}`).join(' ');
  const maxDaily = Math.max(1, ...progress.daily.map(d => d.attempted));
  return <section className="aa-progress-view"><div className="aa-progress-grid"><article className="aa-panel"><header><div><h2>Your mock test trend</h2><p>Score percentage across your last 10 completed mocks.</p></div><TrendingUp size={20} /></header>
    {completed.length ? <><svg className="aa-trend" viewBox="0 0 500 180" role="img" aria-label={'Mock scores: ' + completed.map(m => Math.round((m.score ?? 0) * 100 / m.total) + '%').join(', ')}><path d="M30 25H470M30 85H470M30 145H470" className="aa-gridline" /><text x="0" y="29">100</text><text x="7" y="89">50</text><text x="13" y="149">0</text><polyline points={points} />{completed.map((m, i) => <circle key={m.id} cx={30 + i * 440 / Math.max(1, completed.length - 1)} cy={145 - (m.score ?? 0) * 120 / m.total} r="4"><title>{m.score}/{m.total}</title></circle>)}</svg><div className="aa-trend-labels"><span>Earlier mocks</span><span>Most recent</span></div></> : <div className="aa-empty"><TrendingUp size={28} /><p>Complete your first mock to start your trend.</p></div>}</article>
    <article className="aa-panel"><header><div><h2>Where to focus next</h2><p>Topics below 70% accuracy after at least 3 answers.</p></div><Target size={20} /></header>{progress.weakTopics.length ? progress.weakTopics.slice(0, 6).map(t => <button className="aa-weak-topic" key={t.category + t.topic} onClick={() => onTopic(t.topic)}><span><b>{t.topic}</b><small>{t.correct}/{t.attempted} correct</small></span><strong>{t.accuracy}%</strong><ArrowRight size={16} /></button>) : <p className="aa-muted">{progress.attempted ? 'No weak topic identified yet. Keep practising across different topics.' : 'Your topic insights will appear as you answer questions.'}</p>}</article></div>
    <article className="aa-panel"><header><div><h2>30-day practice activity</h2><p>Answered questions per day · UTC. Repeat attempts count; unanswered mock questions do not.</p></div></header><div className="aa-activity" role="img" aria-label="Daily aptitude answer activity">{progress.daily.map(d => <div key={d.date} title={`${d.date}: ${d.attempted} answered, ${d.correct} correct`}><span style={{ height: `${Math.max(4, d.attempted * 100 / maxDaily)}%` }} className={d.attempted ? 'active' : ''} /><small>{d.date.slice(8)}</small></div>)}</div></article>
    <article className="aa-panel"><header><div><h2>Subject & topic accuracy</h2><p>{progress.correct} correct out of {progress.attempted} answered attempts.</p></div></header><div className="aa-topic-progress">{progress.topics.filter(t => t.attempted > 0).map(t => <button key={t.category + t.topic} onClick={() => onTopic(t.topic)}><span>{t.topic}<small>{t.category} · {t.attempted} attempts</small></span><progress value={t.accuracy ?? 0} max={100} aria-label={t.topic + ' accuracy'} /><b>{t.accuracy}%</b></button>)}{!progress.attempted && <p className="aa-muted">Choose any practice question to get started.</p>}</div></article>
    <article className="aa-panel"><header><div><h2>Recent mock tests</h2><p>Open a completed test to review every answer.</p></div></header>{progress.mocks.length ? <div className="aa-mock-history">{progress.mocks.map(m => <Link key={m.id} to={'/app/aptitude/mock/' + m.id}><span><b>{m.category || 'Mixed subjects'} · {m.total} questions</b><small>{new Date(m.created_ms).toLocaleString()} · {m.difficulty || 'Mixed difficulty'}</small></span><strong>{m.status === 'ACTIVE' ? 'Resume' : `${m.score}/${m.total}`}</strong><ArrowRight size={16} /></Link>)}</div> : <p className="aa-muted">No mock tests yet.</p>}</article>
  </section>;
}

export function AptitudeMock() {
  const { user } = useSession(), { id } = useParams();
  const cache = useQueryClient(); const key = ['aptitude-mock', user.id, id];
  const query = useQuery({ queryKey: key, queryFn: () => api<Mock>('/aptitude/mocks/' + id), refetchOnWindowFocus: true, staleTime: 0 });
  const [position, setPosition] = useState(0), [now, setNow] = useState(Date.now()), [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(), [unsaved, setUnsaved] = useState<{ questionId: number; answerIndex: number | null; marked: boolean }>();
  const pending = useRef(false), automaticSubmit = useRef(false);
  const timing = useRef({ server: 0, received: 0 });
  const data = query.data;
  useEffect(() => {
    if (data?.status !== 'COMPLETED') return;
    celebrateAchievements(user.id, data.awards || []);
    void cache.invalidateQueries({ queryKey: ['me'] });
    void cache.invalidateQueries({ queryKey: ['notifications'] });
    void cache.invalidateQueries({ queryKey: ['aptitude-bank', user.id] });
    void cache.invalidateQueries({ queryKey: ['aptitude-progress', user.id] });
  }, [data?.id, data?.status, cache, user.id]);
  useEffect(() => { if (data) { timing.current = { server: data.serverNow, received: Date.now() }; setNow(Date.now()); } }, [data]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setPosition(0); automaticSubmit.current = false; setUnsaved(undefined); setError(undefined); }, [id]);
  const seconds = data && timing.current.received ? remainingSeconds(data.expiresAt, timing.current.server, timing.current.received, now) : 1;
  function update(value: Mock) { cache.setQueryData(key, value); if (value.status === 'COMPLETED') { void cache.invalidateQueries({ queryKey: ['aptitude-bank', user.id] }); void cache.invalidateQueries({ queryKey: ['aptitude-progress', user.id] }); void cache.invalidateQueries({ queryKey: ['aptitude-question', user.id] }); } }
  async function submit() {
    if (pending.current || !data || data.status !== 'ACTIVE') return;
    pending.current = true; setBusy(true); setError(undefined);
    try { update(await post<Mock>('/aptitude/mocks/' + id + '/submit')); setConfirm(false); setUnsaved(undefined); }
    catch (e) { setError(e); } finally { pending.current = false; setBusy(false); }
  }
  useEffect(() => { if (data?.status === 'ACTIVE' && seconds <= 0 && !busy && !automaticSubmit.current) { automaticSubmit.current = true; void submit(); } }, [data?.status, seconds, busy]);
  useEffect(() => {
    if (data?.status !== 'ACTIVE') return;
    const leave = (e: BeforeUnloadEvent) => { if (pending.current || unsaved) e.preventDefault(); };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [data?.status, unsaved]);
  async function save(questionId: number, answerIndex: number | null, marked: boolean) {
    if (pending.current || !data || data.status !== 'ACTIVE' || seconds <= 0) return;
    pending.current = true; setBusy(true); setError(undefined);
    const input = { questionId, answerIndex, marked }; setUnsaved(input);
    try { update(await put<Mock>('/aptitude/mocks/' + id + '/answers', { ...input, revision: data.revision })); setUnsaved(undefined); }
    catch (e) { setError(e); if (e instanceof ApiError && e.status === 409) { await query.refetch(); } }
    finally { pending.current = false; setBusy(false); }
  }
  if (query.isLoading) return <Loading text="Opening your mock test…" />;
  if (query.error || !data) return <ErrorState error={query.error || new Error('Mock not found.')} retry={() => query.refetch()} />;
  if (data.status === 'COMPLETED') return <MockReport mock={data} />;
  const q = data.questions[Math.min(position, data.questions.length - 1)];
  const selected = unsaved?.questionId === q.id ? unsaved.answerIndex : data.answers[q.id] ?? null;
  const marked = unsaved?.questionId === q.id ? unsaved.marked : data.marked.includes(q.id);
  const totalAnswered = Object.keys(data.answers).length;
  return <div className="aptitude-arena aa-mock"><header className="aa-session-heading"><Link to="/app/aptitude"><ArrowLeft size={16} />Arena</Link><span><Brain size={17} />MOCK TEST</span><div className={'aa-timer' + (seconds < 60 ? ' urgent' : '')} aria-label={'Time remaining ' + timerLabel(seconds)}><Clock3 size={18} /><b>{timerLabel(seconds)}</b><small>total time left</small></div><Button disabled={busy} onClick={() => setConfirm(true)}>Submit test</Button></header>
    {error ? <div className="aa-save-error"><ErrorState error={error} />{unsaved && seconds > 0 && <Button variant="secondary" disabled={busy} onClick={() => save(unsaved.questionId, unsaved.answerIndex, unsaved.marked)}>Retry saving answer</Button>}{seconds <= 0 && <Button disabled={busy} onClick={() => void submit()}>Load final results</Button>}</div> : null}
    {seconds <= 0 && <div className="aa-notice" role="status">Time is up. Answers saved before the deadline are being scored.</div>}
    <div className="aa-mock-layout"><article className="aa-question-card"><div className="aa-card-top"><span className="aa-number">{position + 1}</span><div><span>{q.category} / {q.topic}</span><div className="aa-question-meta"><span>MCQ · single correct answer</span><span className="aa-mark">+1 correct</span><span>0 wrong / skipped</span></div></div><Difficulty value={q.difficulty} /></div><div className="aa-question-body">
      {q.passage && <blockquote className="aa-passage">{q.passage}</blockquote>}<h1 className="aa-prompt">{q.prompt}</h1><AnswerOptions question={q} selected={selected} onSelect={i => void save(q.id, i, marked)} disabled={busy || seconds <= 0} />
      <div className="aa-mock-actions"><button className={'aa-text-button' + (marked ? ' marked' : '')} disabled={busy || seconds <= 0} onClick={() => void save(q.id, selected, !marked)}><Flag size={16} />{marked ? 'Marked for review' : 'Mark for review'}</button><button className="aa-text-button" disabled={busy || seconds <= 0 || selected === null} onClick={() => void save(q.id, null, marked)}>Clear answer</button><span aria-live="polite">{busy ? 'Saving…' : unsaved ? 'Not saved — retry above' : 'Saved'}</span></div>
      <nav className="aa-question-nav"><Button variant="secondary" disabled={!position || busy || !!unsaved} onClick={() => setPosition(p => p - 1)}><ChevronLeft size={16} />Previous</Button><span>{position + 1} / {data.total}</span>{position < data.total - 1 ? <Button disabled={busy || !!unsaved} onClick={() => setPosition(p => p + 1)}>Next<ChevronRight size={16} /></Button> : <Button disabled={busy} onClick={() => setConfirm(true)}>Review & submit</Button>}</nav>
    </div></article><aside className="aa-test-sidebar"><h2>Your test</h2><p>{totalAnswered}/{data.total} answered · {data.marked.length} for review</p><div className="aa-palette">{data.questions.map((item, index) => <button key={item.id} aria-label={`Question ${index + 1}${data.answers[item.id] !== undefined ? ', answered' : ', unanswered'}${data.marked.includes(item.id) ? ', marked for review' : ''}`} aria-current={position === index ? 'step' : undefined} disabled={busy || !!unsaved} className={(data.answers[item.id] !== undefined ? 'answered ' : '') + (data.marked.includes(item.id) ? 'flagged' : '')} onClick={() => setPosition(index)}>{index + 1}{data.marked.includes(item.id) && <Flag size={8} />}</button>)}</div><div className="aa-palette-legend"><span><i className="answered" />Answered</span><span><i className="flagged" />For review</span><span><i />Unanswered</span></div><p className="aa-test-note">The timer covers the whole test and keeps running if you leave. Solutions appear only after the test ends.</p></aside></div>
    <Dialog open={confirm} onOpenChange={setConfirm} title="Submit your mock?" description={`${totalAnswered} answered · ${data.total - totalAnswered} unanswered · ${data.marked.length} marked for review.`}><p>{unsaved ? 'An answer has not saved. Close this dialog and retry saving before submitting.' : 'Your saved answers will be scored and every solution will be unlocked. You cannot change this test after submission.'}</p><div className="aa-dialog-actions"><Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Keep working</Button><Button disabled={busy || (!!unsaved && seconds > 0)} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit & see analysis'}</Button></div></Dialog>
  </div>;
}

function MockReport({ mock }: { mock: Mock }) {
  const totals = mockTotals(mock); const [onlyMistakes, setOnlyMistakes] = useState(false);
  const topics = new Map<string, { total: number; correct: number }>();
  for (const q of mock.questions) { const current = topics.get(q.topic) || { total: 0, correct: 0 }; current.total++; if (q.review?.correct) current.correct++; topics.set(q.topic, current); }
  return <div className="aptitude-arena aa-report"><header className="aa-session-heading"><Link to="/app/aptitude"><ArrowLeft size={16} />Back to Arena</Link><span>MOCK TEST REVIEW</span><Link to="/app/aptitude?view=progress">View progress<TrendingUp size={16} /></Link></header><section className="aa-report-hero"><div className="aa-score-ring" style={{ '--score': totals.percent + '%' } as React.CSSProperties}><div><b>{mock.score}/{mock.total}</b><span>{totals.percent}% score</span></div></div><div><span className="aa-eyebrow">TEST COMPLETE</span><h1>Your answers, explained.</h1><p>Review the steps, learn from the misses, and take another shot.</p><div className="aa-report-stats"><span><CheckCircle2 size={16} />{totals.correct} correct</span><span><XCircle size={16} />{totals.wrong} incorrect</span><span>{totals.skipped} unanswered</span></div><small>{mock.marking}</small></div></section>
    {!!mock.awards?.length && <section className="aa-earned-panel"><h2>🎉 Stickers unlocked in this test</h2><div>{mock.awards.map(b => <figure key={b.id}><AchievementSticker id={b.id} /><figcaption>{b.name}</figcaption></figure>)}</div><Link to="/app/profile#achievements">Saved to My Stickers →</Link></section>}
    <section className="aa-panel"><header><div><h2>Topic breakdown</h2><p>Based on this mock only. Unanswered questions count as zero.</p></div></header><div className="aa-report-topics">{[...topics.entries()].map(([topic, score]) => <div key={topic}><span>{topic}</span><progress max={score.total} value={score.correct} aria-label={topic + ' correct answers'} /><b>{score.correct}/{score.total}</b></div>)}</div></section>
    <div className="aa-review-heading"><h2>Question-by-question analysis</h2><label><input type="checkbox" checked={onlyMistakes} onChange={e => setOnlyMistakes(e.target.checked)} />Only mistakes & skipped</label></div>
    {mock.questions.map((q, index) => (!onlyMistakes || !q.review?.correct) && <details className="aa-review-item" key={q.id}><summary><span className={'aa-review-status ' + (q.review?.correct ? 'correct' : 'incorrect')}>{q.review?.correct ? <Check size={16} /> : q.review?.selectedIndex == null ? '—' : <X size={16} />}</span><span><b>{index + 1}. {q.title}</b><small>{q.topic} · {q.review?.correct ? 'Correct' : q.review?.selectedIndex == null ? 'Unanswered' : 'Incorrect'}</small></span><ChevronRight size={17} /></summary><div className="aa-question-body">{q.passage && <blockquote className="aa-passage">{q.passage}</blockquote>}<h3 className="aa-prompt">{q.prompt}</h3>{q.review && <><p className="aa-muted">Your answer: {q.review.selectedIndex == null ? 'Not answered' : `${letters[q.review.selectedIndex]}. ${q.options[q.review.selectedIndex]}`}</p><AnswerOptions question={q} selected={q.review.selectedIndex} disabled feedback={q.review} /><Solution question={q} feedback={q.review} /></>}</div></details>)}
    {onlyMistakes && totals.wrong + totals.skipped === 0 && <div className="aa-empty"><Star size={30} /><p>Perfect score. Every question is correct.</p></div>}
  </div>;
}
