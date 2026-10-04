import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, Mic, UserRound } from 'lucide-react';
import { Button } from './ui/button';
import { mediaError } from '../utils/interviewVoice';

export function InterviewCamera({
  listening,
  controlsTarget,
}: {
  listening: boolean;
  controlsTarget?: HTMLElement | null;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const media = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const requesting = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
      media.current?.getTracks().forEach((t) => t.stop());
      media.current = null;
    },
    [],
  );
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  function stop() {
    generation.current++;
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    setStream(null);
  }
  async function start() {
    if (requesting.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera preview is unavailable in this browser. Continue with voice or text.');
      return;
    }
    requesting.current = true;
    setPending(true);
    setError('');
    const token = ++generation.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
      if (token !== generation.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      media.current = next;
      setStream(next);
      next.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (media.current === next) {
            next.getTracks().forEach((t) => t.stop());
            media.current = null;
            setStream(null);
            setError('Camera preview stopped. You can enable it again.');
          }
        };
      });
    } catch (error) {
      if (token === generation.current)
        setError(mediaError(error, 'Camera'));
    } finally {
      requesting.current = false;
      if (token === generation.current) setPending(false);
    }
  }
  const toggle = (
    <Button
      className={controlsTarget ? 'meeting-tool' + (stream ? ' enabled' : '') : undefined}
      size="sm"
      variant="secondary"
      aria-pressed={!!stream}
      disabled={pending}
      onClick={() => (stream ? stop() : start())}
    >
      {stream ? <Camera size={20} /> : <CameraOff size={20} />}
      <span>{pending ? 'Opening camera…' : stream ? 'Stop camera' : 'Start camera'}</span>
    </Button>
  );
  return (
    <section className="studio-candidate" aria-label="Your camera preview">
      <div className={'studio-camera-view ' + (stream ? 'camera-on' : '')}>
        {stream ? (
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Your local camera preview"
          />
        ) : (
          <div className="studio-camera-placeholder">
            <UserRound size={42} />
            <span>You</span>
            <small>Your camera is off</small>
          </div>
        )}
        <span className="studio-camera-badge">
          {listening ? <Mic size={12} /> : <UserRound size={12} />}You ·{' '}
          {listening ? 'Mic on' : stream ? 'Camera on' : 'Camera off'}
        </span>
      </div>
      <div className="studio-camera-controls">
        <small>Local preview only. No video is saved or sent.</small>
        {controlsTarget ? createPortal(toggle, controlsTarget) : toggle}
      </div>
      {error && (
        <p className="interview-input-notice" role="status">
          {error}
        </p>
      )}
    </section>
  );
}
