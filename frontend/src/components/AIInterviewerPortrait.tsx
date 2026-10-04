import { useEffect, useRef, useState } from "react";
import { mouthOpening, portraitMouth } from "../utils/portraitMotion";

export function AIInterviewerPortrait({ speaking, gender, pulse = 0, audioOpening }: {
  speaking: boolean; gender: "female" | "male"; pulse?: number; audioOpening?: number;
}) {
  const name = gender === "female" ? "Maya" : "Aarav";
  const canvas = useRef<HTMLCanvasElement>(null);
  const motion = useRef({ speaking, pulse, audioOpening });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  motion.current = { speaking, pulse, audioOpening };
  useEffect(() => {
    const image = new Image();
    let frame = 0, disposed = false, last = 0, began = 0, wasSpeaking = false;
    setReady(false);
    setFailed(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let repaint: (() => void) | undefined;
    const wake = () => repaint?.();
    image.onload = () => {
      const surface = canvas.current, context = surface?.getContext("2d");
      if (!surface || !context || disposed) return;
      const w = Math.min(image.naturalWidth, 1200);
      const h = Math.round(w * image.naturalHeight / image.naturalWidth);
      surface.width = w; surface.height = h;
      const mouth = portraitMouth[gender];
      const cx = w * mouth.x, cy = h * mouth.y, half = w * mouth.halfWidth;
      const rx = half * 1.65, ry = h * 0.10;
      const patch = document.createElement("canvas");
      patch.width = Math.ceil(rx * 2); patch.height = Math.ceil(ry * 2);
      const texture = patch.getContext("2d");
      if (!texture) { setFailed(true); return; }
      texture.translate(rx, ry);
      texture.rotate(-mouth.angle);
      texture.drawImage(image, -cx, -cy, w, h);
      const warped = document.createElement("canvas");
      warped.width = patch.width; warped.height = patch.height;
      const layer = warped.getContext("2d");
      if (!layer) { setFailed(true); return; }
      const render = (opening: number) => {
        context.drawImage(image, 0, 0, w, h);
        if (opening < 0.015) return;
        const gap = h * 0.026 * opening;
        layer.clearRect(0, 0, warped.width, warped.height);
        // Shift the lower lip and chin, fading out toward the surrounding skin.
        for (let row = 0; row < patch.height; row++) {
          const y = row - ry;
          const lower = Math.max(0, Math.min(1, (y + 4) / 12));
          const falloff = Math.max(0, 1 - Math.max(0, y - 18) / (ry - 18));
          const displacement = gap * lower * falloff * falloff;
          layer.drawImage(patch, 0, row - displacement, patch.width, 1, 0, row, patch.width, 1);
        }
        layer.globalCompositeOperation = "destination-in";
        const feather = layer.createRadialGradient(rx, ry, half * 0.9, rx, ry, rx);
        feather.addColorStop(0, "#000"); feather.addColorStop(1, "transparent");
        layer.fillStyle = feather;
        layer.fillRect(0, 0, patch.width, patch.height);
        layer.globalCompositeOperation = "source-over";
        context.save(); context.translate(cx, cy); context.rotate(mouth.angle);
        context.drawImage(warped, -rx, -ry);
        // Reveal an opening along the lip seam rather than stretching a closed mouth.
        context.beginPath(); context.moveTo(-half, -3);
        context.quadraticCurveTo(0, 5 - gap * 0.1, half, -3);
        context.quadraticCurveTo(0, 5 + gap * 1.7, -half, -3);
        context.closePath(); context.clip();
        const inside = context.createLinearGradient(0, 0, 0, gap + 8);
        inside.addColorStop(0, "#29191b"); inside.addColorStop(0.65, "#401f26"); inside.addColorStop(1, "#69333d");
        context.fillStyle = inside; context.fillRect(-half, -6, half * 2, gap * 2 + 15);
        if (gap > 3) {
          context.fillStyle = "#d9c8b8";
          context.beginPath(); context.moveTo(-half * 0.73, -2);
          context.quadraticCurveTo(0, 3, half * 0.73, -2);
          context.lineTo(half * 0.68, Math.min(6, gap * 0.35));
          context.quadraticCurveTo(0, Math.min(9, gap * 0.5), -half * 0.68, Math.min(6, gap * 0.35));
          context.fill();
        }
        context.restore();
      };
      function draw(now: number) {
        if (disposed) return;
        frame = requestAnimationFrame(draw);
        if (now - last < 33) return;
        last = now;
        const animate = motion.current.speaking && (motion.current.audioOpening !== undefined || !reduced.matches) && !document.hidden;
        if (!animate) {
          if (wasSpeaking) render(0);
          wasSpeaking = false; return;
        }
        if (!wasSpeaking) began = now;
        wasSpeaking = true;
        render(motion.current.audioOpening ?? mouthOpening(now - began, now - motion.current.pulse, true));
      }
      repaint = () => { render(0); wasSpeaking = false; };
      render(0); setReady(true);
      frame = requestAnimationFrame(draw);
    };
    image.onerror = () => { if (!disposed) setFailed(true); };
    image.src = "/images/" + name.toLowerCase() + "-ai-interviewer.png";
    reduced.addEventListener("change", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      disposed = true; cancelAnimationFrame(frame);
      image.onload = image.onerror = null;
      reduced.removeEventListener("change", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [name, gender]);
  return <div className={"female-interviewer" + (speaking ? " is-speaking" : "")}>
    <img src={"/images/" + name.toLowerCase() + "-ai-interviewer.png"} alt={name + ", a fictional " + gender + " AI interviewer"}/>
    <canvas ref={canvas} aria-hidden="true" className="interviewer-mouth-motion" style={{opacity:ready && !failed ? 1 : 0}}/>
    <div className="female-interviewer-shade"/>
    <span className="female-interviewer-disclosure">AI portrait · {audioOpening !== undefined ? "Audio-driven lips" : "Speech boundary motion"}{failed ? " unavailable" : ""}</span>
    <div className="female-interviewer-wave" aria-hidden="true">{[0,1,2,3,4].map(n=><i key={n} style={{animationDelay:`${n * 100}ms`}}/>)}</div>
  </div>;
}
