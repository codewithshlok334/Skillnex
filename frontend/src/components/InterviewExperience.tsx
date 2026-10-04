import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
  Keyboard,
  Sparkles,
  Maximize2,
  Minimize2,
  MessageSquare,
  ScrollText,
  PhoneOff,
} from "lucide-react";
import { createPortal } from "react-dom";
import { RecordedInterviewAnswer } from "./RecordedInterviewAnswer";
import { LiveInterviewControls, useLiveInterview } from "./LiveInterviewControls";
import { canUseRecordedFallback, startLiveDictation } from "../utils/interviewVoice";
import { toast } from "sonner";
import type { Data } from "../types";
import { Card } from "./Common";
import { Button } from "./ui/button";
import { InterviewCamera } from "./InterviewCamera";
import { AIInterviewerPortrait } from "./AIInterviewerPortrait";
import "../interactive-interview.css";
import { saveInterviewTurn } from "../utils/interviewFlow";
import { timestamp } from "../utils/cn";
import "../interview-experience.css";
import "../meeting-interview.css";
import "../female-interviewer.css";

type Props = {
  interview: Data;
  busy: string;
  action: (path: string, data?: unknown) => Promise<boolean>;
  onEnd: () => void;
};

export function InterviewExperience({ interview, busy, action, onEnd }: Props) {
  const transcript: Data[] = interview.transcript || [];
  const current = transcript[transcript.length - 1];
  const practice = interview.mode === "PRACTICE";
  const [liveMode, setLiveMode] = useState(!practice);
  const live = useLiveInterview(interview);
  const liveSpeaking = live.snapshot.state === "AI_SPEAKING";
  const liveListening = !["ENDED", "ERROR", "INITIALIZING", "CONNECTING"].includes(live.snapshot.state) && !live.snapshot.muted;
  const coding = interview.kind === "Coding";
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("JavaScript");
  const metrics = useRef({ speechSeconds: 0, spokenWords: 0, edited: false });
  const questionStarted = useRef(Date.now());
  const [interim, setInterim] = useState("");
  const [micStarting, setMicStarting] = useState(false);
  const [recordedVoice, setRecordedVoice] = useState(() => !!interview.audioTranscriptionAvailable);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordControls, setRecordControls] = useState<HTMLDivElement | null>(
    null,
  );
  const [mouthPulse, setMouthPulse] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceEnabled = useRef(voiceOn);
  voiceEnabled.current = voiceOn;
  const [spokenCaption, setSpokenCaption] = useState("");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const interviewerGender =
    interview.interviewer_gender === "male" ? "male" : "female";
  const [voiceError, setVoiceError] = useState("");
  const [micError, setMicError] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraControls, setCameraControls] = useState<HTMLDivElement | null>(
    null,
  );
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  const portalHost = useRef<HTMLDivElement>(null);
  const [portalNode] = useState(() => document.createElement("div"));
  useLayoutEffect(() => {
    const parent = expanded ? document.body : portalHost.current;
    parent?.appendChild(portalNode);
    return () => {
      portalNode.remove();
    };
  }, [expanded, portalNode]);
  const remaining = Math.max(0, interview.duration * 60 - elapsed);
  const last =
    !!interview.canFinishAfterAnswer ||
    transcript.length >= interview.questionLimit ||
    remaining === 0;
  const answered = transcript.filter((t) => t.answer).length;
  useEffect(() => {
    metrics.current = { speechSeconds: 0, spokenWords: 0, edited: false };
    questionStarted.current = Date.now();
    setDraft("");
    setCode("");
    setMicError("");
  }, [current?.id]);
  const recognition = useRef<ReturnType<typeof startLiveDictation> | null>(
    null,
  );
  const speechId = useRef(0);
  const heard = useRef("");
  const mounted = useRef(true);
  const submittingRef = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const locked = !!busy || submitting || recordBusy;
  const speechSupported =
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  const micSupported = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
  useEffect(() => {
    if (!speechSupported) return;
    const updateVoices = () =>
      setAvailableVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, [speechSupported]);

  const stopSpeech = useCallback(() => {
    speechId.current++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSpokenCaption("");
  }, []);

  const say = useCallback(
    (question: string, queue = false) => {
      if (!question || !speechSupported) return;
      if (!queue) stopSpeech();
      const token = speechId.current;
      const utterance = new SpeechSynthesisUtterance(question);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = (v: SpeechSynthesisVoice) =>
        interviewerGender === "female"
          ? /female|zira|heera|samantha|karen|moira|tessa|veena|serena/i.test(
              v.name,
            )
          : /\bmale\b|david|ravi|mark|daniel|alex|george|james/i.test(v.name);
      const voice =
        voices.find((v) => v.voiceURI === selectedVoice) ||
        voices.find((v) => v.lang === "en-IN" && preferredVoice(v)) ||
        voices.find((v) => v.lang.startsWith("en") && preferredVoice(v)) ||
        voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang.startsWith("en"));
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || "en-IN";
      utterance.rate = 0.96;
      const valid = () => mounted.current && speechId.current === token;
      utterance.onstart = () => {
        if (valid()) {
          setSpeaking(true);
          setMouthPulse(performance.now());
          setSpokenCaption(question);
          setVoiceError("");
        }
      };
      utterance.onboundary = () => {
        if (valid()) setMouthPulse(performance.now());
      };
      utterance.onpause = () => {
        if (valid()) setSpeaking(false);
      };
      utterance.onresume = () => {
        if (valid()) {
          setSpeaking(true);
          setMouthPulse(performance.now());
        }
      };
      utterance.onend = () => {
        if (valid()) {
          setSpeaking(false);
          setSpokenCaption("");
        }
      };
      utterance.onerror = (event) => {
        if (valid()) {
          setSpeaking(false);
          setSpokenCaption("");
          if (event.error !== "interrupted" && event.error !== "canceled")
            setVoiceError(
              "Voice could not start. Press Play question, or read the question below.",
            );
        }
      };
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setVoiceError("Voice is unavailable. You can read the question below.");
      }
    },
    [speechSupported, stopSpeech, selectedVoice, interviewerGender],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speechId.current++;
      recognition.current?.dispose();
      recognition.current = null;
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    const receivedAt = Date.now();
    const baseline = Number.isFinite(interview.elapsedSeconds)
      ? interview.elapsedSeconds
      : Math.max(
          0,
          Math.floor((receivedAt - timestamp(interview.started_at)) / 1000),
        );
    const update = () =>
      setElapsed(baseline + Math.floor((Date.now() - receivedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [interview.started_at, interview.elapsedSeconds]);

  useEffect(() => {
    if (
      liveMode || !current?.id ||
      current.answer ||
      !voiceOn ||
      listening ||
      !speechSupported ||
      heard.current === current.id
    )
      return;
    // Delay until after the effect commits so StrictMode cleanup cannot cancel the only reading.
    const timer = window.setTimeout(() => {
      heard.current = current.id;
      const transition = transcript.length > 1
        ? interview.progression?.turnKind === "FOLLOW_UP"
          ? "Let’s explore that a little further. "
          : "Your next question is: "
        : "";
      // Keep the acknowledgement audible even if the next question arrives quickly.
      say(transition + current.question, true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    liveMode,
    current?.id,
    current?.answer,
    current?.question,
    transcript.length,
    interview.progression?.turnKind,
    voiceOn,
    listening,
    speechSupported,
    say,
  ]);

  function stopListening() {
    recognition.current?.stop();
  }

  function startListening() {
    if (locked || listening || recognition.current || current?.answer) return;
    const Speech =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setShowAnswer(true);
    if (!Speech) {
      if (interview.audioTranscriptionAvailable) {
        setRecordedVoice(true);
        setMicError("Live dictation is unavailable here. Press Start mic, speak, then Stop & use answer. Your existing text is kept.");
        return;
      }
      setMicError(
        "This browser does not support live dictation. Recording also needs a configured Gemini backend. You can type your answer now.",
      );
      return;
    }
    stopSpeech();
    heard.current = current?.id;
    setMicError("");
    setInterim("");
    let ended = false;
    try {
      const controller = startLiveDictation(new Speech(), draft, language, {
        text: (value) => {
          if (mounted.current) {
            setDraft(value);
            textarea.current?.scrollIntoView({ block: "nearest" });
          }
        },
        state: (value) => {
          if (!mounted.current) return;
          setMicStarting(value === "starting");
          setListening(value !== "idle");
          if (value === "idle") {
            ended = true;
            recognition.current = null;
          }
        },
        error: (message, code) => {
          if (!mounted.current) return;
          if (canUseRecordedFallback(code) && interview.audioTranscriptionAvailable) {
            setRecordedVoice(true);
            setMicError("Live dictation is unavailable. Switched to the microphone: press Start mic, then Stop & use answer. Your existing text is kept.");
          } else {
            setMicError(message + (canUseRecordedFallback(code)
              ? " Recorded transcription needs a configured Gemini backend. You can continue typing."
              : ""));
          }
        },
        metrics: (seconds, words) => {
          metrics.current.speechSeconds += seconds;
          metrics.current.spokenWords += words;
        },
      });
      recognition.current = ended ? null : controller;
    } catch {
      setListening(false);
      setMicStarting(false);
      setMicError(
        "Live dictation could not start. Use the automatic microphone option if available, or type below.",
      );
    }
  }

  async function submit() {
    if (
      submittingRef.current ||
      recordBusy ||
      busy ||
      listening ||
      recognition.current ||
      !current ||
      (!draft.trim() && !code.trim())
    )
      return;
    submittingRef.current = true;
    setSubmitting(true);
    stopSpeech();
    try {
      const response = code.trim()
        ? [draft.trim(), "Code (" + codeLanguage + "):", code.trim()]
            .filter(Boolean)
            .join("\n\n")
        : draft;
      if (response.length > 15000) {
        toast.error(
          "Keep your combined answer and code under 15,000 characters.",
        );
        return;
      }
      const voice = metrics.current.spokenWords > 0;
      const result = await saveInterviewTurn(
        action,
        current.id,
        response,
        last,
        {
          inputMode: voice
            ? metrics.current.edited || code.trim()
              ? "MIXED"
              : "VOICE"
            : "TEXT",
          responseSeconds: Math.min(
            86400,
            Math.round((Date.now() - questionStarted.current) / 1000),
          ),
          speechSeconds: Math.min(86400, metrics.current.speechSeconds),
          spokenWords: Math.min(15000, metrics.current.spokenWords),
        },
        () => {
          if (mounted.current && voiceEnabled.current && !last) {
            const acknowledgements = [
              "Thank you for sharing that.",
              "Thanks for walking me through your answer.",
              "Thank you. Let’s keep going.",
            ];
            say(acknowledgements[(transcript.length - 1) % acknowledgements.length]);
          }
        },
      );
      if (["advanced", "finished", "followup-failed"].includes(result)) {
        setDraft("");
        setCode("");
      }
      if (result === "finished") onEnd();
      if (result === "followup-failed")
        toast.info("Your answer is saved. Retry the next question when ready.");
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  function endSession() {
    if (liveMode) {
      if (live.snapshot.pending) return;
      if (live.snapshot.input.trim()) {
        toast.info("Your answer is still being heard. Wait for it to save, or choose Continue with Text to review and send it.");
        return;
      }
      live.stop();
      onEnd();
      return;
    }
    if ((draft.trim() || code.trim()) && !current?.answer) {
      toast.info(
        "Send your current answer before finishing, or clear the draft.",
      );
      return;
    }
    stopListening();
    stopSpeech();
    onEnd();
  }
  const state = liveMode ? (live.snapshot.state === "ENDED" ? "Ready" : live.snapshot.state.replaceAll("_", " ").toLowerCase()) : listening
    ? recordedVoice
      ? "Listening to your answer"
      : "Listening to your answer"
    : recordBusy
      ? "Turning speech into text"
      : locked
        ? "Preparing your next step"
        : listening
          ? "Listening to your answer"
          : speaking
            ? "Asking your question"
            : current?.answer
              ? "Answer saved"
              : "Your turn to answer";

  const room = (
    <div
      className={
        "voice-interview meeting-room" + (expanded ? " meeting-expanded" : "")
      }
    >
      <div className="interview-session-bar">
        <div
          className="meeting-person-choice"
          aria-label="Selected interviewer, locked for this session"
        >
          <strong>
            {interviewerGender === "female" ? "Maya" : "Aarav"} · Interviewer
          </strong>
          <small className="muted">Locked for this session</small>
        </div>
        <div className="meeting-title">
          <span className="meeting-live-dot" />
          <strong>{interview.role} interview</strong>
        </div>
        <span className="pill purple">
          <Sparkles size={13} />
          {practice
            ? "Guided practice · Curated questions"
            : "Adaptive AI interview"}
        </span>
        <span className="interview-session-time">
          <Clock size={15} />
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}{" "}
          <span>remaining</span>
        </span>
        <span className="small muted">
          {answered} answers saved · Question {transcript.length}
        </span>
      </div>
      <div
        className="studio-time-track"
        role="progressbar"
        aria-label="Interview time elapsed"
        aria-valuenow={Math.min(
          100,
          Math.round((elapsed / (interview.duration * 60)) * 100),
        )}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          style={{
            width:
              Math.min(100, (elapsed / (interview.duration * 60)) * 100) + "%",
          }}
        />
      </div>
      {interview.progression && (
        <div className="meeting-progression" aria-label="Interview progression">
          {interview.progression.stages.map((phase: string) => (
            <span
              key={phase}
              className={phase === interview.progression.phase ? "current" : ""}
              aria-current={
                phase === interview.progression.phase ? "step" : undefined
              }
            >
              {phase}
            </span>
          ))}
          <small>
            {interview.progression.turnKind === "FOLLOW_UP"
              ? "Follow-up on your answer"
              : `Core question ${interview.progression.mainQuestion} of ${interview.progression.mainQuestionCount}`}
          </small>
        </div>
      )}
      <div className="interview-meeting-grid">
        <section className="interview-stage" aria-label="Virtual interviewer">
          <div className="interview-stage-top">
            <span>
              <i />
              {practice ? "GUIDED SESSION" : "AI INTERVIEWER"}
            </span>
            <span>
              {liveMode ? state : speaking ? "Speaking" : listening ? "Listening" : "Ready"}
            </span>
          </div>
          <div className="studio-question-heading">
            <span className="studio-question-number">
              {String(transcript.length).padStart(2, "0")}
            </span>
            <div>
              <h2>
                {interviewerGender === "female" ? "Maya" : "Aarav"} ·{" "}
                {practice ? "Practice host" : "AI interviewer"}
              </h2>
              <p>
                {coding
                  ? "Coding & reasoning"
                  : interview.kind + " conversation"}
              </p>
            </div>
          </div>
          <div className="studio-person">
            <AIInterviewerPortrait
              speaking={liveMode ? liveSpeaking : speaking}
              gender={interviewerGender}
              pulse={mouthPulse}
              audioOpening={liveMode ? live.snapshot.mouth : undefined}
            />
          </div>
          <div
            className={
              "interviewer-status " + (speaking || listening ? "active" : "")
            }
            role="status"
          >
            <span />
            {state}
          </div>
          <div className="interview-caption" aria-live="polite">
            <span>
              {transcript.length === 1
                ? "LET’S GET STARTED"
                : practice
                  ? "NEXT PRACTICE QUESTION"
                  : "CONTINUING YOUR CONVERSATION"}
            </span>
            <h2>{(liveMode ? live.snapshot.output : spokenCaption) || current?.question || "Preparing your question…"}</h2>
          </div>
          <div className="interview-stage-controls" hidden={liveMode}>
            <Button
              variant="secondary"
              disabled={!speechSupported || locked || listening}
              onClick={() => {
                setVoiceOn(true);
                heard.current = current?.id;
                say(current?.question);
              }}
            >
              <Volume2 size={16} />
              {speaking ? "Repeat question" : "Play question"}
            </Button>
            {speechSupported && (
              <label className="meeting-voice-choice">
                <span>Interviewer voice</span>
                <select
                  aria-label="Interviewer voice"
                  value={selectedVoice}
                  disabled={speaking || listening || locked}
                  onChange={(event) => setSelectedVoice(event.target.value)}
                >
                  <option value="">Auto · {interviewerGender} preferred</option>
                  {availableVoices
                    .filter((v) => v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
          {!liveMode && (!speechSupported || voiceError) && (
            <p className="interview-voice-note" role="status">
              {voiceError ||
                "Spoken questions are unavailable in this browser. All questions remain readable."}
            </p>
          )}
        </section>
        <div className="interview-answer-column">
          <InterviewCamera
            listening={liveMode ? liveListening : listening}
            controlsTarget={cameraControls}
          />
          <div hidden={!showAnswer} id="meeting-answer-panel">
            <Card className="interview-answer-card">
              <div className="section-title">
                <h2>
                  {current?.answer ? "Your answer is saved" : "Your answer"}
                </h2>
                <span className="pill">
                  {liveMode ? (liveListening ? "Mic on" : "Mic off") : micStarting
                    ? "Opening mic…"
                    : listening
                      ? "Mic on"
                      : "Mic off"}
                </span>
              </div>
              {liveMode ? <LiveInterviewControls live={live} onText={() => {
                const text = live.snapshot.input;
                live.stop(); stopSpeech(); heard.current = current?.id;
                setDraft(value => text.trim() && !value.includes(text.trim())
                  ? [value.trim(), text.trim()].filter(Boolean).join(" ").slice(0, 15000)
                  : value);
                setRecordedVoice(!!interview.audioTranscriptionAvailable); setLiveMode(false);
              }}/> : current?.answer ? (
                <>
                  <p className="saved-interview-answer">
                    <Check size={15} />
                    Your response is saved.
                  </p>
                  <p className="pre-wrap">{current.answer}</p>
                  <Button
                    disabled={locked}
                    onClick={() => (last ? endSession() : action("next"))}
                  >
                    <ArrowRight size={16} />
                    {last ? "Finish and review" : "Continue to next question"}
                  </Button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <div
                    className="interview-input-options"
                  >
                    {!practice && <Button type="button" variant="secondary" disabled={locked || listening} onClick={() => {
                      if (draft.trim() || code.trim()) {
                        toast.info("Send your draft first, or clear it before switching to a live conversation.");
                        return;
                      }
                      stopListening(); stopSpeech(); setLiveMode(true);
                    }}><Mic size={16}/>Live voice interview</Button>}
                    <Button
                      type="button"
                      hidden={recordedVoice}
                      variant={listening ? "danger" : "secondary"}
                      disabled={locked}
                      onClick={() =>
                        listening ? stopListening() : startListening()
                      }
                    >
                      {listening ? <MicOff size={16} /> : <Mic size={16} />}
                      {listening ? "Stop microphone" : "Speak answer"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={locked || listening}
                      onClick={() => {
                        stopSpeech();
                        textarea.current?.focus();
                      }}
                    >
                      <Keyboard size={16} />
                      Type instead
                    </Button>
                  </div>
                  <details className="voice-options">
                    <summary>Voice options</summary>
                  <label className="dictation-language">
                    Speech input
                    <select
                      aria-label="Input method"
                      value={recordedVoice ? "recorded" : "live"}
                      disabled={locked || listening}
                      onChange={(e) => {
                        setRecordedVoice(e.target.value === "recorded");
                        setMicError("");
                      }}
                    >
                      <option value="live">Browser live dictation</option>
                      {interview.audioTranscriptionAvailable && (
                        <option value="recorded">Microphone (automatic)</option>
                      )}
                    </select>
                  </label>
                  </details>
                  {micStarting && (
                    <p className="interview-input-notice" role="status">
                      Opening microphone… Check the permission prompt beside the
                      address bar.
                    </p>
                  )}
                  {recordedVoice && interview.audioTranscriptionAvailable && (
                    <RecordedInterviewAnswer
                      key={current.id}
                      interviewId={interview.id}
                      questionId={current.id}
                      language={language}
                      target={recordControls}
                      disabled={!!busy || submitting}
                      onActive={setListening}
                      onBusy={setRecordBusy}
                      onStart={() => {
                        stopSpeech();
                        heard.current = current?.id;
                        setShowAnswer(true);
                      }}
                      onText={(text, seconds) => {
                        textarea.current?.scrollIntoView({ block: "nearest" });
                        setDraft((value) =>
                          [value.trim(), text.trim()]
                            .filter(Boolean)
                            .join(" ")
                            .slice(0, 15000),
                        );
                        metrics.current.speechSeconds += seconds;
                        metrics.current.spokenWords += text
                          .trim()
                          .split(/\s+/).length;
                      }}
                    />
                  )}
                  <label className="dictation-language">
                    Dictation language
                    <select
                      value={language}
                      disabled={locked || listening}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en-IN">English (India)</option>
                      <option value="hi-IN">Hindi (India)</option>
                    </select>
                  </label>
                  {(micError || (!recordedVoice && !micSupported)) && (
                    <p className="interview-input-notice" role="status">
                      {micError ||
                        "Voice input is unavailable here. Your typed answers work normally."}
                    </p>
                  )}
                  <label htmlFor="interview-answer">
                    {listening && !recordedVoice
                      ? "Live transcript"
                      : "Review your answer before sending"}
                  </label>
                  <textarea
                    id="interview-answer"
                    ref={textarea}
                    value={draft}
                    disabled={locked}
                    readOnly={listening}
                    onChange={(e) => {
                      metrics.current.edited = true;
                      setDraft(e.target.value);
                    }}
                    rows={7}
                    maxLength={15000}
                    placeholder="Explain your approach and share a specific example…"
                  />
                  {coding && (
                    <div className="studio-code">
                      <label htmlFor="code-language">Code language</label>
                      <select
                        id="code-language"
                        value={codeLanguage}
                        disabled={locked}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                      >
                        {[
                          "JavaScript",
                          "TypeScript",
                          "Java",
                          "Python",
                          "C++",
                          "SQL",
                          "Pseudocode",
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <label htmlFor="interview-code">Your solution</label>
                      <textarea
                        id="interview-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={locked || listening}
                        rows={9}
                        maxLength={14000}
                        spellCheck={false}
                        placeholder="Write your solution and explain its complexity…"
                      />
                      <small>
                        Reviewed by AI; code is not executed. Include your own
                        test cases.
                      </small>
                    </div>
                  )}
                  {interim && (
                    <p className="interview-interim" role="status">
                      {interim}
                    </p>
                  )}
                  <div className="interview-answer-footer">
                    <span>{draft.length.toLocaleString()} / 15,000</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={locked || listening || (!draft && !code)}
                      onClick={() => {
                        setDraft("");
                        setCode("");
                        setInterim("");
                        metrics.current = {
                          speechSeconds: 0,
                          spokenWords: 0,
                          edited: false,
                        };
                      }}
                    >
                      <RotateCcw size={13} />
                      Clear draft
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      locked || listening || (!draft.trim() && !code.trim())
                    }
                    className="interview-submit"
                  >
                    <Send size={16} />
                    {recordBusy
                      ? "Finish speaking first"
                      : locked
                        ? "Saving and preparing…"
                        : last
                          ? "Send final answer"
                          : "Send answer & continue"}
                  </Button>
                  <p className="interview-input-disclosure">
                    {listening
                      ? "Stop the microphone to review and send."
                      : "Your answer is saved before the next question is requested."}{" "}
                    Live dictation may use your browser’s speech service.
                    In automatic microphone mode, audio is sent for transcription
                    when you press Stop. No camera video is recorded.
                  </p>
                </form>
              )}
              {!!busy && (
                <p className="interview-input-notice" role="status">
                  {busy}
                </p>
              )}
            </Card>
          </div>
          {elapsed >= interview.duration * 60 && (
            <p className="small muted">
              Your planned time is up. Finish your answer, then complete the
              session when ready.
            </p>
          )}
        </div>
      </div>
      <div
        className="meeting-toolbar"
        role="group"
        aria-label="Interview call controls"
      >
        <div className="meeting-toolbar-group">
          <Button
            className={"meeting-tool" + (listening ? " enabled" : "")}
            variant="secondary"
            disabled={locked || !!current?.answer}
            hidden={recordedVoice || liveMode}
            aria-pressed={listening}
            onClick={() => (listening ? stopListening() : startListening())}
          >
            {listening ? <Mic size={20} /> : <MicOff size={20} />}
            <span>
              {micStarting
                ? "Cancel mic request"
                : listening
                  ? "Stop mic"
                  : "Start mic"}
            </span>
          </Button>
          <div ref={setRecordControls} hidden={!recordedVoice || liveMode} />
          {liveMode && <Button className="meeting-tool" variant="secondary" disabled={["INITIALIZING", "CONNECTING", "RECONNECTING", "ERROR", "ENDED"].includes(live.snapshot.state) || live.snapshot.finished} onClick={() => live.mute()}>
            {live.snapshot.muted ? <MicOff size={20}/> : <Mic size={20}/>}
            <span>{live.snapshot.muted ? "Unmute mic" : "Mute mic"}</span>
          </Button>}
          <div ref={setCameraControls} className="meeting-camera-control" />
          <Button
            className="meeting-tool"
            variant="secondary"
            aria-pressed={voiceOn}
            disabled={!liveMode && !speechSupported}
            onClick={() => {
              stopSpeech();
              if (liveMode) live.muteOutput(voiceOn);
              setVoiceOn(!voiceOn);
            }}
          >
            {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span>{voiceOn ? "Mute AI" : "Enable AI voice"}</span>
          </Button>
        </div>
        <div className="meeting-toolbar-group">
          <Button
            className={"meeting-tool" + (showAnswer ? " selected" : "")}
            variant="secondary"
            aria-expanded={showAnswer}
            aria-controls="meeting-answer-panel"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <MessageSquare size={20} />
            <span>Your answer</span>
          </Button>
          <Button
            className={"meeting-tool" + (showHistory ? " selected" : "")}
            variant="secondary"
            aria-expanded={showHistory}
            aria-controls="meeting-history"
            onClick={() => setShowHistory(!showHistory)}
          >
            <ScrollText size={20} />
            <span>Transcript</span>
          </Button>
          <Button
            className="meeting-tool"
            variant="secondary"
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            <span>{expanded ? "Exit full view" : "Full view"}</span>
          </Button>
        </div>
        <Button
          className="meeting-end"
          variant="danger"
          disabled={locked || (liveMode ? live.snapshot.pending : listening) || !answered}
          onClick={endSession}
        >
          <PhoneOff size={18} />
          <span>End interview</span>
        </Button>
      </div>
      <div hidden={!showHistory} id="meeting-history">
        <Card className="interview-history">
          <h2>Earlier in this conversation</h2>
          {transcript.length <= 1 && (
            <p>
              Your saved answers will appear here as the conversation continues.
            </p>
          )}
          {transcript.slice(0, -1).map((t) => (
            <details className="transcript-item" key={t.id}>
              <summary>{t.question}</summary>
              <p>{t.answer || "No answer submitted."}</p>
            </details>
          ))}
        </Card>
      </div>
    </div>
  );
  return (
    <>
      <div ref={portalHost} className="meeting-portal-host" />
      {createPortal(room, portalNode)}
    </>
  );
}
