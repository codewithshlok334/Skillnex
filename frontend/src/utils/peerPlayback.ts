/** Keep remote playback attached through late tracks and browser autoplay blocking. */
export function attachPeerAudio(
  element: HTMLAudioElement,
  stream: MediaStream,
  blocked: (value: boolean) => void,
  gestures: EventTarget = document,
) {
  let active = true;
  let attempt = 0;
  const watched = new Set<MediaStreamTrack>();
  element.srcObject = stream;
  element.muted = false;
  element.volume = 1;
  const play = () => {
    if (!active || !stream.getAudioTracks().some(track => track.readyState === 'live')) return;
    const current = ++attempt;
    void element.play().then(() => {
      if (active && current === attempt) blocked(false);
    }).catch(error => {
      // Track replacements interrupt pending play promises; this is not an autoplay denial.
      if (active && current === attempt && error?.name !== 'AbortError') blocked(true);
    });
  };
  const tracksChanged = () => {
    for (const track of stream.getAudioTracks()) if (!watched.has(track)) {
      watched.add(track);
      track.addEventListener('unmute', play);
    }
    play();
  };
  stream.addEventListener('addtrack', tracksChanged);
  element.addEventListener('loadedmetadata', play);
  gestures.addEventListener('pointerup', play);
  gestures.addEventListener('keydown', play);
  tracksChanged();
  return () => {
    active = false;
    stream.removeEventListener('addtrack', tracksChanged);
    watched.forEach(track => track.removeEventListener('unmute', play));
    element.removeEventListener('loadedmetadata', play);
    gestures.removeEventListener('pointerup', play);
    gestures.removeEventListener('keydown', play);
    element.pause();
    element.srcObject = null;
  };
}
