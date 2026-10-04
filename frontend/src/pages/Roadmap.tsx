import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Check,
  ArrowRight,
  BookOpen,
  Code2,
  Layers,
  Mic,
  Route,
  Target,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import type { Data, RoadmapItem } from '../types';
import { useSession } from '../hooks/useSession';
import {
  PageTitle,
  Card,
  Empty,
  Loading,
  ErrorState,
  Progress,
  AILabel,
} from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
export function Roadmap() {
  const { user, config } = useSession();
  const q = useQuery({ queryKey: ['roadmap'], queryFn: () => api<Data>('/career/roadmap') });
  const client = useQueryClient();
  const [open, setOpen] = useState(false),
    [goal, setGoal] = useState(user.career_goal || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [expanded, setExpanded] = useState<string | null>(null);
  const generating = useRef(false);
  const progressRequests = useRef(new Set<string>());
  const [savingProgress, setSavingProgress] = useState<string[]>([]);
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (generating.current) return;
    if (!goal.trim()) {
      setError(new Error('Enter the career goal you want to work towards.'));
      return;
    }
    generating.current = true;
    setBusy(true);
    setError(null);
    try {
      await post('/career/roadmap', { text: goal });
      client.invalidateQueries({ queryKey: ['roadmap'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['me'] });
      setOpen(false);
      toast.success('Your next chapter has a plan.');
    } catch (e) {
      setError(e);
    } finally {
      generating.current = false;
      setBusy(false);
    }
  }
  async function progress(item: RoadmapItem, value: number) {
    if (progressRequests.current.has(item.id)) return;
    progressRequests.current.add(item.id);
    setSavingProgress([...progressRequests.current]);
    try {
      await api('/career/roadmap/items/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ progress: value }),
      });
      await client.invalidateQueries({ queryKey: ['roadmap'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(value === 100 ? 'Milestone complete. Look at you go!' : 'Progress saved.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      progressRequests.current.delete(item.id);
      setSavingProgress([...progressRequests.current]);
    }
  }
  const items = (q.data?.items || []) as RoadmapItem[];
  const percent = items.length
    ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length)
    : 0;
  return (
    <>
      <PageTitle
        eyebrow="AMBITION, WITH A LITTLE DIRECTION"
        title="Your future. One step at a time."
        description="A personal path from where you are to where you want to go."
        action={
          <Button
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
          >
            <Sparkles size={15} />
            {items.length ? 'Create a new roadmap' : 'Find my path'}
          </Button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : items.length ? (
        <>
          <Card className="roadmap-hero">
            <div>
              <span className="pill purple">
                <Target size={14} />
                YOUR NORTH STAR
              </span>
              <h2>{q.data?.title}</h2>
              <p>{q.data?.summary}</p>
              <AILabel demo={config.demo && q.data?.summary?.startsWith('Demo roadmap')} />
            </div>
            <div className="roadmap-total">
              <strong>
                {percent}
                <span>%</span>
              </strong>
              <small>
                {items.filter((i) => i.progress === 100).length} of {items.length} milestones
                completed
              </small>
              <Progress value={percent} />
            </div>
          </Card>
          <div className="full-roadmap">
            {items.map((item, i) => (
              <div
                className={'milestone ' + (item.progress === 100 ? 'completed' : '')}
                key={item.id}
              >
                <div className="milestone-marker">
                  {item.progress === 100 ? <Check size={20} /> : String(i + 1).padStart(2, '0')}
                </div>
                <Card>
                  <button
                    className="milestone-heading"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    aria-expanded={expanded === item.id}
                  >
                    <div>
                      <span className="eyebrow">
                        {item.progress === 100
                          ? 'YOU DID THIS'
                          : item.progress > 0
                            ? 'IN PROGRESS'
                            : 'YOUR NEXT POSSIBILITY'}
                      </span>
                      <h2>{item.title}</h2>
                    </div>
                    <span className={'pill ' + (item.progress === 100 ? 'green' : 'purple')}>
                      {item.progress === 100 ? 'Completed' : item.progress + '%'}
                    </span>
                    <ChevronDown size={18} />
                  </button>
                  <Progress value={item.progress} />
                  {expanded === item.id && (
                    <div className="milestone-details">
                      <div className="milestone-activities">
                        {[
                          [BookOpen, 'Learn', 'learn'],
                          [Code2, 'Practice', 'practice'],
                          [Layers, 'Build', 'build'],
                          [Mic, 'Interview', 'interview'],
                        ].map(([Icon, title, key]: any) => (
                          <div key={key}>
                            <span className="mini-icon purple">
                              <Icon size={18} />
                            </span>
                            <h3>{title}</h3>
                            <p>{item[key as keyof RoadmapItem]}</p>
                          </div>
                        ))}
                      </div>
                      <div className="progress-controls">
                        <label>
                          Your progress
                          <select
                            disabled={savingProgress.includes(item.id)}
                            value={item.progress}
                            onChange={(e) => progress(item, Number(e.target.value))}
                          >
                            {[0, 20, 40, 60, 80, 100].map((p) => (
                              <option key={p} value={p}>
                                {p}%
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          variant="secondary"
                          disabled={savingProgress.includes(item.id)}
                          onClick={() => progress(item, item.progress === 100 ? 0 : 100)}
                        >
                          <Check size={15} />
                          {item.progress === 100 ? 'Reopen milestone' : 'Mark complete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
          <div className="roadmap-note">
            <Sparkles size={18} />
            <p>
              Progress is self-reported. Go at your own pace, revisit what you need, and keep
              building.
            </p>
          </div>
        </>
      ) : (
        <Card>
          <Empty
            title="Big goals feel smaller with a plan."
            description="Tell us the career you’re aiming for. We’ll use your skills, resume, and practice history to create a roadmap."
            action={
              <Button onClick={() => setOpen(true)}>
                <Route size={17} />
                Create my roadmap
              </Button>
            }
          />
        </Card>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
        title="Where would you like to go?"
        description="A new roadmap will become your active plan. Earlier roadmaps stay in your account history."
      >
        <form className="stack" onSubmit={generate}>
          {!!error && <ErrorState error={error} />}
          <label>
            Career goal
            <input
              disabled={busy}
              list="goals"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={200}
              placeholder="e.g. Software Engineer"
              required
            />
          </label>
          <datalist id="goals">
            {[
              'Java Developer',
              'Software Engineer',
              'Data Analyst',
              'Frontend Developer',
              'AI Engineer',
            ].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </datalist>
          <p className="muted">
            For a more relevant roadmap, keep your profile skills and resume up to date.
          </p>
          <Button disabled={busy} type="submit">
            {busy ? 'Mapping your next steps…' : 'Generate my roadmap'}
            <ArrowRight size={15} />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
