import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { LiveInterviewSession, liveConnectionError } from "./liveInterviewSession";
import type { LiveSnapshot } from "./liveInterviewSession";
import type { Data } from "../types";
import { api } from "../api/client";
vi.mock("../api/client", () => ({api: vi.fn()}));

class Socket {
  static OPEN = 1;
  static all: Socket[] = [];
  readyState = 1; bufferedAmount = 0; binaryType = "";
  onopen: any; onmessage: any; onclose: any; onerror: any;
  sent: Data[] = [];
  closed = false;
  constructor(public url: string) { Socket.all.push(this); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.closed = true; }
  message(value: Data) { this.onmessage?.({data:JSON.stringify(value)}); }
}
const interview = {id:"i1", transcript:[{id:"q1", question:"Tell me about your project."}]};
let callbacks: any, session: LiveInterviewSession, snapshot: LiveSnapshot, audio: any, saved: any;
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
async function connect() {
  await session.start();
  callbacks.samples(new Int16Array(1024), .04, .3);
  await flush();
  const socket = Socket.all.at(-1)!; socket.onopen(); socket.message({setupComplete:{}});
  return socket;
}
beforeEach(() => {
  vi.useFakeTimers(); Socket.all = []; vi.stubGlobal("WebSocket", Socket);
  audio = {open:vi.fn().mockResolvedValue(undefined), close:vi.fn(), play:vi.fn(), stopPlayback:vi.fn(), muteMic:vi.fn(), muteOutput:vi.fn()};
  saved = vi.fn();
  vi.mocked(api).mockImplementation(async (path) => path.endsWith("/token") ? {token:"auth_tokens/test", model:"models/test"} : interview);
  session = new LiveInterviewSession(interview, s => { snapshot = s; }, saved, events => {callbacks = events; return audio;});
});
afterEach(() => { session.stop(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("Live interview lifecycle", () => {
  it("tests one mic before connecting, streams PCM only after setup and never uploads the test", async () => {
    const ws = await connect();
    expect(audio.open).toHaveBeenCalledTimes(1);
    expect(ws.url).toContain("access_token=auth_tokens");
    expect(ws.sent.some(m => m.realtimeInput)).toBe(false);
    callbacks.samples(new Int16Array([1,2]), .01, .064);
    expect(ws.sent.at(-1)!.realtimeInput.audio.mimeType).toBe("audio/pcm;rate=16000");
    await session.start(); expect(audio.open).toHaveBeenCalledTimes(1);
    session.stop(); expect(ws.closed).toBe(true); expect(audio.close).toHaveBeenCalledTimes(1);
    expect(snapshot.state).toBe("ENDED");
  });
  it("stops queued audio on barge-in and discards late packets until the interrupted turn ends", async () => {
    const ws = await connect();
    ws.message({serverContent:{modelTurn:{parts:[{inlineData:{data:"AAA=",mimeType:"audio/pcm;rate=24000"}}]}}});
    callbacks.playing(true);
    for (let i=0;i<3;i++) callbacks.samples(new Int16Array(1024), .06, .064);
    expect(audio.stopPlayback).toHaveBeenCalled(); expect(snapshot.state).toBe("INTERRUPTED");
    ws.message({serverContent:{modelTurn:{parts:[{inlineData:{data:"AAA="}}]}}});
    expect(audio.play).toHaveBeenCalledTimes(1);
    ws.message({serverContent:{interrupted:true, turnComplete:true}});
    ws.message({serverContent:{modelTurn:{parts:[{inlineData:{data:"AAA="}}]}}});
    expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it("persists an answer through the existing backend before returning the next question to Gemini", async () => {
    const ws = await connect();
    const next = {...interview, spokenPrompt:"Thank you for your effort. Your next question is: Why that approach?", acknowledgement:"Thank you for your effort.", transcript:[{...interview.transcript[0],answer:"I built an API."},{id:"q2",question:"Why that approach?"}]};
    vi.mocked(api).mockResolvedValue(next);
    ws.message({serverContent:{inputTranscription:{text:"I built an API."}}});
    ws.message({toolCall:{functionCalls:[{id:"call1", name:"submit_answer", args:{questionId:"q1",answer:"Wrong paraphrase"}}]}});
    await flush();
    const request = vi.mocked(api).mock.calls.find(([path]) => path.endsWith("/turn"))!;
    expect(JSON.parse(String(request[1]?.body)).text).toBe("I built an API.");
    expect(saved).toHaveBeenLastCalledWith(next);
    expect(ws.sent.at(-1)!.toolResponse.functionResponses[0].response.questionId).toBe("q2");
    expect(ws.sent.at(-1)!.toolResponse.functionResponses[0].response.spokenPrompt).toBe(next.spokenPrompt);
    expect(snapshot.input).toBe("");
  });
  it("keeps the transcript and closes audio/socket when saving fails", async () => {
    const ws = await connect(); vi.mocked(api).mockRejectedValue(new Error("Save failed"));
    ws.message({serverContent:{inputTranscription:{text:"My answer"}}});
    ws.message({toolCall:{functionCalls:[{id:"call1",name:"submit_answer",args:{questionId:"q1",answer:"My answer"}}]}});
    await flush(); expect(snapshot.state).toBe("ERROR"); expect(snapshot.input).toBe("My answer");
    expect(ws.closed).toBe(true); expect(audio.close).toHaveBeenCalledTimes(1);
  });
  it("connects a working but silent microphone so the interviewer can ask first", async () => {
    await session.start(); callbacks.samples(new Int16Array(1024), 0, .064);
    await flush();
    const ws = Socket.all.at(-1)!; ws.onopen(); ws.message({setupComplete:{}});
    await vi.advanceTimersByTimeAsync(12001);
    expect(snapshot.state).toBe("LISTENING"); expect(Socket.all).toHaveLength(1);
    expect(ws.sent.some(m => m.clientContent)).toBe(true);
    expect(ws.sent.find(m => m.clientContent)!.clientContent.turns[0].parts[0].text).toContain("Speak first now");
    expect(audio.close).not.toHaveBeenCalled();
  });
  it("reports a device with no capture frames without contacting Gemini", async () => {
    await session.start(); await vi.advanceTimersByTimeAsync(12001);
    expect(snapshot.state).toBe("ERROR"); expect(snapshot.detail).toContain("not sending audio");
    expect(Socket.all).toHaveLength(0); expect(audio.close).toHaveBeenCalled();
  });
  it("settles Start after a permission timeout and ignores a late microphone grant", async () => {
    let grant!: () => void;
    audio.open.mockImplementation(() => new Promise<void>(resolve => {grant = resolve;}));
    let settled = false;
    const pending = session.start().then(() => {settled = true;});
    await vi.advanceTimersByTimeAsync(30001); await pending;
    expect(settled).toBe(true); expect(snapshot.state).toBe("ERROR");
    grant(); callbacks.samples(new Int16Array(1024), .04, .3); await flush();
    expect(snapshot.state).toBe("ERROR"); expect(Socket.all).toHaveLength(0);
  });
  it("does not install a stale microphone timer if frames arrived during open", async () => {
    audio.open.mockImplementation(async () => { callbacks.samples(new Int16Array(1024), 0, .064); });
    await session.start(); await flush();
    const ws = Socket.all.at(-1)!; ws.onopen(); ws.message({setupComplete:{}});
    await vi.advanceTimersByTimeAsync(12001);
    expect(snapshot.state).toBe("LISTENING");
  });
  it("gives an actionable quota error without echoing provider response data", async () => {
    const ws = await connect();
    ws.message({error:{code:429, status:"RESOURCE_EXHAUSTED", message:"Quota exhausted; sensitive-request-value"}});
    expect(snapshot.state).toBe("ERROR"); expect(snapshot.detail).toContain("usage limit");
    expect(snapshot.detail).not.toContain("sensitive-request-value"); expect(ws.closed).toBe(true);
    expect(liveConnectionError(1008, "Token expired: secret-token-value")).toContain("fresh session");
  });
  it("uses actual playback completion when the provider emits generationComplete without turnComplete", async () => {
    const ws = await connect();
    ws.message({serverContent:{modelTurn:{parts:[{inlineData:{data:"AAA="}}]}}});
    callbacks.playing(true);
    ws.message({serverContent:{generationComplete:true}});
    expect(snapshot.state).toBe("AI_SPEAKING");
    callbacks.playing(false);
    expect(snapshot.state).toBe("LISTENING");
  });
  it("ignores duplicate tool calls while a save is in flight", async () => {
    const ws = await connect();
    let complete!: (data: any) => void;
    vi.mocked(api).mockImplementation(() => new Promise(resolve => {complete=resolve;}));
    const message = {toolCall:{functionCalls:[{id:"duplicate",name:"submit_answer",args:{questionId:"q1",answer:"My project"}}]}};
    ws.message(message); ws.message(message);
    expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith("/turn"))).toHaveLength(1);
    ws.message({serverContent:{generationComplete:true}});
    expect(snapshot.state).toBe("THINKING");
    callbacks.playing(false);
    expect(snapshot.state).toBe("THINKING");
    complete({...interview,transcript:[{id:"q2",question:"Next question"}]}); await flush();
    expect(ws.sent.filter(m => m.toolResponse)).toHaveLength(1);
  });
  it("reconnects with a resumption handle without opening another microphone or replaying audio", async () => {
    const ws = await connect(); ws.message({sessionResumptionUpdate:{resumable:true,newHandle:"resume-1"}});
    ws.onclose({code:1006}); expect(ws.closed).toBe(true);
    await vi.advanceTimersByTimeAsync(501); await flush();
    const next = Socket.all.at(-1)!; next.onopen();
    expect(next.sent[0].setup.sessionResumption.handle).toBe("resume-1");
    expect(audio.open).toHaveBeenCalledTimes(1); expect(Socket.all).toHaveLength(2);
    expect(next.sent.some(m => m.realtimeInput)).toBe(false);
    session.stop(); await vi.advanceTimersByTimeAsync(120000); expect(Socket.all).toHaveLength(2);
  });
  it("opens analysis only after the final acknowledgement finishes playing", async () => {
    const ws = await connect();
    const closingMessage = "Thank you for your effort. We will now prepare your analysis.";
    vi.mocked(api).mockResolvedValue({...interview, closingMessage, transcript:[{...interview.transcript[0], answer:"My final answer"}]});
    ws.message({toolCall:{functionCalls:[{id:"final",name:"submit_answer",args:{questionId:"q1",answer:"My final answer"}}]}});
    await flush();
    expect(snapshot.finished).toBe(true); expect(snapshot.reviewReady).toBe(false);
    expect(ws.sent.at(-1)!.toolResponse.functionResponses[0].response.closingMessage).toBe(closingMessage);
    expect(audio.muteMic).toHaveBeenCalledWith(true);
    ws.message({serverContent:{modelTurn:{parts:[{inlineData:{data:"AAA="}}]}}});
    callbacks.playing(true);
    ws.message({serverContent:{generationComplete:true}});
    expect(snapshot.reviewReady).toBe(false);
    callbacks.playing(false);
    expect(snapshot.reviewReady).toBe(true); expect(ws.closed).toBe(true);
  });
  it("still opens analysis if the final audio never arrives", async () => {
    const ws = await connect();
    vi.mocked(api).mockResolvedValue({...interview, transcript:[{...interview.transcript[0],answer:"Done"}]});
    ws.message({toolCall:{functionCalls:[{id:"final",name:"submit_answer",args:{questionId:"q1",answer:"Done"}}]}});
    await flush();
    expect(snapshot.reviewReady).toBe(false);
    await vi.advanceTimersByTimeAsync(20001);
    expect(snapshot.reviewReady).toBe(true); expect(audio.close).toHaveBeenCalledTimes(1);
  });
});
