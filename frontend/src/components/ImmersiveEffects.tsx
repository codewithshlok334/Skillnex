import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';

const depthSelector =
  '.stat-card,.dimension-bento>a,.interview-grid>.card,.hero-banner,.interview-banner';
const revealSelector =
  '.dimension-section,.dimension-final,.dashboard-main>.card,.dashboard-side>.card';
const preferenceKey = 'careerx-ambient-motion';

export function ImmersiveEffects() {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) !== 'off';
    } catch {
      return true;
    }
  });
  const [visible, setVisible] = useState(!document.hidden);
  const canvas = useRef<HTMLCanvasElement>(null);
  const beam = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const active = enabled && !reduced && visible;

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.immersive = active ? 'on' : 'off';
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [active]);

  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - innerHeight;
      if (progress.current)
        progress.current.style.transform = `scaleX(${height > 0 ? scrollY / height : 0})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const root = document.getElementById('root');
    if (!root) return;
    const seen = new WeakSet<Element>();
    const tracked = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = 'visible';
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px 40px 0px', threshold: 0.05 },
    );
    const collect = (node: Element) => {
      const candidates = [
        ...node.querySelectorAll<HTMLElement>(`${depthSelector},${revealSelector}`),
      ];
      if (node.matches(`${depthSelector},${revealSelector}`)) candidates.push(node as HTMLElement);
      candidates.forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        tracked.add(element);
        if (element.matches(depthSelector)) element.dataset.depthCard = '';
        if (element.matches(revealSelector)) {
          element.dataset.reveal =
            element.getBoundingClientRect().top > innerHeight ? 'pending' : 'visible';
          if (element.dataset.reveal === 'pending') observer.observe(element);
        }
      });
    };
    collect(root);
    const mutations = new MutationObserver((records) =>
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) collect(node);
        }),
      ),
    );
    mutations.observe(root, { childList: true, subtree: true });
    let card: HTMLElement | null = null;
    let bounds: DOMRect | null = null;
    let frame = 0;
    const resetCard = () => {
      card?.style.removeProperty('--depth-x');
      card?.style.removeProperty('--depth-y');
      card?.classList.remove('depth-active');
      card = null;
      bounds = null;
    };
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      pointer.current = {
        x: event.clientX / innerWidth - 0.5,
        y: event.clientY / innerHeight - 0.5,
      };
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        beam.current?.style.setProperty('--beam-x', `${event.clientX}px`);
        beam.current?.style.setProperty('--beam-y', `${event.clientY}px`);
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-depth-card]')
            : null;
        if (target !== card) {
          resetCard();
          card = target;
          bounds = card?.getBoundingClientRect() ?? null;
        }
        if (!card || !bounds) return;
        const x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
        const y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
        const strength = card.matches('.hero-banner,.interview-banner') ? 3 : 7;
        card.style.setProperty('--depth-x', `${-y * strength}deg`);
        card.style.setProperty('--depth-y', `${x * strength}deg`);
        card.style.setProperty('--sheen-x', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--sheen-y', `${(y + 0.5) * 100}%`);
        card.classList.add('depth-active');
      });
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) resetCard();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', leave);
    window.addEventListener('scroll', resetCard, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resetCard();
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', leave);
      window.removeEventListener('scroll', resetCard);
      tracked.forEach((element) => {
        delete element.dataset.depthCard;
        delete element.dataset.reveal;
      });
    };
  }, [active, pathname]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const context = node.getContext('2d');
    if (!context) return;
    if (!active) {
      context.clearRect(0, 0, node.width, node.height);
      return;
    }
    let width = innerWidth,
      height = innerHeight;
    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      const scale = Math.min(devicePixelRatio || 1, 1.5);
      node.width = Math.round(width * scale);
      node.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: width < 650 ? 24 : 64 }, (_, index) => ({
      x: (((index * 0.6180339) % 1) - 0.5) * 2.8,
      y: (((index * 0.4142136) % 1) - 0.5) * 2.8,
      z: 0.5 + ((index * 0.7320508) % 1) * 1.8,
      size: 0.55 + (index % 3) * 0.28,
    }));
    let frame = 0,
      previous = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - previous < 33) return;
      const elapsed = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      previous = time;
      context.clearRect(0, 0, width, height);
      const dark = document.documentElement.dataset.theme !== 'light';
      for (const star of stars) {
        star.z -= elapsed * 0.025;
        if (star.z < 0.4) star.z = 2.3;
        const depth = 1 / star.z;
        const x = width / 2 + star.x * width * 0.48 * depth + pointer.current.x * 24 * depth;
        const y = height / 2 + star.y * height * 0.48 * depth + pointer.current.y * 18 * depth;
        if (x < 0 || x > width || y < 0 || y > height) continue;
        context.fillStyle = dark
          ? `rgba(225,225,225,${Math.min(0.22, 0.09 * depth)})`
          : `rgba(50,50,50,${Math.min(0.12, 0.04 * depth)})`;
        context.beginPath();
        context.arc(x, y, star.size * Math.min(depth, 1.7), 0, Math.PI * 2);
        context.fill();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      context.clearRect(0, 0, width, height);
    };
  }, [active]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(preferenceKey, next ? 'on' : 'off');
    } catch {}
  }

  return (
    <>
      <canvas ref={canvas} className="ambient-depth-field" aria-hidden="true" />
      <div ref={beam} className="ambient-cursor-light" aria-hidden="true" />
      <div ref={progress} className="ambient-scroll-progress" aria-hidden="true" />
      <button
        type="button"
        className={`ambient-motion-toggle${pathname.startsWith('/app') ? ' in-workspace' : ''}`}
        onClick={toggle}
        disabled={!!reduced}
        aria-pressed={enabled && !reduced}
        aria-label={
          reduced
            ? 'Motion reduced by device setting'
            : enabled
              ? 'Pause visual effects'
              : 'Resume visual effects'
        }
      >
        {enabled && !reduced ? <Pause size={13} /> : <Play size={13} />}
        <span>{reduced ? 'Reduced motion' : enabled ? 'Pause motion' : 'Resume motion'}</span>
      </button>
    </>
  );
}
