import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveInterviewControls, type useLiveInterview } from "./LiveInterviewControls";
import { idleLive } from "../utils/liveInterviewSession";

function controls(input: string) {
  const live: ReturnType<typeof useLiveInterview> = {
    snapshot: { ...idleLive, state: "ERROR", detail: "Voice connection failed.", input },
    start: vi.fn(), stop: vi.fn(), mute: vi.fn(), muteOutput: vi.fn(),
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
