import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Keyboard, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import type { Data } from "../types";
import { idleLive, LiveInterviewSession, type LiveSnapshot } from "../utils/liveInterviewSession";

type VoiceSession = Pick<LiveInterviewSession, "start" | "stop" | "mute" | "muteOutput">;

/** Serializes session replacement and ignores callbacks from an abandoned attempt. */
export class LiveInterviewController {
  private session?: VoiceSession;
  private generation = 0;
  private starting?: number;
  private closing: Promise<void> = Promise.resolve();
  private snapshot = idleLive;
  private questionId?: string;
  private outputMuted = false;
  constructor(
    private changed: (state: LiveSnapshot) => void,
    private saved: (interview: Data) => void,
    private makeSession = (interview: Data, changed: (state: LiveSnapshot) => void, saved: (interview: Data) => void): VoiceSession =>
      new LiveInterviewSession(interview, changed, saved),
  ) {}
  async start(interview: Data, device?: string) {
    if (this.starting !== undefined) return;
    this.syncInterview(interview);
    if (this.snapshot.input.trim()) return;
    const attempt = ++this.generation;
    this.starting = attempt;
    const previous = this.session; this.session = undefined;
    if (previous) this.closing = previous.stop();
    try {
      await this.closing;
      if (attempt !== this.generation) return;
      this.questionId = interview.transcript?.at(-1)?.id;
      const session = this.makeSession(interview, state => {
        if (attempt !== this.generation) return;
        this.snapshot = state;
        if ((state.state === "ERROR" || state.state === "ENDED") && this.starting === attempt) this.starting = undefined;
        this.changed(state);
      }, data => {
        if (attempt === this.generation) this.questionId = data.transcript?.at(-1)?.id;
        this.saved(data);
      });
      this.session = session;
      const opening = session.start(device);
      session.muteOutput(this.outputMuted);
      await opening;
      // Startup creates the audio gain after permission; apply the latest preference then too.
      if (attempt === this.generation) session.muteOutput(this.outputMuted);
    } finally {
      // A late permission result from a stopped attempt cannot unlock a newer start.
      if (this.starting === attempt) this.starting = undefined;
    }
  }
  stop() {
    ++this.generation; this.starting = undefined;
    const previous = this.session; this.session = undefined;
    if (previous) this.closing = previous.stop();
    this.snapshot = {...this.snapshot, state:"ENDED", level:0, mouth:0};
    this.changed(this.snapshot);
  }
  syncInterview(interview: Data) {
    if (!this.questionId || !["ENDED", "ERROR"].includes(this.snapshot.state)) return;
    const rows: Data[] = interview.transcript || [];
    const current = rows.at(-1);
    if (rows.some(row => row.id === this.questionId && row.answer) || (current?.id && current.id !== this.questionId))
      this.answerSaved(this.questionId);
  }
  answerSaved(questionId: string) {
    if (questionId !== this.questionId || !["ENDED", "ERROR"].includes(this.snapshot.state) || !this.snapshot.input) return;
    this.snapshot = {...this.snapshot, input:"", pending:false};
    this.changed(this.snapshot);
  }
  mute(muted: boolean) { this.session?.mute(muted); }
  muteOutput(muted: boolean) { this.outputMuted = muted; this.session?.muteOutput(muted); }
}

export function useLiveInterview(interview: Data) {
  const client = useQueryClient();
  const [snapshot, setSnapshot] = useState(idleLive);
  const latest = useRef(interview); latest.current = interview;
  const controller = useRef<LiveInterviewController | null>(null);
  if (!controller.current) controller.current = new LiveInterviewController(setSnapshot, data => {
    client.setQueryData(["interview", data.id], data);
    void client.invalidateQueries({queryKey:["interviews"]});
    void client.invalidateQueries({queryKey:["dashboard"]});
  });
  useEffect(() => () => controller.current?.stop(), [interview.id]);
  useEffect(() => controller.current?.syncInterview(interview), [interview]);
  return {
    snapshot,
    start(device?: string) { return controller.current!.start(latest.current, device); },
    stop() { controller.current?.stop(); },
    answerSaved(questionId: string) { controller.current?.answerSaved(questionId); },
    mute() { controller.current?.mute(!snapshot.muted); },
    muteOutput(muted: boolean) { controller.current?.muteOutput(muted); },
  };
}

export function LiveInterviewControls({live, onText}: {live: ReturnType<typeof useLiveInterview>; onText: () => void}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState(() => {
    try { return sessionStorage.getItem("skillnex-interview-mic") || ""; } catch { return ""; }
  });
  const s = live.snapshot;
  const idle = s.state === "ENDED" || s.state === "ERROR";
  const unsaved = !!s.input.trim();
  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices) return;
    let disposed = false;
    const refresh = () => void media.enumerateDevices().then(list => {
      if (disposed) return;
      const inputs = list.filter(d => d.kind === "audioinput");
      setDevices(inputs);
      // Labels are hidden before permission; only reconcile a fully visible device list.
      if (inputs.some(d => d.label)) setDevice(selected => {
        if (!selected || inputs.some(d => d.deviceId === selected)) return selected;
        try { sessionStorage.removeItem("skillnex-interview-mic"); } catch {}
        return "";
      });
    }).catch(() => {});
    refresh(); media.addEventListener("devicechange", refresh);
    return () => { disposed = true; media.removeEventListener("devicechange", refresh); };
  }, [s.state === "INITIALIZING", s.state === "CONNECTING"]);
  return <div className="live-interview-controls">
    <p className="interview-input-notice" role="status">
      {s.state === "ERROR" && <strong>Voice interview is temporarily unavailable.<br/></strong>}
      {s.detail}
    </p>
    {idle && !s.finished && <label>Microphone
      <select aria-label="Live microphone" value={device} onChange={e => {
        setDevice(e.target.value);
        try { sessionStorage.setItem("skillnex-interview-mic", e.target.value); } catch {}
      }}>
        <option value="">System default</option>
        {devices.filter(d => d.deviceId).map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
      </select>
    </label>}
    {idle && !device && devices.some(d => d.deviceId === "default" && /camo|virtual/i.test(d.label)) &&
      <small>Your default input is a virtual microphone. Choose your laptop or headset mic if no sound is detected.</small>}
    <div className="live-mic-meter" role="meter" aria-label="Live microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.level)}>
      <span style={{width:s.level + "%"}}/>
    </div>
    <div className="live-voice-actions">
      {idle ? !s.finished && <Button type="button" disabled={unsaved} onClick={() => live.start(device)}>
        {s.state === "ERROR" ? <RotateCcw size={16}/> : <Mic size={16}/>}{s.state === "ERROR" ? "Retry" : "Start voice interview"}
      </Button> : <Button type="button" variant="secondary" onClick={() => live.mute()} disabled={["INITIALIZING", "CONNECTING", "RECONNECTING"].includes(s.state) || s.finished}>
        {s.muted ? <MicOff size={16}/> : <Mic size={16}/>}{s.muted ? "Unmute mic" : "Mute mic"}
      </Button>}
      <Button type="button" variant="ghost" disabled={s.pending} onClick={onText}><Keyboard size={16}/>Continue with Text</Button>
    </div>
    {idle && unsaved && <p role="status">Your words are kept. Choose Continue with Text to review and send this answer before starting another voice session.</p>}
    {s.input && <div className="live-answer-transcript"><strong>Your live transcript</strong><p>{s.input}</p></div>}
    <small>Mic audio streams to Gemini while connected. Answers are saved automatically. Your camera stays local. Headphones help prevent echo.</small>
  </div>;
}
