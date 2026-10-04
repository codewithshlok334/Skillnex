import { useState } from 'react';
import { CareerScene } from '../components/CareerScene';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Mic,
  Route,
  Users,
  Sparkles,
  Check,
  Clock,
  CalendarDays,
  Code2,
  CheckCircle2,
  MessagesSquare,
  Plus,
  Target,
  Compass,
} from 'lucide-react';
import { api, post } from '../api/client';
import { useSession } from '../hooks/useSession';
import type { Data, RoadmapItem } from '../types';
import {
  Card,
  PageTitle,
  SectionTitle,
  Loading,
  ErrorState,
  Progress,
  ScoreRing,
} from '../components/Common';
import { Button } from '../components/ui/button';
import { date } from '../utils/cn';
import { toast } from 'sonner';
export function OrbitArt() {
  return <CareerScene compact />;
}
export function Dashboard() {
  const { user, config } = useSession();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Data>('/dashboard') });
  const [recommendation, setRecommendation] = useState<Data | null>(null),
    [thinking, setThinking] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  const items = d.roadmapItems as RoadmapItem[];
  const progress = items.length
    ? Math.round(items.reduce((a, b) => a + b.progress, 0) / items.length)
    : 0;
  const completed = items.filter((x) => x.progress === 100).length;
  const upcoming = d.upcoming?.[0];
  const stats = [
    {
      title: 'Resume score',
      value: d.resume?.analysis.score ?? '—',
      suffix: '/ 100',
      icon: FileText,
      color: 'purple',
      detail: d.resume ? 'A strong foundation to build on' : 'Your story starts here',
      link: '/app/resumes',
      spark: [22, 32, 29, 41, 38, 54, 59],
    },
    {
      title: 'Interview score',
      value: d.interviewReport?.score ?? '—',
      suffix: '/ 100',
      icon: Mic,
      color: 'blue',
      detail: d.interviewReport ? 'Keep your practice going' : 'Ready when you are',
      link: '/app/interviews',
      spark: [18, 23, 35, 32, 46, 44, 57],
    },
    {
      title: 'Career progress',
      value: progress,
      suffix: '%',
      icon: Route,
      color: 'green',
      detail: completed + ' of ' + items.length + ' milestones completed',
      link: '/app/roadmap',
      spark: [14, 24, 24, 34, 34, 50, 54],
    },
    {
      title: 'Community reputation',
      value: user.reputation,
      suffix: 'pts',
      icon: Users,
      color: 'orange',
      detail: user.badges.length + ' badges earned',
      link: '/app/profile',
      spark: [19, 25, 23, 38, 40, 45, 58],
    },
  ];
  async function recommend() {
    setThinking(true);
    try {
      setRecommendation(await post('/career/recommendations'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setThinking(false);
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PageTitle
        title={'Welcome back, ' + user.name.split(' ')[0] + ' 👋'}
        description="Small steps today. Big possibilities tomorrow."
        action={
          <div className="date-chip">
            <CalendarDays size={15} />
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        }
      />
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h2>
            Big ambitions.
            <br />
            Meet your unfair advantage.
          </h2>
          <p>
            A sharper resume. A confident interview. A clearer path.
            <br className="desktop-break" /> Let’s get you one step closer to the career you want.
          </p>
          <div className="hero-buttons">
            <Button asChild>
              <Link to="/app/resumes">
                <Sparkles size={16} />
                Analyze my resume
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Link className="hero-secondary" to="/app/roadmap">
              Explore my roadmap
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <OrbitArt />
        <span className="hero-corner">Built around you. Powered by AI.</span>
      </section>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <Link to={s.link} className="stat-card" key={s.title}>
            <div className="stat-heading">
              <span className={'mini-icon ' + s.color}>
                <s.icon size={18} />
              </span>
              <span>{s.title}</span>
              <ArrowUpRight size={15} className="stat-arrow" />
            </div>
            <div className="stat-value">
              <strong>{s.value}</strong>
              <span>{s.suffix}</span>
              {config.demo && (
                <svg
                  className={'sparkline ' + s.color}
                  width="89"
                  height="38"
                  viewBox="0 0 90 44"
                  aria-hidden="true"
                >
                  <path
                    d={'M ' + s.spark.map((v, j) => j * 14 + 2 + ',' + (66 - v)).join(' L ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <p>
              {i === 3 ? (
                <span className="tiny-medal">✦</span>
              ) : (
                <span className={'stat-dot ' + s.color} />
              )}{' '}
              {s.detail}
            </p>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Card className="resume-overview">
            <SectionTitle
              title="Your resume, but better"
              subtitle="Turn your potential into a great first impression."
              to="/app/resumes"
              label="View analysis"
            />
            <div className="resume-body">
              <ScoreRing value={d.resume?.analysis.score || 0} />
              <div className="resume-info">
                <div className="resume-file">
                  <FileText size={17} />
                  <strong>{d.resume?.name || 'No resume analyzed yet'}</strong>
                  {d.resume && <span className="pill green">Analyzed</span>}
                </div>
                <p>
                  {d.resume
                    ? 'You’re off to a great start. A few thoughtful changes can make your experience stand out.'
                    : 'Upload your resume to get clear, actionable suggestions tailored to your experience.'}
                </p>
                {d.resume && (
                  <div className="resume-tags">
                    <span>
                      <CheckCircle2 size={13} />
                      Clear structure
                    </span>
                    <span>
                      <Sparkles size={13} />
                      Room to grow
                    </span>
                  </div>
                )}
                <Link to="/app/resumes" className="text-link">
                  Make my resume stronger
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="card-footnote">
              <span className="info-dot">i</span>Estimated ATS compatibility score ·{' '}
              {config.demo
                ? 'Sample analysis in demo mode'
                : 'Not a prediction of an employer’s ATS results'}
            </div>
          </Card>
          <Card className="roadmap-card">
            <SectionTitle
              title="Your path forward"
              subtitle={d.roadmap?.title || 'Choose a career. Make a plan.'}
              to="/app/roadmap"
              label="Full roadmap"
            />
            {items.length ? (
              <>
                <div className="roadmap-summary">
                  <span>
                    <strong>{progress}%</strong> of the journey complete
                  </span>
                  <span>
                    {completed}/{items.length} milestones
                  </span>
                </div>
                <Progress value={progress} />
                <div className="roadmap-preview">
                  {items.slice(0, 5).map((item, i) => (
                    <Link
                      to="/app/roadmap"
                      key={item.id}
                      className={
                        'roadmap-preview-item ' +
                        (item.progress === 100 ? 'done' : item.progress > 0 ? 'in-progress' : '')
                      }
                    >
                      <span className="step-node">
                        {item.progress === 100 ? <Check size={13} /> : i + 1}
                      </span>
                      <span>{item.title}</span>
                      <small>
                        {item.progress === 100
                          ? 'Completed'
                          : item.progress > 0
                            ? item.progress + '% complete'
                            : 'Up next'}
                      </small>
                    </Link>
                  ))}
                </div>
                <div className="next-step">
                  <span className="mini-icon purple">
                    <Compass size={19} />
                  </span>
                  <div>
                    <strong>Keep the momentum going</strong>
                    <p>{items.find((i) => i.progress < 100)?.title || 'Set your next goal'}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/app/roadmap">
                      Continue
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="compact-empty">
                <Route size={30} />
                <p>A personalized plan turns ambition into progress.</p>
                <Button asChild>
                  <Link to="/app/roadmap">Create my roadmap</Link>
                </Button>
              </div>
            )}
          </Card>
          <Card className="community-preview">
            <SectionTitle
              title="Better together"
              subtitle="A campus full of curious minds. Yours included."
              to="/app/community"
              label="Visit community"
            />
            {d.recentQuestions.map((question: Data, i: number) => (
              <Link
                className="question-preview"
                to={'/app/community/' + question.id}
                key={question.id}
              >
                <span className={'question-symbol ' + ['purple', 'blue', 'orange'][i]}>
                  {i === 0 ? (
                    <Code2 size={18} />
                  ) : i === 1 ? (
                    <MessagesSquare size={18} />
                  ) : (
                    <FileText size={18} />
                  )}
                </span>
                <div>
                  <h3>{question.title}</h3>
                  <p>
                    <span className="category-text">{question.category}</span>
                    <span>·</span>
                    {question.name}
                    <span>·</span>
                    {question.answer_count} answers
                  </p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <div className="community-footer">
              <span className="stacked-avatars">
                <i>MC</i>
                <i>PS</i>
                <i>AM</i>
              </span>
              <p>Good questions lead to great conversations.</p>
              <Link to="/app/community" className="text-link">
                Join in
                <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
        <div className="dashboard-side">
          <Card className="ai-coach">
            <div className="coach-heading">
              <span className="mini-icon purple">
                <Sparkles size={20} />
              </span>
              <span>YOUR AI COPILOT</span>
              <span className="pill">FOR YOU</span>
            </div>
            <h2>{recommendation?.title || 'Your next best move'}</h2>
            <p>
              {recommendation?.recommendation ||
                (user.skills?.includes('Java') && user.skills?.includes('SQL')
                  ? 'You have Java and SQL in your toolkit. Strengthening your Spring Boot skills is a natural next step toward your goal.'
                  : 'Tell us about your skills and career goal, and we’ll help you find a useful next step.')}
            </p>
            <div className="coach-context">
              <Target size={14} />
              {user.career_goal || 'Set your goal in your profile'}
            </div>
            <Button variant="secondary" onClick={recommend} disabled={thinking}>
              {thinking ? 'Preparing your recommendation…' : 'Get personalized advice'}
              <Sparkles size={14} />
            </Button>
            <small>
              {recommendation
                ? 'AI-generated · Based on your profile and activity'
                : 'Based on your profile · Live AI advice on request'}
            </small>
          </Card>
          <Card className="upcoming-card">
            <SectionTitle title="Next on your calendar" to="/app/interviews" label="View" />
            {upcoming ? (
              <>
                <div className="interview-label">
                  <span className="mini-icon blue">
                    <Mic size={20} />
                  </span>
                  <span className="pill blue">Mock interview</span>
                </div>
                <h3>{upcoming.role}</h3>
                <p>
                  {upcoming.kind} interview · {upcoming.difficulty}
                </p>
                <div className="interview-meta">
                  <span>
                    <CalendarDays size={15} />
                    {date(upcoming.scheduled_at)}
                  </span>
                  <span>
                    <Clock size={15} />
                    {upcoming.duration} min
                  </span>
                </div>
                <Button asChild variant="secondary">
                  <Link to={'/app/interviews/' + upcoming.id}>
                    Get interview ready
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p>No interviews scheduled. Make space for practice.</p>
                <Button asChild variant="secondary">
                  <Link to="/app/interviews">
                    <Plus size={15} />
                    Schedule practice
                  </Link>
                </Button>
              </>
            )}
          </Card>
          <Card className="activity-card">
            <SectionTitle title="Little wins, big energy" />
            <div className="activity-list">
              {d.activity.length ? (
                d.activity.map((a: Data, i: number) => (
                  <Link to={a.link} className="activity-item" key={i}>
                    <span className={'activity-dot ' + ['green', 'purple', 'blue', 'orange'][i]} />
                    <div>
                      <p>{a.message}</p>
                      <small>{date(a.created_at)}</small>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted">Your progress will appear here. Let’s make your first move.</p>
              )}
            </div>
          </Card>
          <div className="daily-note">
            <span>✧</span>
            <p>“You don’t have to see the whole staircase. Just take the first step.”</p>
            <small>A LITTLE REMINDER FOR TODAY</small>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
