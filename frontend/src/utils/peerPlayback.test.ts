import { describe, expect, it, vi } from 'vitest';
import { attachPeerAudio } from './peerPlayback';

class Track extends EventTarget { readyState = 'live'; }
class Stream extends EventTarget { tracks: Track[] = []; getAudioTracks() { return this.tracks; } }
class Audio extends EventTarget {
  srcObject: unknown = null; muted = true; volume = 0;
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  pause = vi.fn();
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function mount() {
  const audio = new Audio(), stream = new Stream(), blocked = vi.fn(), gestures = new EventTarget();
  const dispose = attachPeerAudio(audio as unknown as HTMLAudioElement, stream as unknown as MediaStream, blocked, gestures);
  return { audio, stream, blocked, gestures, dispose };
}
describe('peer sound playback', () => {
  it('plays a late microphone track and retries when it unmutes after reconnection', async () => {
    const t = mount();
    expect(t.audio.play).not.toHaveBeenCalled();
    const track = new Track(); t.stream.tracks.push(track); t.stream.dispatchEvent(new Event('addtrack')); await flush();
    expect(t.audio.play).toHaveBeenCalledTimes(1);
    expect(t.audio.muted).toBe(false); expect(t.audio.volume).toBe(1);
    track.dispatchEvent(new Event('unmute')); await flush();
    expect(t.audio.play).toHaveBeenCalledTimes(2);
    expect(t.blocked).toHaveBeenLastCalledWith(false);
    t.dispose(); track.dispatchEvent(new Event('unmute')); t.gestures.dispatchEvent(new Event('pointerup'));
    expect(t.audio.play).toHaveBeenCalledTimes(2); expect(t.audio.srcObject).toBeNull();
  });
  it('offers sound recovery after autoplay denial and clears it on a successful gesture', async () => {
    const t = mount(); t.audio.play.mockRejectedValueOnce({ name: 'NotAllowedError' });
    t.stream.tracks.push(new Track()); t.stream.dispatchEvent(new Event('addtrack')); await flush();
    expect(t.blocked).toHaveBeenLastCalledWith(true);
    t.gestures.dispatchEvent(new Event('pointerup')); await flush();
    expect(t.blocked).toHaveBeenLastCalledWith(false); t.dispose();
  });
  it('ignores an obsolete rejected play promise after newer playback succeeds', async () => {
    const t = mount(); let reject!: (reason: unknown) => void;
    t.audio.play.mockReturnValueOnce(new Promise((_resolve, no) => { reject = no; }));
    t.stream.tracks.push(new Track()); t.stream.dispatchEvent(new Event('addtrack'));
    t.gestures.dispatchEvent(new Event('keydown')); await flush();
    reject({ name: 'NotAllowedError' }); await flush();
    expect(t.blocked).not.toHaveBeenCalledWith(true); t.dispose();
  });
  it('does not label interrupted play as blocked or update an unmounted view', async () => {
    const t = mount(); t.audio.play.mockRejectedValueOnce({ name: 'AbortError' });
    t.stream.tracks.push(new Track()); t.stream.dispatchEvent(new Event('addtrack')); await flush();
    expect(t.blocked).not.toHaveBeenCalled();
    t.gestures.dispatchEvent(new Event('keydown')); t.dispose(); await flush();
    expect(t.blocked).not.toHaveBeenCalled();
  });
});
