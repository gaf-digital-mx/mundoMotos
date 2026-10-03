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
/** A resting pointer stops counting after this long, so the loop can sleep. */
const POINTER_IDLE_MS = 200;
const FRAME_MS = 1000 / 60;

/**
 * Decorative particle version of the logo. It starts when the browser is idle and fades in, so
 * the headline is always the LCP element (there is deliberately no image poster). It sleeps when
 * settled, idle or off-screen, uses fewer particles and a lower pixel ratio on small devices, and
 * shows a static figure under reduced motion (also when that preference changes at runtime).
 */
export function HeroParticles() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!wrapper || !canvas || !ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // hardwareConcurrency can be undefined at runtime despite its typing: treat unknown as low-end.
    const cores = (navigator.hardwareConcurrency as number | undefined) ?? 4;
    const small = window.innerWidth < 768 || cores <= 4;
    const targets = decodeTargets(PARTICLES_B64, small ? 700 : 1400);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    // Particle indices grouped by color: one stroke() per color per frame.
    const buckets = palette.map(() => [] as number[]);
    for (let i = 0; i < targets.count; i++) buckets[targets.color[i] ?? 0]?.push(i);

    const radius = small ? 2.4 : 3;
    const pointer = { x: 0, y: 0, lastMove: Number.NEGATIVE_INFINITY };
    let reduced = motionQuery.matches;
    let box: Box = { width: 0, height: 0 };
    let field: Field | null = null;
    let visible = true;
    let running = false;
    let frame = 0;
    let lastTime = 0;

    const draw = (f: Field) => {
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.lineWidth = 1;
      for (let slot = 0; slot < buckets.length; slot++) {
        const indices = buckets[slot] ?? [];
        ctx.strokeStyle = palette[slot] ?? 'currentColor';
        ctx.beginPath();
        for (const i of indices) {
          const x = f.px[i] ?? 0;
          const y = f.py[i] ?? 0;
          const a = f.angle[i] ?? 0;
          ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
          ctx.lineTo(x + Math.cos(a + 2.094) * radius, y + Math.sin(a + 2.094) * radius);
          ctx.lineTo(x + Math.cos(a + 4.189) * radius, y + Math.sin(a + 4.189) * radius);
          ctx.closePath();
        }
        ctx.stroke();
      }
    };

    const loop = (time: number) => {
      if (!field) return;
      const dt = Math.min(Math.max((time - lastTime) / FRAME_MS, 0.25), 2); // clamp tab-switch gaps
      lastTime = time;
      const active = time - pointer.lastMove < POINTER_IDLE_MS;
      const energy = stepField(field, active ? pointer : null, dt);
      draw(field);
      if (visible && (active || energy > 0.01)) frame = requestAnimationFrame(loop);
      else running = false; // sleep until the pointer moves or the figure scrolls back into view
    };

    const wake = () => {
      if (running || reduced || !visible || !field) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (width === box.width && height === box.height) return;
      box = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!field) return;
      layoutHomes(field, targets, box);
      if (reduced) settle(field);
      draw(field);
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.lastMove = performance.now();
      wake();
    };
    const onPointerLeave = () => {
      pointer.lastMove = Number.NEGATIVE_INFINITY;
    };
    const onMotionChange = () => {
      reduced = motionQuery.matches;
      if (!field) return;
      if (reduced) {
        cancelAnimationFrame(frame);
        running = false;
        settle(field);
        draw(field);
      } else wake();
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
      wrapper.addEventListener('pointermove', onPointerMove);
      wrapper.addEventListener('pointerleave', onPointerLeave);
      motionQuery.addEventListener('change', onMotionChange);
      resizeObserver.observe(wrapper);
      visibilityObserver.observe(wrapper);
      draw(field);
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
      motionQuery.removeEventListener('change', onMotionChange);
      setReady(false);
    };
  }, []);

  return (
    // pan-y + pinch-zoom: vertical scrolling and page zoom keep working over the figure.
    <div
      ref={wrapperRef}
      className="relative mx-auto aspect-square w-full max-w-[520px] touch-pan-y touch-pinch-zoom"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 size-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
