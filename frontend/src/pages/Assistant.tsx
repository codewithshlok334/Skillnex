import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, Send, MessageSquare, Copy, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';
import { assistantPost } from '../api/assistantRequest';
import { useConfig } from '../hooks/useSession';
import { PageTitle, Card, Loading, ErrorState } from '../components/Common';
import { Button } from '../components/ui/button';
import { ChatReply } from '../components/ChatReply';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type Thread = { id: string; title: string; messages: ChatMessage[] };
const starters = [
  ['Ask anything', 'Explain why the sky looks blue in simple Hinglish.'],
  ['Coding help', 'Explain JavaScript promises with a small code example.'],
  ['Write something', 'Help me write a polite email requesting an assignment deadline extension.'],
  ['Study a topic', 'Explain photosynthesis simply, then give me a short quiz.'],
  [
    'Interview prep',
    'Help me prepare for a software developer interview. Ask me about my experience first.',
  ],
  [
    'Resume help',
    'Mere resume ke project bullet points improve karne mein help karo. Mujhse project details poochho.',
  ],
  [
    'Learn a concept',
    'Explain database indexes with a simple example, then give me a practice question.',
  ],
  [
    'Plan my next step',
    'Help me choose a realistic learning goal for this week. Ask about my interests and time.',
  ],
];

export function Assistant({
  compact = false,
  active = true,
}: {
  compact?: boolean;
  active?: boolean;
}) {
  const config = useConfig();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [quickChat, setQuickChat] = useState<string | null>(null);
  const id = compact ? quickChat : params.get('chat');
  const threads = useQuery({
    queryKey: ['assistant-threads'],
    queryFn: () => api<Thread[]>('/assistant/threads'),
    enabled: !compact,
  });
  const chat = useQuery({
    queryKey: ['assistant-chat', id],
    queryFn: () => api<Thread>('/assistant/threads/' + id),
    enabled: !!id && active,
  });
  const [text, setText] = useState('');
  const [includeProfile, setIncludeProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [pending, setPending] = useState('');
  const available = config.data?.aiAvailable === true;

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setWaitingSeconds(0);
    const timer = window.setInterval(
      () => setWaitingSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (active && (chat.data?.messages.length || busy))
      end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.data?.messages.length, busy, active]);

  function selectChat(next?: string) {
    if (sending.current) return;
    if (compact) setQuickChat(next || null);
    else setParams(next ? { chat: next } : {});
    setText('');
    setCopied('');
    setError(null);
    request.current = null;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || sending.current || !available || chat.error || (!!id && chat.isLoading))
      return;
    sending.current = true;
    setPending(text.trim());
    setBusy(true);
    setError(null);
    try {
      controller.current = new AbortController();
      const signal = controller.current.signal;
      const threadId =
        id || (await assistantPost<{ id: string }>('/assistant/threads', undefined, signal)).id;
      if (!id) {
        if (compact) setQuickChat(threadId);
        else setParams({ chat: threadId });
      }
      const signature = JSON.stringify([threadId, text.trim(), includeProfile]);
      if (request.current?.signature !== signature)
        request.current = { signature, id: crypto.randomUUID() };
      const result = await assistantPost<Thread>(
        '/assistant/threads/' + threadId + '/messages',
        {
          text: text.trim(),
          requestId: request.current.id,
          includeProfile,
        },
        signal,
      );
      await client.cancelQueries({ queryKey: ['assistant-chat', threadId] });
      client.setQueryData(['assistant-chat', threadId], result);
      client.invalidateQueries({ queryKey: ['assistant-threads'] });
      setText('');
      request.current = null;
    } catch (e) {
      setError(e);
    } finally {
      sending.current = false;
      controller.current = null;
      setPending('');
      setBusy(false);
    }
  }

  return (
    <div className={compact ? 'assistant-compact' : 'assistant-full'}>
      {!compact && (
        <PageTitle
          eyebrow="YOUR EVERYDAY AI COMPANION"
          title="Ask a question. Explore an idea."
          description="Coding, studies, writing, general knowledge, or your next career step. Ask in English, Hindi, or Hinglish."
          action={
            <Button variant="secondary" disabled={busy} onClick={() => selectChat()}>
              <Plus size={16} />
              New chat
            </Button>
          }
        />
      )}
      <div className="assistant-layout">
        {!compact && (
          <Card className="assistant-history">
            <h2>
              <MessageSquare size={17} />
              Your conversations
            </h2>
            <p className="small muted">
              Your latest 100 chats. Each reply remembers the last 6 exchanges.
            </p>
            {threads.isLoading ? (
              <Loading />
            ) : threads.error ? (
              <ErrorState error={threads.error} retry={() => threads.refetch()} />
            ) : threads.data?.length ? (
              <nav aria-label="Chat history">
                {threads.data.map((thread) => (
                  <button
                    disabled={busy}
                    className={id === thread.id ? 'selected' : ''}
                    key={thread.id}
                    onClick={() => selectChat(thread.id)}
                  >
                    <MessageSquare size={14} />
                    <span>{thread.title}</span>
                  </button>
                ))}
              </nav>
            ) : (
              <p className="small muted">
                Your conversations will appear here after you start chatting.
              </p>
            )}
            <div className="assistant-shortcuts">
              <Link to="/app/resumes">
                Resume analyzer <ArrowRight size={14} />
              </Link>
              <Link to="/app/interviews">
                Practice interviews <ArrowRight size={14} />
              </Link>
              <Link to="/app/roadmap">
                Career roadmap <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        )}
        <Card className="assistant-chat">
          {!compact && (
            <div className="assistant-chat-header">
              <span className="mini-icon purple">
                <Sparkles size={20} />
              </span>
              <div>
                <h2>SkillNex Assistant</h2>
                <span className="small muted">
                  {available
                    ? 'AI provider configured · Review important advice'
                    : 'Waiting for AI connection'}
                </span>
              </div>
            </div>
          )}
          {compact && (
            <div className="assistant-quick-actions">
              <span className="small muted">
                {available ? 'Ask in English, Hindi or Hinglish' : 'Waiting for AI connection'}
              </span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => selectChat()}>
                <Plus size={14} />
                New
              </Button>
              <Button size="sm" variant="ghost" asChild disabled={busy}>
                <Link
                  aria-disabled={busy}
                  onClick={(e) => {
                    if (busy) e.preventDefault();
                  }}
                  to={'/app/assistant' + (id ? '?chat=' + encodeURIComponent(id) : '')}
                >
                  History <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          )}
          {!available && !config.isLoading && !config.error && (
            <div className="assistant-setup" role="status">
              <strong>Connect your AI provider to start chatting</strong>
              <p>
                The chat is ready. Live replies need an AI provider connection. Your message will
                stay here while you set it up.
              </p>
              <details>
                <summary>Local setup in VS Code</summary>
                <ol>
                  <li>
                    Open <code>backend/config/ai.properties.example</code> and save a copy as{' '}
                    <code>ai.properties</code> in the same folder.
                  </li>
                  <li>Enter your provider URL, model, and API key in that local file.</li>
                  <li>Restart the backend, then check the connection below.</li>
                </ol>
                <p>Never put your API key in this chat or in frontend code.</p>
              </details>
              <Button
                size="sm"
                variant="secondary"
                disabled={config.isFetching}
                onClick={() => config.refetch()}
              >
                Check connection
              </Button>
            </div>
          )}
          {config.error && <ErrorState error={config.error} retry={() => config.refetch()} />}
          <div
            className="assistant-messages"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            aria-busy={busy}
          >
            {id && chat.isLoading ? (
              <Loading />
            ) : chat.error ? (
              <ErrorState error={chat.error} retry={() => chat.refetch()} />
            ) : chat.data?.messages.length ? (
              chat.data.messages.map((message) => (
                <article key={message.id} className={'chat-message ' + message.role}>
                  <div className="chat-message-label">
                    {message.role === 'assistant' ? <Sparkles size={14} /> : null}
                    {message.role === 'assistant' ? 'SkillNex · AI' : 'You'}
                  </div>
                  <div className="chat-message-content">
                    {message.role === 'assistant' ? (
                      <ChatReply content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.role === 'assistant' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Copy assistant reply"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message.content);
                          setCopied(message.id);
                        } catch {
                          toast.error('Copy unavailable. You can select and copy the text.');
                        }
                      }}
                    >
                      {copied === message.id ? <Check size={13} /> : <Copy size={13} />}
                      {copied === message.id ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </article>
              ))
            ) : busy ? null : (
              <div className="assistant-welcome">
                <div className="ai-orb">
                  <Sparkles size={32} />
                </div>
                <h2>What’s on your mind?</h2>
                <p className="muted">Ask a question, solve a doubt, or create something.</p>
                <div className="assistant-starters">
                  {(compact ? starters.slice(0, 4) : starters).map(([label, prompt]) => (
                    <button key={label} disabled={busy} onClick={() => setText(prompt)}>
                      <strong>{label}</strong>
                      <span>{prompt}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {busy && (
              <>
                <article className="chat-message user">
                  <div className="chat-message-label">You · Sending</div>
                  <div className="chat-message-content">{pending}</div>
                </article>
                <div className="assistant-wait-actions">
                  <div className="assistant-thinking" role="status">
                    <Sparkles size={16} />
                    Waiting for your reply… {waitingSeconds}s
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => controller.current?.abort()}
                  >
                    Stop waiting
                  </Button>
                </div>
                {waitingSeconds >= 10 && (
                  <p className="assistant-slow-note">
                    The AI provider is taking longer than usual. You can minimize this chat while
                    waiting.
                  </p>
                )}
              </>
            )}
            <div ref={end} />
          </div>
          {!!error && <ErrorState error={error} />}
          <form className="assistant-composer" onSubmit={send}>
            <label htmlFor={compact ? 'quick-assistant-message' : 'assistant-message'}>
              Your message
            </label>
            <textarea
              id={compact ? 'quick-assistant-message' : 'assistant-message'}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              rows={compact ? 2 : 3}
              placeholder="Ask anything — coding, studies, writing, or everyday questions…"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="assistant-compose-actions">
              <label className="assistant-profile">
                <input
                  type="checkbox"
                  checked={includeProfile}
                  disabled={busy}
                  onChange={(e) => setIncludeProfile(e.target.checked)}
                />
                Include my career profile
              </label>
              <span className="small muted">{text.length}/4,000</span>
              <Button
                type="submit"
                disabled={
                  busy || !available || !text.trim() || !!chat.error || (!!id && chat.isLoading)
                }
              >
                <Send size={15} />
                {busy ? 'Sending…' : 'Send message'}
              </Button>
            </div>
            <p className="small muted">
              Enter to send · Shift+Enter for a new line. Messages go to your configured AI
              provider.
              {includeProfile && ' Your course, branch, goal, skills and projects are included.'} AI
              can make mistakes and has no live web search. Verify important details.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
