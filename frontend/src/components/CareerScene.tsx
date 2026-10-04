import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight, AudioLines, Check, FileText, Pause, Play, Sparkles } from 'lucide-react';
import './career-scene.css';

/** CSS perspective scene: no network assets or WebGL required. */
export function CareerScene({ compact = false }: { compact?: boolean }) {
  const plane = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const still = paused || reduced;
  function move(event: PointerEvent<HTMLDivElement>) {
    if (still || event.pointerType !== 'mouse' || !plane.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    plane.current.style.setProperty(
      '--scene-x',
      `${((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 14}deg`,
    );
    plane.current.style.setProperty(
      '--scene-y',
      `${(-(event.clientY - bounds.top - bounds.height / 2) / bounds.height) * 10}deg`,
    );
  }
  function reset() {
    plane.current?.style.setProperty('--scene-x', '0deg');
    plane.current?.style.setProperty('--scene-y', '0deg');
  }
  return (
    <div
      className={`career-scene${compact ? ' scene-compact' : ''}${still ? ' scene-still' : ''}`}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <div className="scene-art" aria-hidden="true">
        <div className="scene-halo" />
        <div className="scene-floor" />
        <div className="scene-plane" ref={plane}>
          <div className="scene-orbit scene-orbit-one">
            <i />
          </div>
          <div className="scene-orbit scene-orbit-two">
            <i />
          </div>
          <div className="scene-orbit scene-orbit-three" />
          <div className="scene-sphere">
            <div className="sphere-latitudes">
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} style={{ '--latitude': `${index * 18}deg` } as CSSProperties} />
              ))}
            </div>
            <div className="sphere-shine" />
            <Sparkles className="sphere-symbol" size={64} strokeWidth={1.2} />
          </div>
          <div className="scene-chip scene-chip-resume">
            <span className="scene-chip-icon">
              <FileText size={19} />
            </span>
            <div>
              <small>YOUR NEXT OPPORTUNITY</small>
              <strong>A stronger first impression</strong>
              <span className="scene-mini-lines">
                <i />
                <i />
                <i />
              </span>
            </div>
            <Check size={16} />
          </div>
          <div className="scene-chip scene-chip-interview">
            <span className="scene-chip-icon">
              <AudioLines size={21} />
            </span>
            <div>
              <small>INTERVIEW PRACTICE</small>
              <strong>Find your confident voice.</strong>
              <span className="scene-wave">
                {Array.from({ length: 17 }, (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        '--wave': `${0.3 + (index % 5) * 0.15}s`,
                        height: `${7 + ((index * 7) % 20)}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </span>
            </div>
          </div>
          <div className="scene-chip scene-chip-goal">
            <ArrowUpRight size={22} />
            <div>
              <small>ONE STEP CLOSER</small>
              <strong>Your next chapter</strong>
            </div>
          </div>
          <span className="scene-star scene-star-one">✦</span>
          <span className="scene-star scene-star-two">✦</span>
        </div>
      </div>
      {!compact && (
        <div className="scene-caption">
          <span>
            <i /> YOUR POTENTIAL, IN MOTION
          </span>
          <button
            type="button"
            onClick={() => {
              setPaused(!paused);
              reset();
            }}
            disabled={!!reduced}
            aria-pressed={!!still}
            aria-label={still ? 'Resume 3D animation' : 'Pause 3D animation'}
          >
            {still ? <Play size={12} /> : <Pause size={12} />}
            {reduced ? 'Reduced motion' : paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      )}
    </div>
  );
}
