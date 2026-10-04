import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CodeMirror, { EditorState, EditorView } from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Code2, BookOpen, Lightbulb, Play, Send, Save, Search, Terminal, Clock3, RotateCcw, LoaderCircle, X } from 'lucide-react';
import { api, post, put } from '../api/client';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { ErrorState, Loading } from '../components/Common';
import { useEditorPreferences, useWorkspaceTheme } from '../hooks/useWorkspacePreferences';
import '../codelab.css';
import '../codelab-workspace.css';

type Language = 'java' | 'cpp' | 'python';
const languages: { id: Language; name: string; file: string }[] = [
  { id: 'java', name: 'Java', file: 'Main.java' }, { id: 'cpp', name: 'C++', file: 'main.cpp' }, { id: 'python', name: 'Python', file: 'main.py' },
];
const extensions = { java: [java()], cpp: [cpp()], python: [python()] };
type Question = { id: number; slug: string; title: string; topic: string; difficulty: string; solved: boolean };
type Catalog = { questions: Question[]; total: number; page: number; pageSize: number; topics: string[]; progress: { total: number; solved: number } };
type Runner = { configured: boolean; destination: string; languages: Language[] };
type Detail = Question & {
  statement: { description: string; inputFormat: string; outputFormat: string; constraints: string[] };
  examples: { input: string; output: string }[]; starter: string; language: Language;
  draft: null | { code: string; revision: number };
};
type TestResult = { number: number; sample: boolean; status: string; seconds: number; memoryKb: number; input?: string; expected?: string; output?: string; error?: string };
type Submission = { id: string; question_id: number; language_id: Language; mode: 'RUN' | 'SUBMIT'; code?: string; status: string; passed: number; total: number; created_at: string; result?: { message: string; cases: TestResult[] } };
const active = (status?: string) => status === 'QUEUED' || status === 'RUNNING';
const verdict = (status: string, mode?: string) => status === 'ACCEPTED' ? mode === 'RUN' ? 'Samples passed' : 'Accepted' : ({ QUEUED: 'Queued', RUNNING: 'Running tests', WRONG_ANSWER: 'Wrong answer', COMPILATION_ERROR: 'Compilation error', TIME_LIMIT: 'Time limit exceeded', RUNTIME_ERROR: 'Runtime error', RUNNER_ERROR: 'Runner unavailable' }[status] || status);
const difficultyClass = (value: string) => 'cl-difficulty ' + value.toLowerCase();

export function CodeLab() {
  const { preferences } = useEditorPreferences();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '', topic = params.get('topic') || '', difficulty = params.get('difficulty') || '', state = params.get('state') || '';
  const page = Math.min(1000, Math.max(0, Number(params.get('page')) || 0));
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);
  useEffect(() => {
    if (searchDraft.trim() === search) return;
    const timer = window.setTimeout(() => setParams(current => {
      const next = new URLSearchParams(current);
      searchDraft.trim() ? next.set('search', searchDraft.trim()) : next.delete('search');
      next.delete('page'); return next;
    }, { replace: true }), 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, search, setParams]);
  function filter(key: string, value: string) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); next.delete('page'); setParams(next); }
  const query = new URLSearchParams({ search, topic, difficulty, state, page: String(page) });
  const bank = useQuery({ queryKey: ['codelab', query.toString()], queryFn: () => api<Catalog>('/codelab/questions?' + query) });
  const runner = useQuery({ queryKey: ['codelab-runner'], queryFn: () => api<Runner>('/codelab/status'), refetchInterval: 10000 });
  const progress = bank.data?.progress;
  return <div className="codelab cl-library">
    <header className="cl-hero">
      <div><span className="cl-kicker"><Code2 size={16} /> SKILLNEX CODELAB</span><h1>A little practice.<br /><em>A sharper mind.</em></h1><p>Choose a problem. Try an approach. Make it work.</p><div className="cl-language-chips">{languages.map(l => <span key={l.id}>{l.name}</span>)}</div></div>
      <div className="cl-progress-card"><span className="cl-kicker">YOUR PRACTICE LOG</span><div className="cl-progress-number">{progress?.solved ?? '—'}<span> / {progress?.total ?? 50}</span></div><p>problems solved</p><progress aria-label="Solved problems" value={progress?.solved || 0} max={progress?.total || 50} /><small>One accepted submission. One step forward.</small></div>
    </header>
    <div className="cl-section-head"><div><h2>The problem set</h2><p>50 original DSA challenges, from first principles to deeper patterns.</p></div><span className="cl-library-note"><BookOpen size={16} /> Hints & solutions included</span></div>
    {runner.data && !runner.data.configured && <div className="cl-notice"><Terminal size={18} /><p>The code runner is offline. Start your configured runner to use Run and Submit. You can still explore questions and save your code.</p></div>}
    <div className="cl-filters">
      <form onSubmit={e => { e.preventDefault(); filter('search', searchDraft.trim()); }} className="cl-search"><Search size={17} /><input aria-label="Search problems or topics" placeholder="Search title or topic: arrays, DP…" maxLength={120} value={searchDraft} onChange={e => setSearchDraft(e.target.value)} /><button type="submit">Search</button></form>
      <select aria-label="Filter by topic" value={topic} onChange={e => filter('topic', e.target.value)}><option value="">All topics</option>{bank.data?.topics.map(t => <option key={t}>{t}</option>)}</select>
      <select aria-label="Filter by difficulty" value={difficulty} onChange={e => filter('difficulty', e.target.value)}><option value="">All levels</option>{['Easy', 'Medium', 'Hard'].map(t => <option key={t}>{t}</option>)}</select>
      <select aria-label="Filter by progress" value={state} onChange={e => filter('state', e.target.value)}><option value="">All progress</option><option value="todo">To solve</option><option value="solved">Solved</option></select>
    </div>
    {(search || topic || difficulty || state) && <div className="cl-active-filters" aria-label="Active filters"><span>Matching all filters:</span>{[['search', search], ['topic', topic], ['difficulty', difficulty], ['state', state]].filter(([, value]) => value).map(([key, value]) => <button key={key} onClick={() => filter(key, '')} aria-label={`Clear ${key} filter`}>{key === 'state' ? value === 'todo' ? 'To solve' : 'Solved' : value}<X size={12} /></button>)}<button onClick={() => setParams({})}>Clear all</button></div>}
    {bank.isLoading ? <Loading text="Opening the problem set…" /> : bank.error ? <ErrorState error={bank.error} retry={() => bank.refetch()} /> : <>
      <div className="cl-problem-list"><div className="cl-list-labels"><span>PROBLEM</span><span>TOPIC</span><span>LEVEL</span><span /></div>
        {bank.data?.questions.map(q => <Link key={q.id} className="cl-problem-row" to={`/app/codelab/${q.id}?language=${preferences.language}`}><span className="cl-problem-title"><span className={'cl-problem-marker ' + (q.solved ? 'solved' : '')}>{q.solved ? <Check size={17} /> : String(q.id).padStart(2, '0')}</span><strong>{q.title}</strong></span><span className="cl-topic">{q.topic}</span><span className={difficultyClass(q.difficulty)}>{q.difficulty}</span><ArrowRight size={17} /></Link>)}
        {!bank.data?.questions.length && <div className="cl-empty"><Search size={28} /><h3>No matching problems</h3><p>Try a different topic or clear your filters.</p><Button variant="secondary" onClick={() => setParams({})}>Clear filters</Button></div>}
      </div>
      <footer className="cl-pagination"><span>{bank.data?.total || 0} matching problems</span><div><Button variant="secondary" size="sm" disabled={page === 0} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next); }}><ChevronLeft size={16} />Previous</Button><span>Page {page + 1}</span><Button variant="secondary" size="sm" disabled={(page + 1) * 12 >= (bank.data?.total || 0)} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page + 1)); setParams(next); }}>Next<ChevronRight size={16} /></Button></div></footer>
    </>}
  </div>;
}

export function CodeLabRoom() {
  const { preferences } = useEditorPreferences();
  const defaultLanguage = useRef(preferences.language);
  const { id } = useParams();
  const [params] = useSearchParams();
  const chosen = params.get('language') || defaultLanguage.current;
  const language: Language = languages.some(l => l.id === chosen) ? chosen as Language : 'python';
  const questionId = Number(id);
  const question = useQuery({ queryKey: ['codelab-question', questionId, language], queryFn: () => api<Detail>(`/codelab/questions/${questionId}?language=${language}`), enabled: Number.isInteger(questionId) && questionId > 0 });
  if (!Number.isInteger(questionId) || questionId < 1) return <ErrorState error={new Error('This problem could not be found.')} />;
  if (question.isLoading) return <Loading text="Preparing your workspace…" />;
  if (question.error) return <ErrorState error={question.error} retry={() => question.refetch()} />;
  return question.data ? <ProblemWorkspace key={`${id}:${language}`} question={question.data} language={language} /> : null;
}

function ProblemWorkspace({ question: q, language }: { question: Detail; language: Language }) {
  const { preferences } = useEditorPreferences();
  const { theme } = useWorkspaceTheme();
  const editorExtensions = useMemo(() => [...extensions[language], EditorState.tabSize.of(preferences.tabSize), ...(preferences.lineWrap ? [EditorView.lineWrapping] : [])], [language, preferences.tabSize, preferences.lineWrap]);
  const cache = useQueryClient(), navigate = useNavigate();
  const [code, setCode] = useState(q.draft?.code ?? q.starter);
  const [savedCode, setSavedCode] = useState(q.draft?.code ?? q.starter);
  const [revision, setRevision] = useState(q.draft?.revision ?? 0);
  const [tab, setTab] = useState<'problem' | 'hints' | 'solution' | 'history'>('problem');
  const [mobilePane, setMobilePane] = useState<'problem' | 'code'>('problem');
  const [saving, setSaving] = useState(false), [sending, setSending] = useState(false);
  const [reset, setReset] = useState(false), [error, setError] = useState<unknown>();
  const [submissionId, setSubmissionId] = useState('');
  const [restored, setRestored] = useState(false);
  const actionPending = useRef(false), lastCompleted = useRef('');
  const dirty = code !== savedCode;
  const runner = useQuery({ queryKey: ['codelab-runner'], queryFn: () => api<Runner>('/codelab/status'), refetchInterval: 10000 });
  const hints = useQuery({ queryKey: ['codelab-hints', q.id], queryFn: () => api<string[]>(`/codelab/questions/${q.id}/hints`), enabled: tab === 'hints' });
  const solution = useQuery({ queryKey: ['codelab-solution', q.id, language], queryFn: () => api<{ code: string; approach: string; complexity: string }>(`/codelab/questions/${q.id}/solution?language=${language}`), enabled: tab === 'solution' });
  const history = useQuery({ queryKey: ['codelab-history', q.id], queryFn: () => api<Submission[]>(`/codelab/questions/${q.id}/submissions`) });
  const run = useQuery({ queryKey: ['codelab-submission', submissionId], queryFn: () => api<Submission>('/codelab/submissions/' + submissionId), enabled: !!submissionId,
    refetchInterval: query => query.state.status === 'error' ? false : !query.state.data || active(query.state.data.status) ? 1000 : false });
  const judging = sending || (!!submissionId && !run.error && (!run.data || active(run.data.status)));
  useEffect(() => {
    if (run.data && !active(run.data.status) && lastCompleted.current !== run.data.id) {
      lastCompleted.current = run.data.id;
      void cache.invalidateQueries({ queryKey: ['codelab'] });
      void cache.invalidateQueries({ queryKey: ['codelab-history', q.id] });
      if (run.data.mode === 'SUBMIT' && run.data.status === 'ACCEPTED') {
        cache.setQueriesData<Detail>({ queryKey: ['codelab-question', q.id] }, old => old ? { ...old, solved: true } : old);
      }
    }
  }, [run.data, cache, q.id]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  useEffect(() => {
    function preserveBeforeNavigation(event: MouseEvent) {
      if (!dirty || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download')) return;
      const destination = new URL(link.href);
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash)) return;
      event.preventDefault(); event.stopPropagation();
      if (actionPending.current || saving || sending) return;
      actionPending.current = true;
      void save().then(ok => { if (ok) navigate(destination.pathname + destination.search + destination.hash); })
        .finally(() => { actionPending.current = false; });
    }
    document.addEventListener('click', preserveBeforeNavigation, true);
    return () => document.removeEventListener('click', preserveBeforeNavigation, true);
  }, [dirty, code, revision, saving, sending, navigate]);
  useEffect(() => {
    function beforeLogout(event: Event) {
      if (!dirty) return;
      const pending = (event as CustomEvent<Promise<boolean>[]>).detail;
      pending.push(saving || sending || actionPending.current ? Promise.resolve(false) : save());
    }
    window.addEventListener('skillnex-save-before-logout', beforeLogout);
    return () => window.removeEventListener('skillnex-save-before-logout', beforeLogout);
  }, [dirty, code, revision, saving, sending]);
  async function save() {
    if (!dirty && revision > 0) return true;
    const snapshot = code;
    setSaving(true); setError(undefined);
    try {
      const value = await put<{ revision: number }>(`/codelab/questions/${q.id}/draft?language=${language}`, { code: snapshot, revision });
      setRevision(value.revision); setSavedCode(snapshot);
      cache.setQueryData<Detail>(['codelab-question', q.id, language], old => old ? { ...old, draft: { code: snapshot, revision: value.revision } } : old);
      return true;
    } catch (err) { setError(err); return false; } finally { setSaving(false); }
  }
  async function changeLanguage(value: Language) {
    if (actionPending.current) return;
    actionPending.current = true;
    try { if (!dirty || await save()) navigate(`/app/codelab/${q.id}?language=${value}`); } finally { actionPending.current = false; }
  }
  async function leave() {
    if (actionPending.current) return;
    actionPending.current = true;
    try { if (!dirty || await save()) navigate('/app/codelab'); } finally { actionPending.current = false; }
  }
  async function submit(mode: 'RUN' | 'SUBMIT') {
    if (actionPending.current || judging || saving) return;
    actionPending.current = true; setSending(true); setError(undefined);
    try {
      if (!await save()) return;
      const result = await post<{ id: string }>(`/codelab/questions/${q.id}/submissions`, { code, language, mode, requestKey: crypto.randomUUID() });
      setSubmissionId(result.id); setRestored(false);
    } catch (err) { setError(err); } finally { actionPending.current = false; setSending(false); }
  }
  const languageName = languages.find(l => l.id === language)!;
  return <div className="codelab cl-room" data-mobile-pane={mobilePane} style={{ '--cl-font-size': `${preferences.fontSize}px` } as CSSProperties}>
    <header className="cl-room-heading"><Button variant="ghost" onClick={() => void leave()} disabled={saving || sending}><ArrowLeft size={17} />Problem set</Button><span className="cl-kicker"><Code2 size={16} /> CODELAB</span><span className="cl-room-count">PROBLEM {String(q.id).padStart(2, '0')} / 50</span></header>
    <div className="cl-mobile-panes" aria-label="Workspace view"><button aria-pressed={mobilePane === 'problem'} onClick={() => setMobilePane('problem')}><BookOpen size={15} />Question</button><button aria-pressed={mobilePane === 'code'} onClick={() => setMobilePane('code')}><Code2 size={15} />Code</button></div>
    <div className="cl-workspace">
      <section className="cl-description" aria-label="Problem details"><nav className="cl-tabs" aria-label="Problem sections">{(['problem', 'hints', 'solution', 'history'] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'problem' ? 'Problem' : t === 'hints' ? 'Hints' : t === 'solution' ? 'Solution' : 'Submissions'}</button>)}</nav>
        <div className="cl-description-body"><div className="cl-question-meta"><span className={difficultyClass(q.difficulty)}>{q.difficulty}</span><span>{q.topic}</span>{q.solved && <span className="cl-solved"><CheckCircle2 size={15} />Solved</span>}</div><h1>{q.title}</h1>
          {tab === 'problem' && <><p className="cl-statement">{q.statement.description}</p><h3>Input</h3><p>{q.statement.inputFormat}</p><h3>Output</h3><p>{q.statement.outputFormat}</p>{q.examples.map((example, i) => <div className="cl-example" key={i}><h3>Example {i + 1}</h3><div><span>INPUT</span><pre>{example.input}</pre></div><div><span>OUTPUT</span><pre>{example.output}</pre></div></div>)}<h3>Constraints</h3><ul>{q.statement.constraints.map(c => <li key={c}>{c}</li>)}</ul><div className="cl-small-note">Any correct approach is welcome. Variable names do not affect judging. Read standard input and print only the required answer.</div></>}
          {tab === 'hints' && (hints.isLoading ? <Loading text="Opening hints…" /> : hints.error ? <ErrorState error={hints.error} /> : <><p>Take one hint at a time. Give yourself a moment to try it.</p>{hints.data?.map((hint, i) => <details className="cl-hint" key={i}><summary><Lightbulb size={16} />Hint {i + 1}</summary><p>{hint}</p></details>)}</>)}
          {tab === 'solution' && (solution.isLoading ? <Loading text="Opening the solution…" /> : solution.error ? <ErrorState error={solution.error} /> : solution.data && <><span className="cl-editorial-label">{languageName.name} REFERENCE SOLUTION</span><h3>The approach</h3><p>{solution.data.approach}</p><h3>Complexity</h3><p>{solution.data.complexity}</p><CodeMirror value={solution.data.code} extensions={editorExtensions} theme={theme} editable={false} readOnly basicSetup={{ lineNumbers: true, foldGutter: true, tabSize: preferences.tabSize }} aria-label={`${languageName.name} reference solution`} /><p className="cl-small-note">This is one valid solution. Submit your own approach; matching this source code is never required.</p></>)}
          {tab === 'history' && (history.isLoading ? <Loading text="Loading submissions…" /> : history.error ? <ErrorState error={history.error} /> : <><p>Your latest 30 runs and submissions for this problem.</p>{!history.data?.length && <div className="cl-empty"><Clock3 size={25} /><p>No attempts yet. Your first run starts here.</p></div>}<div className="cl-history">{history.data?.map(s => <button key={s.id} className={s.status === 'ACCEPTED' ? 'passed' : ''} onClick={() => { setSubmissionId(s.id); setRestored(false); }}><strong>{verdict(s.status, s.mode)}</strong><span>{languages.find(l => l.id === s.language_id)?.name} · {s.mode === 'RUN' ? 'Sample run' : 'Submission'}</span><small>{new Date(s.created_at).toLocaleString()} · {s.passed}/{s.total} tests</small></button>)}</div></>)}
        </div>
      </section>
      <div className="cl-coding-column">
        <section className="cl-editor-panel" aria-label="Code workspace"><header className="cl-editor-toolbar"><span><Code2 size={16} />{languageName.file}</span><select aria-label="Programming language" value={language} disabled={saving || sending || judging} onChange={e => void changeLanguage(e.target.value as Language)}>{languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select><button title="Reset to starter code" aria-label="Reset to starter code" disabled={saving || sending} onClick={() => setReset(true)}><RotateCcw size={16} /></button></header>
          <CodeMirror className="cl-editor-canvas" value={code} height="100%" extensions={editorExtensions} theme={theme} onChange={setCode} editable={!saving && !sending} aria-label={`${languageName.name} code editor`} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true, tabSize: preferences.tabSize }} />
          <div className="cl-editor-status"><span>{code.length.toLocaleString()} / 40,000 characters</span><span role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : revision ? 'Saved to your account' : 'Starter code'}</span></div>
          <footer className="cl-run-controls"><Button variant="ghost" size="sm" disabled={saving || sending || code.length > 40000 || (!dirty && revision > 0)} onClick={() => void save()}><Save size={16} />Save draft</Button><div><Button variant="secondary" disabled={!runner.data?.configured || judging || saving || !code.trim() || code.length > 40000} onClick={() => void submit('RUN')}><Play size={15} />Run</Button><Button disabled={!runner.data?.configured || judging || saving || !code.trim() || code.length > 40000} onClick={() => void submit('SUBMIT')}>{judging ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}{judging ? 'Checking…' : 'Submit'}</Button></div></footer>
          <p className="cl-run-help">Run checks the examples. Submit checks examples + hidden cases.{language === 'java' && ' Java entry point: public class Main.'}</p>
        </section>
        {runner.data && !runner.data.configured && <div className="cl-notice"><Terminal size={18} /><p>The code runner is offline. Start your configured runner to use Run and Submit. Your draft can still be saved.</p></div>}
        {runner.data?.configured && <p className="cl-runner-destination">Run/Submit sends your code and test inputs to the configured sandbox: {runner.data.destination}. Account details are not sent.</p>}
        {runner.error && <ErrorState error={runner.error} retry={() => runner.refetch()} />}
        {error ? <ErrorState error={error} /> : null}
        <section className="cl-results" aria-label="Execution result"><header><Terminal size={17} /><h2>Test results</h2>{judging && <span role="status">Checking your code…</span>}</header>
          {run.error ? <ErrorState error={run.error} retry={() => run.refetch()} /> : run.data ? <div className="cl-result-body"><div className="cl-verdict"><strong className={run.data.status === 'ACCEPTED' ? 'passed' : active(run.data.status) ? '' : 'failed'}>{verdict(run.data.status, run.data.mode)}</strong><span>{run.data.passed} / {run.data.total} tests</span></div><p>{run.data.result?.message || 'Your code is queued for isolated execution. This may take a moment.'}</p>{run.data.mode === 'RUN' && run.data.status === 'ACCEPTED' && <p className="cl-small-note">Samples passed. Submit to check the hidden cases and mark this problem solved.</p>}
            {run.data.code !== undefined && run.data.code !== code && <div className="cl-small-note">This result belongs to an earlier code version in {languages.find(l => l.id === run.data?.language_id)?.name}. {run.data.language_id === language && <button onClick={() => { setCode(run.data!.code!); setRestored(true); }}>Restore that code</button>}</div>}{restored && <p role="status">Code restored in the editor. Save it to keep this draft.</p>}
            <div className="cl-test-list">{run.data.result?.cases.map(t => <details key={t.number}><summary><span className={t.status === 'ACCEPTED' ? 'passed' : 'failed'}>{t.status === 'ACCEPTED' ? <CheckCircle2 size={15} /> : <span>×</span>}</span><strong>{t.sample ? 'Example' : 'Hidden case'} {t.number}</strong><span>{verdict(t.status)}</span></summary>{t.sample ? <div className="cl-case-details"><span>INPUT</span><pre>{t.input}</pre><span>EXPECTED</span><pre>{t.expected}</pre><span>YOUR OUTPUT</span><pre>{t.output || '(no output)'}</pre>{t.error && <><span>DIAGNOSTIC</span><pre className="failed">{t.error}</pre></>}</div> : <p>Hidden input and output stay private. Check the problem constraints and edge cases.</p>}</details>)}</div>
          </div> : <div className="cl-results-empty"><Play size={22} /><p>Your next idea starts in the editor.</p><span>Run your code to see its output here.</span></div>}
        </section>
      </div>
    </div>
    <Dialog open={reset} onOpenChange={setReset} title="Reset this editor?"><p>This replaces the current editor text with {languageName.name} starter code. Your saved draft is unchanged until you save again.</p><div className="cl-dialog-actions"><Button variant="secondary" onClick={() => setReset(false)}>Keep my code</Button><Button onClick={() => { setCode(q.starter); setReset(false); }}>Reset editor</Button></div></Dialog>
  </div>;
}
