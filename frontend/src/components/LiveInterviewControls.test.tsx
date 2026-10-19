import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveInterviewController, LiveInterviewControls, type useLiveInterview } from "./LiveInterviewControls";
import { idleLive, type LiveSnapshot } from "../utils/liveInterviewSession";
import type { Data } from "../types";

function controls(input: string) {
  const live: ReturnType<typeof useLiveInterview> = {
    snapshot: { ...idleLive, state: "ERROR", detail: "Voice connection failed.", input },
    start: vi.fn(), stop: vi.fn(), answerSaved: vi.fn(), mute: vi.fn(), muteOutput: vi.fn(),
  };
  return renderToStaticMarkup(<LiveInterviewControls live={live} onText={vi.fn()} />);
}

describe("voice recovery controls", () => {
  it("keeps an unsaved answer available and prevents Retry from silently deleting it", () => {
    const html = controls("I built a Java API with PostgreSQL.");
    expect(html).toContain("I built a Java API with PostgreSQL.");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^]*?Retry<\/button>/);
    expect(html).toContain("Continue with Text");
    expect(html).toContain("review and send this answer");
  });

  it("allows retrying a failed connection when no answer has been captured", () => {
    const html = controls("");
    expect(html).toContain("Retry");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("review and send this answer");
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {resolve = done;});
  return {promise, resolve};
}
const flush = async () => { for (let i=0; i<8; i++) await Promise.resolve(); };
function lifecycle() {
  const changed = vi.fn();
  const sessions: {
    changed:(state:LiveSnapshot) => void;
    saved:(interview:Data) => void;
    opening:ReturnType<typeof deferred>;
    closing:ReturnType<typeof deferred>;
    start:ReturnType<typeof vi.fn>;
    stop:ReturnType<typeof vi.fn>;
    mute:ReturnType<typeof vi.fn>;
    muteOutput:ReturnType<typeof vi.fn>;
  }[] = [];
  const makeSession = vi.fn((_interview:Data, update:(state:LiveSnapshot) => void, saved:(interview:Data) => void) => {
    const opening = deferred(), closing = deferred();
    const session = {changed:update, saved, opening, closing,
      start:vi.fn(() => opening.promise), stop:vi.fn(() => closing.promise), mute:vi.fn(), muteOutput:vi.fn()};
    sessions.push(session); return session;
  });
  const controller = new LiveInterviewController(changed, vi.fn(), makeSession);
  return {controller, sessions, changed};
}

describe("voice attempt lifecycle", () => {
  it("allows retry after a permission timeout, waits for cleanup, and ignores the old attempt", async () => {
    const {controller, sessions, changed} = lifecycle();
    const firstStart = controller.start({id:"i1"}, "headset"); await flush();
    await controller.start({id:"i1"});
    expect(sessions).toHaveLength(1);
    sessions[0].changed({...idleLive, state:"ERROR", detail:"Microphone permission timed out."});
    const retry = controller.start({id:"i1"}); await flush();
    expect(sessions[0].stop).toHaveBeenCalledTimes(1);
    expect(sessions).toHaveLength(1);
    sessions[0].closing.resolve(); await flush();
    expect(sessions).toHaveLength(2);
    sessions[1].changed({...idleLive, state:"INITIALIZING", detail:"New attempt"});
    sessions[0].changed({...idleLive, state:"ERROR", detail:"Late old error"});
    expect(changed.mock.calls.at(-1)![0].detail).toBe("New attempt");
    sessions[0].opening.resolve(); await firstStart;
    await controller.start({id:"i1"});
    expect(sessions).toHaveLength(2); // The old finally must not unlock the pending retry.
    sessions[1].opening.resolve(); await retry;
    controller.stop(); sessions[1].closing.resolve();
  });

  it("cancels a queued replacement before it can acquire another microphone", async () => {
    const {controller, sessions} = lifecycle();
    const firstStart = controller.start({id:"i1"}); await flush();
    controller.stop();
    const retry = controller.start({id:"i1"}); await flush();
    controller.stop();
    sessions[0].closing.resolve(); await retry;
    expect(sessions).toHaveLength(1);
    sessions[0].opening.resolve(); await firstStart;
  });

  it("keeps the transcript when stopping and rejects later snapshot callbacks", async () => {
    const {controller, sessions, changed} = lifecycle();
    const opening = controller.start({id:"i1"}); await flush();
    sessions[0].changed({...idleLive, state:"LISTENING", input:"My unfinished answer", level:42});
    controller.stop();
    expect(changed.mock.calls.at(-1)![0]).toMatchObject({state:"ENDED", input:"My unfinished answer", level:0});
    const count = changed.mock.calls.length;
    sessions[0].changed({...idleLive, state:"LISTENING"});
    expect(changed).toHaveBeenCalledTimes(count);
    sessions[0].closing.resolve(); sessions[0].opening.resolve(); await opening;
  });

  it("keeps recovered words through retries and only unlocks voice after the matching answer is saved", async () => {
    const {controller, sessions, changed} = lifecycle();
    const interview = {id:"i1", transcript:[{id:"q1", question:"Your project?"}]};
    const opening = controller.start(interview); await flush();
    sessions[0].opening.resolve(); await opening;
    sessions[0].changed({...idleLive, state:"LISTENING", input:"My unfinished answer"});
    controller.stop(); sessions[0].closing.resolve();
    await controller.start(interview);
    controller.answerSaved("another-question");
    expect(sessions).toHaveLength(1);
    expect(changed.mock.calls.at(-1)![0].input).toBe("My unfinished answer");
    controller.answerSaved("q1");
    expect(changed.mock.calls.at(-1)![0].input).toBe("");
    const retry = controller.start(interview); await flush();
    expect(sessions).toHaveLength(2);
    sessions[1].opening.resolve(); await retry;
    controller.stop(); sessions[1].closing.resolve();
  });

  it.each(["saved", "advanced"])("clears a stopped recovered answer when refreshed data confirms it was %s", async outcome => {
    const {controller, sessions, changed} = lifecycle();
    const interview = {id:"i1", transcript:[{id:"q1"}]};
    const opening = controller.start(interview); await flush();
    sessions[0].opening.resolve(); await opening;
    sessions[0].changed({...idleLive, state:"LISTENING", input:"Recovered answer"});
    controller.stop(); sessions[0].closing.resolve();
    controller.syncInterview(interview);
    expect(changed.mock.calls.at(-1)![0].input).toBe("Recovered answer");
    controller.syncInterview({id:"i1", transcript:outcome === "saved" ? [{id:"q1",answer:"Recovered answer"}] : [{id:"q2"}]});
    expect(changed.mock.calls.at(-1)![0].input).toBe("");
  });

  it("tracks the next live question and does not discard its current answer on an older save", async () => {
    const {controller, sessions, changed} = lifecycle();
    const opening = controller.start({id:"i1",transcript:[{id:"q1"}]}); await flush();
    sessions[0].opening.resolve(); await opening;
    const next = {id:"i1",transcript:[{id:"q1",answer:"Saved first answer"},{id:"q2"}]};
    sessions[0].saved(next);
    sessions[0].changed({...idleLive,state:"LISTENING",input:"Unfinished second answer"});
    controller.syncInterview(next); controller.answerSaved("q1");
    expect(changed.mock.calls.at(-1)![0].input).toBe("Unfinished second answer");
    controller.stop(); sessions[0].closing.resolve();
    controller.syncInterview(next); controller.answerSaved("q1");
    expect(changed.mock.calls.at(-1)![0].input).toBe("Unfinished second answer");
    controller.answerSaved("q2");
    expect(changed.mock.calls.at(-1)![0].input).toBe("");
  });

  it("retains output mute before startup, through retry and while a replacement is opening", async () => {
    const {controller, sessions} = lifecycle();
    controller.muteOutput(true);
    const opening = controller.start({id:"i1"}); await flush();
    expect(sessions[0].muteOutput).toHaveBeenLastCalledWith(true);
    sessions[0].opening.resolve(); await opening;
    expect(sessions[0].muteOutput).toHaveBeenLastCalledWith(true);
    sessions[0].changed({...idleLive,state:"ERROR"});
    const retry = controller.start({id:"i1"}); await flush();
    sessions[0].closing.resolve(); await flush();
    expect(sessions[1].muteOutput).toHaveBeenLastCalledWith(true);
    controller.muteOutput(false);
    sessions[1].opening.resolve(); await retry;
    expect(sessions[1].muteOutput).toHaveBeenLastCalledWith(false);
    controller.stop(); sessions[1].closing.resolve();
  });
});
