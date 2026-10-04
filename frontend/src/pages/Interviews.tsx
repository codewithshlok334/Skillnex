import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Plus,
  CalendarDays,
  Clock,
  ArrowRight,
  Play,
  Check,
  Volume2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api, post, put } from "../api/client";
import type { Data, Interview } from "../types";
import {
  PageTitle,
  Card,
  Loading,
  Empty,
  ErrorState,
  AILabel,
  ScoreRing,
  Progress,
} from "../components/Common";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { date, timestamp } from "../utils/cn";
import { InterviewExperience } from "../components/InterviewExperience";
import { InterviewReportView } from "../components/InterviewReportView";
import "../interactive-interview.css";
import { interviewRoles as roles } from "../data/interviewRoles";
export function Interviews() {
  const q = useQuery({
    queryKey: ["interviews"],
    queryFn: () => api<Interview[]>("/interviews"),
  });
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Interview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [tab, setTab] = useState("Upcoming"),
    [cancel, setCancel] = useState<string | null>(null);
  const client = useQueryClient(),
    navigate = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const scheduledAt = form.scheduledAt
      ? new Date(String(form.scheduledAt)).toISOString()
      : null;
    const body = { ...form, duration: Number(form.duration), scheduledAt };
    setBusy(true);
    setError(null);
    try {
      const result = editing
        ? await put("/interviews/" + editing.id, body)
        : await post("/interviews", body);
      client.invalidateQueries({ queryKey: ["interviews"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success(
        editing
          ? "Interview rescheduled."
          : scheduledAt
            ? "Practice time is on the calendar."
            : "Your practice room is ready.",
      );
      if (!scheduledAt && !editing) navigate("/app/interviews/" + result.id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const filtered = q.data?.filter((i) =>
    tab === "Upcoming"
      ? ["SCHEDULED", "ACTIVE"].includes(i.status)
      : tab === "Completed"
        ? i.status === "COMPLETED"
        : i.status === "CANCELLED",
  );
  function calendar(i: Interview) {
    const start = new Date(timestamp(i.scheduled_at)),
      end = new Date(start.getTime() + i.duration * 60000);
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const text = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SkillNex//Interview//EN",
      "BEGIN:VEVENT",
      "UID:" + i.id + "@careerx",
      "DTSTAMP:" + fmt(new Date()),
      "DTSTART:" + fmt(start),
      "DTEND:" + fmt(end),
      "SUMMARY:SkillNex " + i.role.replace(/[,;\n]/g, " "),
      "DESCRIPTION:Practice interview in your SkillNex workspace",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:SkillNex interview reminder",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/calendar" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillnex-interview.ics";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageTitle
        eyebrow="PRACTICE MAKES PROGRESS"
        title="Confidence starts with a conversation."
        description="A thoughtful place to practice, reflect, and get better."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
              setError(null);
            }}
          >
            <Plus size={16} />
            Schedule interview
          </Button>
        }
      />
      <section className="interview-banner">
        <div>
          <span className="eyebrow">YOUR PRACTICE ROOM IS OPEN</span>
          <h2>
            The next interview doesn’t
            <br />
            have to be your first try.
          </h2>
          <p>Adaptive questions. Honest feedback. Space to find your voice.</p>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Mic size={16} />
            Start a practice session
            <ArrowRight size={15} />
          </Button>
        </div>
        <div className="mic-art">
          <div />
          <div />
          <span>
            <Mic size={52} strokeWidth={1.3} />
          </span>
        </div>
      </section>
      <div className="tabs">
        {["Upcoming", "Completed", "Cancelled"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
            <span>
              {q.data?.filter((i) =>
                t === "Upcoming"
                  ? ["SCHEDULED", "ACTIVE"].includes(i.status)
                  : i.status === t.toUpperCase(),
              ).length || 0}
            </span>
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : filtered?.length ? (
        <div className="interview-grid">
          {filtered.map((i) => (
            <Card key={i.id}>
              <div className="section-title">
                <span className="mini-icon purple">
                  <Mic size={20} />
                </span>
                <span
                  className={
                    "pill " + (i.status === "COMPLETED" ? "green" : "blue")
                  }
                >
                  {i.status.toLowerCase()}
                </span>
              </div>
              <h2>{i.role}</h2>
              <p className="muted">
                {i.kind} interview · {i.difficulty}
              </p>
              <div className="interview-meta">
                <span>
                  <CalendarDays size={15} />
                  {date(i.scheduled_at, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  <Clock size={15} />
                  {i.duration} min
                </span>
              </div>
              <Button asChild variant="secondary">
                <Link to={"/app/interviews/" + i.id}>
                  {i.status === "COMPLETED"
                    ? "View report"
                    : i.status === "CANCELLED"
                      ? "View session"
                      : "Enter practice room"}
                  <ArrowRight size={15} />
                </Link>
              </Button>
              {i.status === "SCHEDULED" && (
                <div className="button-row">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(i);
                      setOpen(true);
                    }}
                  >
                    Reschedule
                  </Button>
                  {i.scheduled_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => calendar(i)}
                    >
                      Calendar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancel(i.id)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            title={
              tab === "Completed"
                ? "Your next conversation could be a breakthrough."
                : "A little space for practice."
            }
            description={
              tab === "Completed"
                ? "Completed interviews and their feedback will appear here."
                : "Schedule an interview or start one whenever you’re ready."
            }
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus size={15} />
                Plan some practice
              </Button>
            }
          />
        </Card>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          editing ? "Make time for your next step" : "Set up your practice room"
        }
        description="35 career tracks. Start with an introduction, then build from easy questions to harder scenarios."
      >
        <form onSubmit={submit} className="stack">
          {!!error && <ErrorState error={error} />}
          <label>
            Target role
            <select
              name="role"
              required
              defaultValue={editing?.role || "Full Stack Developer"}
            >
              {editing && !roles.some((role) => role === editing.role) && (
                <option value={editing.role}>{editing.role}</option>
              )}
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Interview type
              <select name="kind" defaultValue={editing?.kind || "Technical"}>
                {["HR", "Technical", "Behavioral", "Coding", "Mixed"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Experience level
              <select
                name="difficulty"
                defaultValue={editing?.difficulty || "Medium"}
              >
                {["Easy", "Medium", "Hard"].map((v) => (
                  <option key={v} value={v}>
                    {v === "Easy"
                      ? "Entry level"
                      : v === "Medium"
                        ? "Intermediate"
                        : "Advanced"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date & time <span className="muted">optional</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                defaultValue={
                  editing?.scheduled_at
                    ? new Date(
                        timestamp(editing.scheduled_at) -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </label>
            <label>
              Duration
              <select name="duration" defaultValue={editing?.duration || 30}>
                {[5, 10, 15, 20, 30, 45, 60].map((v) => (
                  <option value={v} key={v}>
                    {v} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="small muted">
            Every new interview follows Introduction → Easy → Medium → Hard →
            Closing. Experience level adjusts the depth of AI follow-ups. Main
            questions come from the selected role's question bank.
          </p>
          <p className="small muted">
            Leave the date empty to practice now. Scheduled sessions get an
            in-app reminder; download a calendar event for device reminders.
          </p>
          <Button disabled={busy} type="submit">
            {busy
              ? "Preparing…"
              : editing
                ? "Save changes"
                : "Create practice session"}
            <ArrowRight size={15} />
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!cancel}
        onOpenChange={(v) => !v && setCancel(null)}
        title="Cancel this practice session?"
        description="You can schedule another whenever you’re ready."
      >
        <div className="button-row">
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await api("/interviews/" + cancel, { method: "DELETE" });
                client.invalidateQueries({ queryKey: ["interviews"] });
                client.invalidateQueries({ queryKey: ["dashboard"] });
                setCancel(null);
                toast.success("Interview cancelled.");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Cancel session
          </Button>
          <Button variant="secondary" onClick={() => setCancel(null)}>
            Keep practicing
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function InterviewRoom() {
  const { id } = useParams();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api<Data>("/interviews/" + id),
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [confirm, setConfirm] = useState(false);
  const [interviewer, setInterviewer] = useState("female");
  const actionPending = useRef(false);
  async function action(path: string, data?: unknown) {
    if (actionPending.current) return false;
    actionPending.current = true;
    setBusy(
      path === "report"
        ? "Preparing your session review…"
        : path === "next"
          ? "Preparing your next question…"
          : path.startsWith("start")
            ? "Your interviewer is getting ready…"
            : "Saving your progress…",
    );
    setError(null);
    try {
      const result = await post("/interviews/" + id + "/" + path, data);
      if (path === "report") await q.refetch();
      else client.setQueryData(["interview", id], result);
      client.invalidateQueries({ queryKey: ["interviews"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      actionPending.current = false;
      setBusy("");
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const interview = q.data,
    transcript = interview.transcript || [],
    report = interview.report,
    practice = interview.mode === "PRACTICE",
    aiUnavailable = !interview.aiAvailable;
  return (
    <>
      <PageTitle
        eyebrow="YOUR PRACTICE ROOM"
        title={interview.role + " interview"}
        description={
          interview.kind +
          " · " +
          interview.difficulty +
          " · " +
          interview.duration +
          " minutes"
        }
        action={
          <Button asChild variant="secondary">
            <Link to="/app/interviews">Back to interviews</Link>
          </Button>
        }
      />
      {!!error && <ErrorState error={error} />}
      {busy && interview.status !== "ACTIVE" && <Loading text={busy} />}
      {practice && interview.status !== "SCHEDULED" && (
        <Card>
          <span className="pill purple">Guided practice · No AI</span>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Curated questions for your role and difficulty. Your answers are
            saved for self-review; this mode does not generate AI scores or
            adaptive follow-ups.
          </p>
        </Card>
      )}
      {interview.status === "SCHEDULED" ? (
        <Card className="interview-lobby">
          <div className="interview-lobby-avatar">
            <div className="studio-lobby-symbol">
              <Mic size={48} />
            </div>
            <h2>Interview studio</h2>
            <p>Your role. Your answers. A progressively deeper conversation.</p>
            <div className="studio-lobby-tags">
              <span>{interview.kind}</span>
              <span>{interview.difficulty}</span>
              <span>{interview.duration} minutes</span>
            </div>
            {interview.curriculum_version === "ROLE_V1" && (
              <p className="small">Intro → Easy → Medium → Hard → Review</p>
            )}
          </div>
          <div className="interview-lobby-copy">
            <span className="pill purple">YOUR INTERVIEW ROOM IS READY</span>
            <h2>A real conversation. Room to practice.</h2>
            <p>
              Your interviewer listens to your answer, explores your decisions,
              and asks relevant follow-ups. Connect live voice and speak naturally,
              or use text to review your answer before sending.
            </p>
            <div className="interview-lobby-steps">
              <div>
                <Volume2 size={19} />
                <span>
                  <strong>Listen to your interviewer</strong>
                  <small>
                    Questions are spoken aloud, with readable captions.
                  </small>
                </span>
              </div>
              <div>
                <Mic size={19} />
                <span>
                  <strong>Speak or type your answer</strong>
                  <small>
                    Choose Start voice interview, allow your mic, and say hello to test it.
                  </small>
                </span>
              </div>
              <div>
                <ArrowRight size={19} />
                <span>
                  <strong>Keep the conversation going</strong>
                  <small>
                    In live voice, your answer is saved automatically. You can interrupt the interviewer at any time.
                  </small>
                </span>
              </div>
            </div>
            {aiUnavailable && (
              <p className="interview-input-notice">
                AI is not connected yet. Guided practice uses curated questions
                and the same speaking avatar, without AI scoring.
              </p>
            )}
            <label className="field">
              Choose your interviewer
              <select
                aria-label="Choose your interviewer"
                value={interviewer}
                onChange={(event) => setInterviewer(event.target.value)}
                disabled={!!busy}
              >
                <option value="female">Female · Maya</option>
                <option value="male">Male · Aarav</option>
              </select>
              <small className="muted">
                Your interviewer is locked once the interview starts.
              </small>
            </label>
            <div className="button-row">
              {!aiUnavailable && (
                <Button
                  onClick={() => action("start?interviewer=" + interviewer)}
                  disabled={!!busy}
                >
                  <Play size={16} />
                  Start AI interview
                </Button>
              )}
              <Button
                variant={aiUnavailable ? "default" : "secondary"}
                onClick={() =>
                  action("start?mode=PRACTICE&interviewer=" + interviewer)
                }
                disabled={!!busy}
              >
                <Play size={16} />
                Start guided practice
              </Button>
            </div>
            <small className="muted">
              AI interviews use Gemini Live voice with a text fallback. Camera
              is optional: a local self-preview only, never uploaded, recorded
              or scored. Coding answers are reviewed, not executed.
            </small>
          </div>
        </Card>
      ) : interview.status === "ACTIVE" ? (
        <InterviewExperience
          key={id}
          interview={interview}
          busy={busy}
          action={action}
          onEnd={() => setConfirm(true)}
        />
      ) : interview.status === "COMPLETED" ? (
        report ? (
          <InterviewReportView interview={interview} />
        ) : (
          <Card>
            <Empty
              title="You showed up. That matters."
              description={
                practice
                  ? "Your answers are saved. Open your conversation and self-review checklist."
                  : "Your answers are saved. Generate your feedback when you’re ready."
              }
              action={
                <Button onClick={() => action("report")} disabled={!!busy}>
                  <Sparkles size={16} />
                  {practice
                    ? "Open practice review"
                    : "Generate interview report"}
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <Card>
          <Empty
            title="This session was cancelled."
            description="There’s always room for another practice conversation."
            action={
              <Button asChild>
                <Link to="/app/interviews">Plan another session</Link>
              </Button>
            }
          />
        </Card>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Ready to reflect?"
        description="Your saved answers will be kept. We will then prepare your AI feedback or guided-practice review."
      >
        <div className="button-row">
          <Button
            disabled={!!busy}
            onClick={async () => {
              if (await action("end")) {
                setConfirm(false);
                await action("report");
              }
            }}
          >
            Complete interview
            <Check size={15} />
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep practicing
          </Button>
        </div>
      </Dialog>
    </>
  );
}
