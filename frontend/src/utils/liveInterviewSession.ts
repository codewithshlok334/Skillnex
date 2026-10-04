import { api } from "../api/client";
import type { Data } from "../types";
import { LiveInterviewAudio, pcmBase64 } from "./liveInterviewAudio";

export type LiveState = "INITIALIZING" | "CONNECTING" | "LISTENING" | "THINKING" | "AI_SPEAKING" | "INTERRUPTED" | "RECONNECTING" | "ERROR" | "ENDED";
export type LiveSnapshot = {
  state: LiveState; detail: string; level: number; mouth: number; input: string;
  output: string; muted: boolean; pending: boolean; finished: boolean;
};
export const idleLive: LiveSnapshot = {state:"ENDED", detail:"Test your microphone, then speak naturally.", level:0, mouth:0, input:"", output:"", muted:false, pending:false, finished:false};
const endpoint = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

/** One instance owns one mic, one AudioContext and at most one socket. No recordings. */
export class LiveInterviewSession {
  private snapshot = {...idleLive};
  private audio?: LiveInterviewAudio;
  private socket?: WebSocket;
  private stopped = false;
  private ready = false;
  private token = "";
  private model = "";
  private handle = "";
  private attempts = 0;
  private sequence = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private setupTimer?: ReturnType<typeof setTimeout>;
  private responseTimer?: ReturnType<typeof setTimeout>;
  private testTimer?: ReturnType<typeof setTimeout>;
  private tested = false;
  private testSeconds = 0;
  private speechSeconds = 0;
  private voiceFrames = 0;
  private silence = 0;
  private hadSpeech = false;
  private playing = false;
  private discardAudio = false;
  private turnDone = true;
  private input = "";
  private output = "";
  private interview: Data;
  private calls = new Map<string, Promise<Data>>();
  private cancelled = new Set<string>();
  private turnBusy = false;
  private tokenAbort = new AbortController();
  private closing: Promise<void> = Promise.resolve();
  constructor(interview: Data, private changed: (state: LiveSnapshot) => void, private saved: (interview: Data) => void,
    private makeAudio = (events: ConstructorParameters<typeof LiveInterviewAudio>[0]) => new LiveInterviewAudio(events)) {
    this.interview = interview;
  }
  private update(patch: Partial<LiveSnapshot>) { this.snapshot = {...this.snapshot, ...patch}; this.changed(this.snapshot); }
  private later(fn: () => void, delay: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); if (!this.stopped) fn(); }, delay);
    this.timers.add(timer); return timer;
  }
  private clear(timer?: ReturnType<typeof setTimeout>) { if (timer) { clearTimeout(timer); this.timers.delete(timer); } }
  private async request<T = Data>(path: string, body?: unknown, timeout = 70000): Promise<T> {
    return api<T>(`/interviews/${this.interview.id}${path ? "/" + path : ""}`, {
      method: body === undefined ? "GET" : "POST", body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  }
  async start(deviceId?: string) {
    if (this.audio || this.stopped) return;
    this.update({state:"INITIALIZING", detail:"Allow the microphone and say hello to test it.", input:"", output:""});
    this.audio = this.makeAudio({
      samples: (pcm, rms, seconds) => this.capture(pcm, rms, seconds),
      mouth: mouth => { if (!this.stopped) this.update({mouth}); },
      playing: playing => {
        this.playing = playing;
        if (!this.stopped && this.ready && !this.snapshot.finished)
          this.update({state:playing ? "AI_SPEAKING" : this.turnDone && !this.turnBusy ? "LISTENING" : "THINKING"});
      },
      error: message => this.fail(message),
    });
    // Covers a permission prompt left unanswered, as well as an unresponsive device.
    this.testTimer = this.later(() => this.fail("Microphone did not become ready. Allow microphone access in Chrome and retry."), 30000);
    try {
      await this.audio.open(deviceId);
      if (this.stopped) return;
      this.clear(this.testTimer);
      this.testTimer = this.later(() => this.fail("No microphone sound detected. Check the selected input and Windows microphone permission, then retry."), 12000);
    } catch (error) {
      if (this.stopped) return;
      const name = error instanceof DOMException ? error.name : "";
      this.fail(name === "NotAllowedError" ? "Microphone permission denied. Allow it beside Chrome's address bar, then retry."
        : name === "NotFoundError" ? "No microphone was found. Connect a microphone, then retry."
        : name === "NotReadableError" ? "Microphone is busy or unavailable. Close other recording apps and retry."
        : error instanceof Error ? error.message : "Microphone could not start.");
    }
  }
  private capture(pcm: Int16Array, rms: number, seconds: number) {
    if (this.stopped) return;
    this.update({level:Math.min(100, rms * 700)});
    if (!this.tested) {
      if (rms > 0.008) this.testSeconds += seconds;
      if (this.testSeconds >= 0.25) {
        this.tested = true; this.clear(this.testTimer);
        this.update({state:"CONNECTING", detail:"Microphone detected. Connecting your interviewer…"});
        void this.connect(false);
      }
      return; // Test speech is never submitted as an interview answer.
    }
    if (!this.ready || this.snapshot.muted || this.snapshot.finished) return;
    if (!this.socket || this.socket.bufferedAmount > 128000) { this.fail("Connection is too slow for live audio. Retry voice or continue with text."); return; }
    this.send({realtimeInput:{audio:{data:pcmBase64(pcm), mimeType:"audio/pcm;rate=16000"}}});
    const voice = rms > 0.018;
    if (voice) {
      this.voiceFrames++; this.silence = 0; this.speechSeconds += seconds;
      if (this.voiceFrames >= 3) {
        this.hadSpeech = true;
        this.clear(this.responseTimer);
        if (this.playing) {
          this.discardAudio = true;
          this.audio?.stopPlayback();
          this.update({state:"INTERRUPTED", mouth:0, output:"", detail:"Listening to you…"});
        } else if (!this.turnBusy) this.update({state:"LISTENING", detail:"Listening to you…"});
      }
    } else {
      this.voiceFrames = 0; this.silence += seconds;
      if (this.hadSpeech && this.silence > 1.2) {
        this.hadSpeech = false;
        this.update({state:this.playing ? "AI_SPEAKING" : "THINKING", detail:"Your interviewer is considering your answer…"});
        this.armResponseTimeout();
      }
    }
  }
  private armResponseTimeout() {
    this.clear(this.responseTimer);
    this.responseTimer = this.later(() => this.fail("The interviewer did not respond in time. Your transcript is kept; retry or continue with text."), 75000);
  }
  private send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
  private async connect(resume: boolean) {
    const seq = ++this.sequence;
    try {
      if (!resume) {
        this.interview = await this.request("");
        if (this.stopped || seq !== this.sequence) return;
        this.saved(this.interview);
        const rows: Data[] = this.interview.transcript || [];
        const current = rows.at(-1);
        if (current?.answer) {
          const result = await this.request("live/turn", {questionId:current.id, text:current.answer, speechSeconds:current.speech_seconds || 0});
          this.interview = result; this.saved(result);
          if (result.transcript.at(-1)?.answer) { this.finish(); return; }
        }
        const auth = await api<Data>(`/interviews/${this.interview.id}/live/token`, {method:"POST", body:"{}", signal:AbortSignal.any([this.tokenAbort.signal, AbortSignal.timeout(25000)])});
        if (this.stopped || seq !== this.sequence) return;
        this.token = auth.token; this.model = auth.model; this.handle = "";
      }
      if (this.stopped || seq !== this.sequence) return;
      const ws = new WebSocket(endpoint + "?access_token=" + encodeURIComponent(this.token));
      ws.binaryType = "arraybuffer"; this.socket = ws;
      this.setupTimer = this.later(() => this.fail("Gemini Live connection timed out. Retry or continue with text."), 20000);
      ws.onopen = () => {
        if (this.stopped || this.socket !== ws) { ws.close(); return; }
        this.send({setup:{model:this.model, sessionResumption:this.handle ? {handle:this.handle} : {}}});
      };
      ws.onmessage = event => {
        if (this.stopped || this.socket !== ws) return;
        try {
          const data = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
          this.receive(JSON.parse(data), resume);
        } catch { this.fail("Voice connection returned an unreadable response. Retry or continue with text."); }
      };
      ws.onerror = () => { /* onclose owns retry; never create a second socket here. */ };
      ws.onclose = event => {
        if (this.stopped || this.socket !== ws) return;
        if ([1008, 1007].includes(event.code)) this.fail("Gemini Live rejected this session. Check Live model access and quota in the backend configuration.");
        else this.reconnect();
      };
    } catch (error) {
      if (!this.stopped) this.fail(error instanceof Error ? error.message : "Live connection could not start.");
    }
  }
  private receive(message: Data, resumed: boolean) {
    if (message.error) { this.fail("Gemini Live could not continue. Check provider quota/model access and retry."); return; }
    if (message.setupComplete) {
      this.clear(this.setupTimer); this.ready = true; this.discardAudio = false;
      this.later(() => { if (this.ready) this.attempts = 0; }, 30000);
      this.update({state:"LISTENING", detail:"Connected. Speak naturally; you can interrupt the interviewer."});
      if (!resumed) {
        this.send({clientContent:{turns:[{role:"user", parts:[{text:"Begin the interview by reading the current unanswered question in INTERVIEW_DATA. This is a control instruction, not a candidate answer."}]}], turnComplete:true}});
        this.armResponseTimeout();
      }
    }
    if (message.sessionResumptionUpdate) this.handle = message.sessionResumptionUpdate.resumable ? message.sessionResumptionUpdate.newHandle || "" : "";
    if (message.goAway) { this.reconnect(); return; }
    if (message.toolCallCancellation) for (const id of message.toolCallCancellation.ids || []) this.cancelled.add(id);
    for (const call of message.toolCall?.functionCalls || []) void this.tool(call);
    const content = message.serverContent;
    if (!content) return;
    if (content.interrupted) {
      this.audio?.stopPlayback(); this.output = "";
      // Packets after this server interruption boundary belong to the new turn.
      this.discardAudio = false; this.turnDone = true;
      this.update({state:"INTERRUPTED", output:"", mouth:0, detail:"Listening to you…"});
    }
    if (content.inputTranscription?.text) {
      this.input = (this.input + content.inputTranscription.text).slice(0, 15000);
      this.update({input:this.input});
    }
    if (content.outputTranscription?.text && !this.discardAudio) {
      this.output = (this.output + content.outputTranscription.text).slice(-6000);
      this.update({output:this.output}); this.clear(this.responseTimer);
    }
    for (const part of content.modelTurn?.parts || []) {
      if (part.inlineData?.data && !this.discardAudio) {
        this.turnDone = false; this.clear(this.responseTimer);
        try { this.audio?.play(part.inlineData.data, part.inlineData.mimeType); }
        catch (error) { this.fail(error instanceof Error ? error.message : "Audio playback failed."); return; }
      }
    }
    if (content.generationComplete || content.turnComplete) {
      this.turnDone = true; this.discardAudio = false; this.output = "";
      this.clear(this.responseTimer);
      if (!this.playing && !this.snapshot.finished && !this.turnBusy) this.update({state:"LISTENING", detail:"Your turn. Speak naturally."});
    }
  }
  private async tool(call: Data) {
    if (!call.id || call.name !== "submit_answer") return;
    const ws = this.socket;
    let pending = this.calls.get(call.id);
    if (pending) return; // Respond to each tool-call ID exactly once.
    if (!pending) {
      if (this.turnBusy || this.cancelled.has(call.id)) return;
      const current = this.interview.transcript?.at(-1);
      if (call.args?.questionId !== current?.id) {
        this.send({toolResponse:{functionResponses:[{id:call.id, name:call.name, response:{error:"Use the current question ID", questionId:current?.id, question:current?.question}}]}});
        return;
      }
      const text = String(this.input.trim() || call.args?.answer || "").trim();
      if (!text || text.length > 15000) { this.fail("No clear answer was received. Retry or continue with text."); return; }
      this.turnBusy = true; this.handle = ""; this.update({pending:true, state:"THINKING", detail:"Saving your answer and preparing the next question…"});
      pending = this.request("live/turn", {questionId:current.id, text, speechSeconds:Math.min(86400, Math.round(this.speechSeconds))});
      this.calls.set(call.id, pending);
    }
    try {
      const interview = await pending;
      this.interview = interview; this.saved(interview);
      const current = interview.transcript.at(-1);
      const finished = !!current?.answer;
      this.input = ""; this.speechSeconds = 0; this.turnBusy = false;
      if (this.stopped) return;
      this.update({pending:false, input:"", finished});
      if (this.socket === ws && !this.cancelled.has(call.id)) this.send({toolResponse:{functionResponses:[{id:call.id, name:call.name, response:{
        saved:true, finished, questionId:current.id, question:finished ? "Thank the candidate. They can now select End interview for their report." : current.question,
      }}]}});
      if (finished) { this.audio?.muteMic(true); this.update({muted:true, detail:"Answers saved. Select End interview for your review."}); }
      else this.armResponseTimeout();
    } catch (error) {
      this.turnBusy = false;
      if (!this.stopped) { this.update({pending:false}); this.fail(error instanceof Error ? error.message : "Your answer could not be saved. Continue with text to retry."); }
    }
  }
  private reconnect() {
    if (this.stopped) return;
    this.ready = false; this.clear(this.setupTimer); this.clear(this.responseTimer); this.audio?.stopPlayback(); this.detachSocket();
    this.output = "";
    if (++this.attempts > 3) { this.fail("Voice connection was lost. Your saved answers are safe; retry or continue with text."); return; }
    // Never replay old microphone packets or old output audio after reconnecting.
    this.update({state:"RECONNECTING", mouth:0, output:"", detail:"Connection interrupted. Please pause while voice reconnects; unsent audio is not replayed."});
    const resume = () => {
      if (this.turnBusy) { this.later(resume, 1000); return; }
      void this.connect(!!this.handle);
    };
    this.later(resume, [500, 1500, 3500][this.attempts - 1]);
  }
  mute(muted: boolean) {
    this.audio?.muteMic(muted); this.update({muted, level:0});
    if (muted && this.ready) this.send({realtimeInput:{audioStreamEnd:true}});
  }
  muteOutput(muted: boolean) { this.audio?.muteOutput(muted); }
  private finish() { this.stop(); this.update({finished:true, detail:"Answers saved. Select End interview for your review."}); }
  private fail(detail: string) {
    if (this.stopped) return;
    this.stop(); this.update({state:"ERROR", detail, level:0, mouth:0, pending:false});
  }
  private detachSocket() {
    if (!this.socket) return;
    const ws = this.socket; this.socket = undefined;
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null; ws.close();
  }
  stop(): Promise<void> {
    if (this.stopped) return this.closing;
    this.stopped = true; this.ready = false; ++this.sequence;
    this.tokenAbort.abort(); this.timers.forEach(clearTimeout); this.timers.clear();
    this.detachSocket(); this.closing = Promise.resolve(this.audio?.close()); this.audio = undefined;
    this.token = ""; this.handle = "";
    this.update({state:"ENDED", level:0, mouth:0});
    return this.closing;
  }
}
