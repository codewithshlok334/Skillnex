import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, ArrowRight, BookOpen, Code2, Layers, Mic, Route, Target, Download, Network, List, CircleCheck, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { api, post, download } from '../api/client';
import type { Data, RoadmapItem } from '../types';
import { useSession } from '../hooks/useSession';
import { Loading, ErrorState, AILabel } from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import '../roadmap-explorer.css';
import { roadmapTopics } from '../data/roadmapTopics';

const activities = [
  { key: 'learn', label: 'Learn', icon: BookOpen, hint: 'Understand the foundations' },
  { key: 'practice', label: 'Practice', icon: Code2, hint: 'Turn knowledge into a skill' },
  { key: 'build', label: 'Build', icon: Layers, hint: 'Make something you can show' },
  { key: 'interview', label: 'Explain', icon: Mic, hint: 'Practice talking through your thinking' },
] as const;
const status = (value: number) => value === 100 ? 'Complete' : value > 0 ? 'In progress' : 'Not started';
const tone = (index: number) => ['cyan', 'violet', 'amber'][index % 3];

export function Roadmap() {
  const { user, config } = useSession();
  const q = useQuery({ queryKey: ['roadmap'], queryFn: () => api<Data>('/career/roadmap') });
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState(user.career_goal || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [exporting, setExporting] = useState(false);
  const generating = useRef(false);
  const progressRequests = useRef(new Set<string>());
  const [savingProgress, setSavingProgress] = useState<string[]>([]);
  const detail = useRef<HTMLElement>(null);
  const [topicGroup, setTopicGroup] = useState('All');
  const [topicSearch, setTopicSearch] = useState('');
  const [browseTopics, setBrowseTopics] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (generating.current) return;
    if (!goal.trim()) { setError(new Error('Enter the career goal you want to work towards.')); return; }
    generating.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post<Data>('/career/roadmap', { text: goal.trim() });
      client.setQueryData(['roadmap'], result);
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['me'] });
      setSelected(null);
      setOpen(false);
      toast.success('Your next chapter has a plan.');
    } catch (e) { setError(e); }
    finally { generating.current = false; setBusy(false); }
  }
  async function progress(item: RoadmapItem, value: number) {
    if (progressRequests.current.has(item.id)) return;
    setSelected(item.id);
    progressRequests.current.add(item.id);
    setSavingProgress([...progressRequests.current]);
    try {
      await api('/career/roadmap/items/' + item.id, { method: 'PATCH', body: JSON.stringify({ progress: value }) });
      await client.invalidateQueries({ queryKey: ['roadmap'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(value === 100 ? 'Milestone complete. One step closer.' : 'Progress saved.');
    } catch (e) { toast.error((e as Error).message); }
    finally { progressRequests.current.delete(item.id); setSavingProgress([...progressRequests.current]); }
  }
  async function exportPdf() {
    if (exporting || !q.data?.id) return;
    setExporting(true);
    try { await download('/career/roadmap/' + q.data.id + '/export', 'SkillNex-career-roadmap.pdf'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not download your roadmap. Try again.'); }
    finally { setExporting(false); }
  }
  function choose(id: string, scroll = true) {
    setSelected(id);
    if (scroll) requestAnimationFrame(() => { detail.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); detail.current?.focus({ preventScroll: true }); });
  }
  function newPlan() { setGoal(q.data?.title || user.career_goal || ''); setError(null); setOpen(true); }

  const items = (q.data?.items || []) as RoadmapItem[];
  const percent = items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0;
  const completed = items.filter(i => i.progress === 100).length;
  const next = items.find(i => i.progress < 100);
  const active = items.find(i => i.id === selected) || next || items[0];
  const activeIndex = items.findIndex(i => i.id === active?.id);
  const rows = Math.ceil(items.length / 2);
  const mapHeight = Math.max(400, rows * 140 + 60);
  const nodeY = (index: number) => 30 + Math.floor(index / 2) * 140;
  const openNode = (item: RoadmapItem, index: number, graph: boolean) => (
    <button key={item.id} type="button" className={`rm-node rm-${tone(index)} ${active?.id === item.id ? 'is-selected' : ''} ${item.progress === 100 ? 'is-complete' : ''}`}
      style={graph ? { left: index % 2 ? '69%' : '3%', top: nodeY(index), width: '28%' } : undefined}
      aria-pressed={active?.id === item.id} aria-controls="roadmap-step-details" onClick={() => choose(item.id)}>
      <span className="rm-node-meta"><span>STEP {String(index + 1).padStart(2, '0')}</span><span>{item.progress === 100 ? <Check size={15} aria-label="Complete" /> : `${item.progress}%`}</span></span>
      <strong>{item.title}</strong>
      <span className="rm-node-bottom"><span>{status(item.progress)}</span><ArrowRight size={14} /></span>
    </button>
  );

  return (
    <div className="rm-page">
      <header className="rm-page-heading">
        <div><span className="rm-kicker"><Compass size={15} /> YOUR CAREER, MAPPED OUT</span><h1>A direction. <em>A way forward.</em></h1><p>Explore your path, build the skills, and make each step count.</p></div>
        <div className="rm-header-actions">
          {!!items.length && <Button variant="secondary" onClick={exportPdf} disabled={exporting || savingProgress.length > 0}><Download size={16} />{exporting ? 'Preparing PDF…' : 'Download PDF'}</Button>}
          <Button onClick={newPlan}><Sparkles size={16} />{items.length ? 'New roadmap' : 'Find my path'}</Button>
        </div>
      </header>
      <section className="rm-topics" aria-label="Career roadmap topics">
        <div className="rm-topics-heading"><div><span className="rm-kicker">MORE DIRECTIONS TO EXPLORE</span><h2>Find a path that feels like you.</h2></div><button type="button" onClick={()=>setBrowseTopics(!browseTopics)} aria-expanded={browseTopics}>{browseTopics ? 'Show less' : `Browse all ${roadmapTopics.length} topics`} <ArrowRight size={14}/></button></div>
        {browseTopics && <div className="rm-topic-filters"><input aria-label="Search roadmap topics" value={topicSearch} onChange={e=>setTopicSearch(e.target.value)} placeholder="Search a career or skill…"/><select aria-label="Topic category" value={topicGroup} onChange={e=>setTopicGroup(e.target.value)}>{['All',...new Set(roadmapTopics.map(t=>t.group))].map(g=><option key={g}>{g}</option>)}</select></div>}
        <div className="rm-topic-options">{(browseTopics ? roadmapTopics.filter(t=>(topicGroup==='All'||t.group===topicGroup)&&t.title.toLowerCase().includes(topicSearch.toLowerCase())) : [roadmapTopics[0],roadmapTopics[8],roadmapTopics[12],roadmapTopics[13],roadmapTopics[18],roadmapTopics[21]]).map(t=><button type="button" key={t.title} onClick={()=>{setGoal(t.title);setError(null);setOpen(true);}}>{t.title}<ArrowRight size={13}/></button>)}</div>
        {browseTopics && !roadmapTopics.some(t=>(topicGroup==='All'||t.group===topicGroup)&&t.title.toLowerCase().includes(topicSearch.toLowerCase())) && <p className="muted">No matching topic. You can enter your own goal with “{items.length ? 'New roadmap' : 'Find my path'}”.</p>}
      </section>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} retry={() => q.refetch()} /> : items.length ? <>
        <section className="rm-overview" aria-label="Your roadmap progress">
          <div className="rm-goal"><span className="rm-kicker">THE DESTINATION</span><h2>{q.data?.title}</h2><p>{q.data?.summary}</p><AILabel demo={config.demo && q.data?.summary?.startsWith('Demo roadmap')} /></div>
          <div className="rm-score"><div className="rm-ring" style={{ background: `conic-gradient(var(--rm-cyan) ${percent}%, var(--rm-border) 0)` }}><span><strong>{percent}<small>%</small></strong><small>your progress</small></span></div><p><strong>{completed} / {items.length}</strong> milestones complete</p></div>
        </section>
        <section className="rm-explorer" aria-label="Interactive career roadmap">
          <div className="rm-map-toolbar"><div><Network size={18} /><h2>Explore your path</h2><span>{items.length} milestones</span></div><div className="rm-view-switch" aria-label="Roadmap view"><button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Network size={14} /> Map</button><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={14} /> List</button></div></div>
          <p className="rm-map-caption">Follow the numbered steps. Select a milestone to open its action plan.</p>
          {view === 'map' && <div className="rm-graph-scroll" tabIndex={0} aria-label="Career map. Scroll to explore all milestones."><div className="rm-graph" style={{ height: mapHeight }}>
            <svg className="rm-connections" viewBox={`0 0 1000 ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
              {items.map((item, i) => { const y = nodeY(i) + 56, right = i % 2 === 1; const path = `M ${right ? 625 : 375} ${mapHeight / 2} C ${right ? 660 : 340} ${mapHeight / 2}, ${right ? 625 : 375} ${y}, ${right ? 690 : 310} ${y}`; return <g key={item.id} className={`rm-${tone(i)} ${active?.id === item.id ? 'is-selected' : ''}`}><path className="rm-wire-glow" d={path} /><path className="rm-wire" d={path} /><circle cx={right ? 690 : 310} cy={y} r="4" /></g>; })}
            </svg>
            <div className="rm-hub" style={{ top: mapHeight / 2 }}><span className="rm-hub-icon"><Route size={28} /></span><span className="rm-kicker">YOUR NORTH STAR</span><strong>{q.data?.title}</strong><span>{percent}% of your plan complete</span><button type="button" onClick={() => choose((next || items[0]).id)}>{next ? 'Continue my path' : 'Review my journey'}<ArrowRight size={14} /></button></div>
            {items.map((item, i) => openNode(item, i, true))}
          </div></div>}
          <div className={`rm-step-list ${view === 'map' ? 'rm-mobile-list' : ''}`}>{items.map((item, i) => openNode(item, i, false))}</div>
          <div className="rm-map-legend"><span><i className="rm-dot" /> A plan you can make your own</span><span><CircleCheck size={14} /> Progress is self-reported</span></div>
        </section>
        {active && <section ref={detail} tabIndex={-1} id="roadmap-step-details" className={`rm-detail rm-${tone(activeIndex)}`} aria-labelledby="roadmap-step-title">
          <div className="rm-detail-heading"><div><span className="rm-kicker">YOUR ACTION PLAN · STEP {String(activeIndex + 1).padStart(2, '0')}</span><h2 id="roadmap-step-title">{active.title}</h2></div><span className="rm-status">{status(active.progress)} · {active.progress}%</span></div>
          <div className="rm-activities">{activities.map(({key,label,icon:Icon,hint}) => <article key={key}><span className="rm-activity-icon"><Icon size={21} /></span><h3>{label}</h3><small>{hint}</small><p>{active[key] || 'Revisit this milestone and choose an activity that supports your goal.'}</p></article>)}</div>
          <div className="rm-detail-footer"><label>Your progress<select value={active.progress} disabled={savingProgress.includes(active.id)} onChange={e => progress(active, Number(e.target.value))}>{[...new Set([0,20,40,60,80,100,active.progress])].sort((a,b) => a-b).map(p => <option key={p} value={p}>{p}%</option>)}</select></label><div><Button variant="secondary" disabled={savingProgress.includes(active.id)} onClick={() => progress(active, active.progress === 100 ? 0 : 100)}><Check size={16} />{savingProgress.includes(active.id) ? 'Saving…' : active.progress === 100 ? 'Reopen milestone' : 'Mark complete'}</Button>{items[activeIndex + 1] && <Button variant="ghost" onClick={() => choose(items[activeIndex + 1].id)}>Next step <ArrowRight size={16} /></Button>}</div></div>
        </section>}
        <div className="rm-bottom-note"><Target size={18} /><p>{next ? `Up next: ${next.title}. Small, consistent steps add up.` : 'Every milestone complete. Revisit your work or set your next career goal.'}<small>This tracks your learning plan, not a skill assessment or a guarantee of career outcomes.</small></p></div>
      </> : <section className="rm-welcome">
        <div className="rm-welcome-art" aria-hidden="true"><span className="rm-orbit rm-orbit-one" /><span className="rm-orbit rm-orbit-two" /><span className="rm-welcome-center"><Compass size={48} /></span><span className="rm-floating rm-floating-one"><BookOpen size={17} /> Learn</span><span className="rm-floating rm-floating-two"><Code2 size={17} /> Practice</span><span className="rm-floating rm-floating-three"><Layers size={17} /> Build</span></div>
        <div><span className="rm-kicker">FROM AMBITION TO ACTION</span><h2>Your next chapter starts<br />with a little direction.</h2><p>Tell us where you want to go. Your skills, resume and practice history help shape a personal map with clear steps you can work through.</p><Button onClick={newPlan}>Create my roadmap <ArrowRight size={16} /></Button><span className="rm-welcome-footnote"><Download size={14} /> Save your plan as a PDF once it is ready.</span></div>
      </section>}
      <Dialog open={open} onOpenChange={nextOpen => { if (!busy) setOpen(nextOpen); }} title="Where would you like to go?" description="A new roadmap becomes your active plan. Earlier roadmaps stay in your account history.">
        <form className="stack" onSubmit={generate}>
          {!!error && <ErrorState error={error} />}
          <label>Career goal<input disabled={busy} list="roadmap-goals" value={goal} onChange={e => setGoal(e.target.value)} maxLength={200} placeholder="e.g. Software Engineer" required /></label>
          <datalist id="roadmap-goals">{roadmapTopics.map(t => <option key={t.title}>{t.title}</option>)}</datalist>
          <p className="muted">For a more relevant roadmap, keep your profile skills and resume up to date.</p>
          <Button disabled={busy} type="submit">{busy ? 'Mapping your next steps…' : 'Generate my roadmap'}<ArrowRight size={15} /></Button>
          {busy && <p role="status" className="muted">Your personal plan is being prepared. This can take a little time.</p>}
        </form>
      </Dialog>
    </div>
  );
}
