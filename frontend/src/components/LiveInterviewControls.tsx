import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Keyboard, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import type { Data } from "../types";
import { idleLive, LiveInterviewSession } from "../utils/liveInterviewSession";

export function useLiveInterview(interview: Data) {
  const client = useQueryClient();
  const [snapshot, setSnapshot] = useState(idleLive);
  const session = useRef<LiveInterviewSession | null>(null);
  const starting = useRef(false);
  const generation = useRef(0);
  const latest = useRef(interview); latest.current = interview;
  useEffect(() => () => { ++generation.current; void session.current?.stop(); session.current = null; }, [interview.id]);
  return {
    snapshot,
    async start(device?: string) {
      if (starting.current) return;
      starting.current = true;
      const attempt = ++generation.current;
      await session.current?.stop();
      if (attempt !== generation.current) { starting.current = false; return; }
      session.current = new LiveInterviewSession(latest.current, setSnapshot, data => {
        client.setQueryData(["interview", data.id], data);
        void client.invalidateQueries({queryKey:["interviews"]});
        void client.invalidateQueries({queryKey:["dashboard"]});
      });
      try { await session.current.start(device); }
      finally { starting.current = false; }
    },
    stop() { ++generation.current; void session.current?.stop(); },
    mute() { session.current?.mute(!snapshot.muted); },
    muteOutput(muted: boolean) { session.current?.muteOutput(muted); },
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
      if (!disposed) setDevices(list.filter(d => d.kind === "audioinput"));
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
