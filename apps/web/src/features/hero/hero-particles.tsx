'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createField,
  decodeTargets,
  layoutHomes,
  settle,
  stepField,
  type Box,
  type Field,
  type Pointer,
} from './particle-field';
import { PARTICLES_B64 } from './particles-data';

/** Theme tokens in the same order as the generator's color slots. */
const COLOR_TOKENS = [
  '--color-flame-red',
  '--color-flame-orange',
  '--color-ember',
  '--color-amber',
  '--color-ignition-gold',
  '--color-silver-mist',
];

type Props = { posterSrc: string; posterWidth: number; posterHeight: number };

/**
 * Decorative particle version of the logo. Starts when the browser is idle (the headline stays
 * the LCP element), sleeps when settled or off-screen, uses fewer particles on small devices, and
 * shows a static figure under reduced motion. On desktop the logo image is the no-JS/loading fallback.
 */
export function HeroParticles({ posterSrc, posterWidth, posterHeight }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!wrapper || !canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 768 || navigator.hardwareConcurrency <= 4;
    const targets = decodeTargets(PARTICLES_B64, small ? 700 : 1400);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const buckets = palette.map(() => [] as number[]);
    for (let i = 0; i < targets.count; i++) buckets[targets.color[i] ?? 0]?.push(i);

    const radius = small ? 2.4 : 3;
    let box: Box = { width: 0, height: 0 };
    let field: Field | null = null;
    let pointer: Pointer = null;
    let visible = true;
    let running = false;
    let frame = 0;

    const draw = () => {
      if (!field) return;
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.lineWidth = 1;
      buckets.forEach((indices, slot) => {
        ctx.strokeStyle = palette[slot] ?? '';
        ctx.beginPath();
        for (const i of indices) {
          const x = field?.px[i] ?? 0;
          const y = field?.py[i] ?? 0;
          const a = field?.angle[i] ?? 0;
          ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
          ctx.lineTo(x + Math.cos(a + 2.094) * radius, y + Math.sin(a + 2.094) * radius);
          ctx.lineTo(x + Math.cos(a + 4.189) * radius, y + Math.sin(a + 4.189) * radius);
          ctx.closePath();
        }
        ctx.stroke();
      });
    };

    const loop = () => {
      if (!field) return;
      const energy = stepField(field, pointer);
      draw();
      if (visible && (pointer !== null || energy > 0.01)) {
        frame = requestAnimationFrame(loop);
      } else {
        running = false; // sleep until the pointer moves or it scrolls back into view
      }
    };

    const wake = () => {
      if (running || reduced || !visible || !field) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      box = { width: wrapper.clientWidth, height: wrapper.clientHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!field) return;
      layoutHomes(field, targets, box);
      if (reduced) settle(field);
      draw();
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      wake();
    };
    const onPointerLeave = () => {
      pointer = null;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      wake();
    });

    const begin = () => {
      resize();
      field = createField(targets, box);
      if (reduced) settle(field);
      else {
        wrapper.addEventListener('pointermove', onPointerMove);
        wrapper.addEventListener('pointerleave', onPointerLeave);
      }
      resizeObserver.observe(wrapper);
      visibilityObserver.observe(wrapper);
      draw();
      setReady(true);
      wake();
    };

    // Older Safari lacks requestIdleCallback even though the DOM typings always declare it.
    const hasIdle = typeof (window.requestIdleCallback as unknown) === 'function';
    const idle = hasIdle
      ? window.requestIdleCallback(begin, { timeout: 1500 })
      : window.setTimeout(begin, 300);

    return () => {
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      wrapper.removeEventListener('pointermove', onPointerMove);
      wrapper.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto aspect-square w-full max-w-[520px] touch-pan-y"
    >
      <img
        src={posterSrc}
        alt=""
        width={posterWidth}
        height={posterHeight}
        // Desktop-only poster: on phones it would outsize the headline and become the LCP element.
        className={`absolute inset-0 hidden size-full object-contain transition-opacity duration-700 md:block ${ready ? 'opacity-0' : 'opacity-100'}`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 size-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
