import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Sparkles,
  MessageCircle,
  Bookmark,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Flag,
  Check,
  ArrowRight,
  Send,
  Users,
  Code2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import type { Data, Question } from '../types';
import { useSession } from '../hooks/useSession';
import {
  PageTitle,
  Card,
  SectionTitle,
  Empty,
  Loading,
  ErrorState,
  AILabel,
} from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { date, initials } from '../utils/cn';
export function Community() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || ''),
    [category, setCategory] = useState(''),
    [sort, setSort] = useState('recent'),
    [bookmarked, setBookmarked] = useState(false),
    [page, setPage] = useState(0),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [original, setOriginal] = useState(''),
    [body, setBody] = useState(''),
    [askCategory, setAskCategory] = useState('Programming'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [suggestion, setSuggestion] = useState('');
  const client = useQueryClient(),
    navigate = useNavigate();
  const { config } = useSession();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Data[]>('/community/categories'),
  });
  const q = useQuery({
    queryKey: ['questions', params.get('q'), category, sort, page, bookmarked],
    queryFn: () =>
      api<Data>(
        '/community/questions?' +
          new URLSearchParams({
            q: params.get('q') || '',
            category,
            sort,
            page: String(page),
            bookmarked: String(bookmarked),
          }),
      ),
  });
  async function enhance() {
    setBusy(true);
    try {
      const r = await post('/community/questions/enhance', { text: title });
      setSuggestion(r.title);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post('/community/questions', {
        title,
        originalTitle: original || title,
        body,
        category: askCategory,
      });
      client.invalidateQueries({ queryKey: ['questions'] });
      client.invalidateQueries({ queryKey: ['me'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
      navigate('/app/community/' + r.id);
      toast.success('Your question is live. Let the conversation begin.');
      if (config.aiAvailable)
        post('/community/questions/' + r.id + '/explain')
          .then(() => client.invalidateQueries({ queryKey: ['question', r.id] }))
          .catch(() =>
            toast.info('Your question was saved. AI explanation is temporarily unavailable.'),
          );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CURIOUS MINDS, BETTER TOGETHER"
        title="You don’t have to figure it out alone."
        description="Ask a question. Share what you know. Find your people."
        action={
          <Button
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
          >
            <Plus size={16} />
            Ask a question
          </Button>
        }
      />
      <div className="community-banner">
        <div className="mini-icon purple">
          <Users size={23} />
        </div>
        <div>
          <h3>Human perspective. A little AI help.</h3>
          <p>
            AI explanations get you started. Community answers take you further. Faculty
            verification adds another layer of review.
          </p>
        </div>
        <span className="pill green">
          <ShieldCheck size={13} />
          Learn with confidence
        </span>
      </div>
      <div className="community-layout">
        <aside className="community-filters">
          <h3>Explore topics</h3>
          <button
            className={!category && !bookmarked ? 'active' : ''}
            onClick={() => {
              setCategory('');
              setBookmarked(false);
              setPage(0);
            }}
          >
            <MessageCircle size={16} />
            All discussions
          </button>
          <button
            className={bookmarked ? 'active' : ''}
            onClick={() => {
              setBookmarked(!bookmarked);
              setPage(0);
            }}
          >
            <Bookmark size={16} />
            Saved questions
          </button>
          <div className="filter-divider" />
          {categories.data?.map((c) => (
            <button
              className={category === c.name ? 'active' : ''}
              key={c.name}
              onClick={() => {
                setCategory(c.name);
                setPage(0);
              }}
            >
              <span className="category-hash">#</span>
              {c.name}
            </button>
          ))}
        </aside>
        <div>
          <div className="community-toolbar">
            <form
              className="input-icon"
              onSubmit={(e) => {
                e.preventDefault();
                setParams(search ? { q: search } : {});
                setPage(0);
              }}
            >
              <Search size={18} />
              <input
                placeholder="Search questions, concepts, and ideas…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search community"
              />
              <button type="submit">Search</button>
            </form>
            <select
              aria-label="Sort questions"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="recent">Newest first</option>
              <option value="popular">Most discussed</option>
              <option value="unanswered">Fewest answers</option>
            </select>
          </div>
          {q.isLoading ? (
            <Loading />
          ) : q.error ? (
            <ErrorState error={q.error} retry={() => q.refetch()} />
          ) : (
            <>
              <div className="results-meta">
                <span>{q.data?.total || 0} conversations</span>
                {params.get('q') && (
                  <span>
                    {q.data?.mode === 'semantic' ? 'Semantic similarity' : 'Related keyword search'}{' '}
                    · “{params.get('q')}”
                  </span>
                )}
              </div>
              <div className="question-list">
                {q.data?.items.length ? (
                  q.data.items.map((question: Question) => (
                    <Card key={question.id}>
                      <div className="question-topline">
                        <span className="pill purple">{question.category}</span>
                        {question.verified_count > 0 && (
                          <span className="verified-label">
                            <ShieldCheck size={13} />
                            Faculty verified answer
                          </span>
                        )}
                      </div>
                      <Link to={'/app/community/' + question.id}>
                        <h2>{question.title}</h2>
                      </Link>
                      <p className="question-excerpt">{question.body}</p>
                      <div className="question-bottom">
                        <span className="avatar tiny">{initials(question.name)}</span>
                        <span>{question.name}</span>
                        <span className="muted">· {date(question.created_at)}</span>
                        <Link to={'/app/community/' + question.id}>
                          <MessageCircle size={15} />
                          {question.answer_count} answers
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <Empty
                      title="A good question could start something."
                      description="No discussions match this view yet. Try another search or ask the first question."
                      action={
                        <Button onClick={() => setOpen(true)}>
                          <Plus size={15} />
                          Ask a question
                        </Button>
                      }
                    />
                  </Card>
                )}
              </div>
              <div className="pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span>Page {page + 1}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(page + 1) * 12 >= (q.data?.total || 0)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Good questions start great conversations."
        description="Be specific, share what you’ve tried, and help others understand your question."
      >
        <form onSubmit={ask} className="stack">
          {!!error && <ErrorState error={error} />}
          <label>
            Your question
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSuggestion('');
                setOriginal('');
              }}
              required
              maxLength={250}
              placeholder="What would you like to understand?"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={enhance}
            disabled={busy || !title.trim()}
          >
            <Sparkles size={14} />
            Improve question
          </Button>
          {suggestion && (
            <div className="suggestion-preview">
              <AILabel />
              <p>{suggestion}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOriginal(title);
                  setTitle(suggestion);
                  setSuggestion('');
                }}
              >
                Use suggestion
              </Button>
              <small className="muted">Your original question will be preserved.</small>
            </div>
          )}
          <label>
            A little more context
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={20000}
              rows={5}
              placeholder="What have you tried? Where are you getting stuck?"
            />
          </label>
          <label>
            Topic
            <select value={askCategory} onChange={(e) => setAskCategory(e.target.value)}>
              {categories.data?.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? 'Working on it…' : 'Post question'}
            <ArrowRight size={15} />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
export function QuestionDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const q = useQuery({
    queryKey: ['question', id],
    queryFn: () => api<Data>('/community/questions/' + id),
  });
  const [answer, setAnswer] = useState(''),
    [comment, setComment] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState<unknown>(null),
    [report, setReport] = useState<{ id: string; type: string } | null>(null);
  const client = useQueryClient();
  async function action(path: string, body?: unknown) {
    setBusy(path);
    setError(null);
    try {
      await post(path, body);
      await q.refetch();
      client.invalidateQueries({ queryKey: ['me'] });
      client.invalidateQueries({ queryKey: ['questions'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy('');
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const question = q.data;
  return (
    <>
      <Link to="/app/community" className="back-link">
        ← Back to the community
      </Link>
      <Card className="question-detail">
        <div className="question-topline">
          <span className="pill purple">{question.category}</span>
          <div className="button-row">
            <Button
              variant="ghost"
              size="sm"
              disabled={!!busy}
              onClick={() => action('/community/questions/' + id + '/bookmark')}
            >
              <Bookmark size={16} fill={question.bookmarked ? 'currentColor' : 'none'} />
              {question.bookmarked ? 'Saved' : 'Save'}
            </Button>
            <button
              className="icon-button"
              aria-label="Report question"
              onClick={() => setReport({ id: question.id, type: 'question' })}
            >
              <Flag size={16} />
            </button>
          </div>
        </div>
        <h1>{question.title}</h1>
        <div className="author-line">
          <span className="avatar tiny">{initials(question.name)}</span>
          <strong>{question.name}</strong>
          <span>{date(question.created_at)}</span>
        </div>
        <p className="pre-wrap">{question.body}</p>
        {question.original_title !== question.title && (
          <details className="extracted-text">
            <summary>View the original question</summary>
            <p>{question.original_title}</p>
          </details>
        )}
      </Card>
      {!!error && <ErrorState error={error} />}
      <Card className="ai-explanation">
        <div className="section-title">
          <div>
            <h2>
              <Sparkles size={19} />A place to start
            </h2>
            <AILabel />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!!busy}
            onClick={() => action('/community/questions/' + id + '/explain')}
          >
            <Sparkles size={14} />
            {busy.endsWith('/explain')
              ? 'Thinking…'
              : question.ai_explanation
                ? 'Refresh explanation'
                : 'Ask AI to explain'}
          </Button>
        </div>
        {question.ai_explanation ? (
          <p className="pre-wrap">{question.ai_explanation}</p>
        ) : (
          <p>Get an initial explanation, then explore the community’s perspectives below.</p>
        )}
        <small>
          AI explanations can be incomplete. Faculty verification applies to human answers below.
        </small>
      </Card>
      <div className="section-title answers-title">
        <h2>{question.answers.length} community answers</h2>
        <span className="muted">Different perspectives. Shared progress.</span>
      </div>
      <div className="stack">
        {question.answers.map((a: Data) => (
          <Card className="answer-card" key={a.id}>
            <div className="vote-controls">
              <button
                aria-label="Upvote answer"
                disabled={!!busy || a.user_id === user.id}
                className={a.my_vote === 1 ? 'active' : ''}
                onClick={() =>
                  action('/community/answers/' + a.id + '/vote', { value: a.my_vote === 1 ? 0 : 1 })
                }
              >
                <ArrowUp size={18} />
              </button>
              <strong>{a.votes}</strong>
              <button
                aria-label="Downvote answer"
                disabled={!!busy || a.user_id === user.id}
                className={a.my_vote === -1 ? 'active' : ''}
                onClick={() =>
                  action('/community/answers/' + a.id + '/vote', {
                    value: a.my_vote === -1 ? 0 : -1,
                  })
                }
              >
                <ArrowDown size={18} />
              </button>
            </div>
            <div className="answer-body">
              <div className="author-line">
                <span className="avatar tiny">{initials(a.name)}</span>
                <strong>{a.name}</strong>
                {a.role === 'FACULTY' && <span className="pill blue">Faculty</span>}
                <span>{date(a.created_at)}</span>
              </div>
              {a.verified_by && (
                <div className="verified-banner">
                  <ShieldCheck size={16} />
                  <strong>Faculty Verified</strong>
                  <span>by {a.verifier}</span>
                </div>
              )}
              <p className="pre-wrap">{a.body}</p>
              <div className="button-row">
                {a.accepted ? (
                  <span className="verified-label">
                    <Check size={14} />
                    Marked helpful
                  </span>
                ) : (
                  question.user_id === user.id &&
                  a.user_id !== user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => action('/community/answers/' + a.id + '/helpful')}
                    >
                      <Check size={14} />
                      Mark helpful
                    </Button>
                  )
                )}
                {['FACULTY', 'ADMIN'].includes(user.role) &&
                  a.user_id !== user.id &&
                  !a.verified_by && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => action('/community/answers/' + a.id + '/verify')}
                    >
                      <ShieldCheck size={15} />
                      Verify answer
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReport({ id: a.id, type: 'answer' })}
                >
                  <Flag size={13} />
                  Report
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="answer-composer">
        <h2>Share what you know.</h2>
        <p className="muted">A clear explanation can make someone’s day.</p>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await action('/community/answers', { questionId: id, body: answer })) setAnswer('');
          }}
        >
          <textarea
            aria-label="Your answer"
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            maxLength={20000}
            placeholder="Walk through your thinking, add an example, or share a helpful perspective…"
          />
          <Button disabled={!!busy} type="submit">
            <Send size={15} />
            Post answer
          </Button>
        </form>
      </Card>
      <Card className="comments-card">
        <h2>Discussion</h2>
        {question.comments.map((c: Data) => (
          <p key={c.id}>
            <strong>{c.name}</strong>
            <span>{c.body}</span>
          </p>
        ))}
        <form
          className="comment-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await action('/community/questions/' + id + '/comments', { text: comment }))
              setComment('');
          }}
        >
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            maxLength={2000}
            placeholder="Add a comment…"
            aria-label="Your comment"
          />
          <Button disabled={!!busy} type="submit" variant="secondary">
            Comment
          </Button>
        </form>
      </Card>
      <Dialog
        open={!!report}
        onOpenChange={(v) => !v && setReport(null)}
        title="Help keep this space useful."
        description="Reports go to an administrator for review. A report alone never changes someone’s reputation."
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get('reason');
            if (
              await action('/community/reports', {
                targetId: report?.id,
                targetType: report?.type,
                reason,
              })
            ) {
              setReport(null);
              toast.success('Report submitted for review.');
            }
          }}
        >
          <label>
            What should we review?
            <textarea name="reason" rows={4} required maxLength={1000} />
          </label>
          <Button disabled={!!busy} type="submit">
            Submit report
            <Flag size={14} />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
