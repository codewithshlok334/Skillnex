import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Users, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { initials } from '../utils/cn';
import { attachPeerAudio } from '../utils/peerPlayback';
import type { PeerParticipant } from '../utils/peerCall';

export function Portrait({ person, stream, camera, mic, self, label }: { person?: Pick<PeerParticipant,'name'|'photo_url'>; stream?: MediaStream | null; camera?: boolean; mic?: boolean; self?: boolean; label: string }) {
  const video = useRef<HTMLVideoElement>(null), audio = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const el = video.current; if (!el) return;
    let active = true;
    const tracks = new Set<MediaStreamTrack>();
    el.srcObject = stream || null;
    const play = () => {
      if (!active) return;
      setVideoReady(!!stream?.getVideoTracks().some(track => track.readyState === 'live' && !track.muted));
      if (stream) void el.play().catch(() => {});
    };
    const changed = () => {
      for (const track of stream?.getVideoTracks() || []) if (!tracks.has(track)) {
        tracks.add(track);
        for (const event of ['unmute', 'mute', 'ended']) track.addEventListener(event, play);
      }
      play();
    };
    changed(); stream?.addEventListener('addtrack', changed); stream?.addEventListener('removetrack', changed);
    return () => {
      active = false; stream?.removeEventListener('addtrack', changed); stream?.removeEventListener('removetrack', changed);
      for (const track of tracks) for (const event of ['unmute', 'mute', 'ended']) track.removeEventListener(event, play);
      el.pause(); el.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    setBlocked(false);
    if (!audio.current || self || !stream) return;
    return attachPeerAudio(audio.current, stream, setBlocked);
  }, [stream, self]);
  const showVideo = camera && videoReady;
  return <div className={`pp-person ${self ? 'pp-self' : ''} ${!person ? 'pp-person-empty' : ''}`}>
    <video ref={video} autoPlay playsInline muted className={showVideo ? 'is-visible' : ''} aria-label={self ? 'Your camera preview' : 'Partner video'} />
    {!self && <audio ref={audio} autoPlay aria-label="Partner audio" />}
    {!showVideo && <div className="pp-profile-fallback"><span className="pp-profile-orbit" /><span className="pp-profile-orbit pp-orbit-two" /><div className="pp-profile-photo">{person?.photo_url ? <img src={person.photo_url} alt={person.name} /> : person ? initials(person.name) : <Users size={34} />}</div><strong>{person?.name || 'Your partner’s place'}</strong><small>{person ? camera ? 'Connecting video…' : 'Camera is off' : 'A good conversation starts with two.'}</small></div>}
    <span className="pp-role-label">{label}</span>
    <div className="pp-person-name"><span>{person ? `${person.name}${self ? ' (you)' : ''}` : 'Waiting for a partner'}</span>{mic ? <Mic size={15} /> : <MicOff size={15} />}</div>
    {blocked && !self && stream && <button className="pp-enable-audio" onClick={() => void audio.current?.play().then(() => setBlocked(false)).catch(() => toast.error('Allow sound for this site in your browser, then try again.'))}><Volume2 size={16} /> Hear your partner</button>}
  </div>;
}
