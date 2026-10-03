'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  createField,
  createFieldAt,
  decodeTargets,
  layoutHomes,
  settle,
  stepField,
  type Box,
  type Field,
} from './particle-field';
import { PARTICLES_B64 } from './particles-data';
import {
  assignShapes,
  easeOutCubic,
  flameMask,
  gradientSlot,
  MOTO_PATH,
  pairStartPoints,
  pointFromEdges,
  rotateAround,
} from './sequence';

/** Theme tokens in generator color-slot order. */
const COLOR_TOKENS = [
  '--color-flame-red',
  '--color-flame-orange',
  '--color-ember',
  '--color-amber',
  '--color-ignition-gold',
  '--color-silver-mist',
];
const FRAME_MS = 1000 / 60;
const POINTER_IDLE_MS = 200;
/** Timeline (ms). */
const HOLD_MS = 300; // wordmark visible before it disintegrates
const MOTO_MS = 1000; // motorcycle assembles while the flame particles fly around
const SPIN_MS = 500; // flame ring spins into place
const SPIN_ANGLE = Math.PI * 0.9;
/** Mean per-particle energy under which a flight counts as "arrived". */
const ARRIVED = 0.02;

/**
 * TEMPORARY A/B: both variants render stacked on the page for the client to compare. Remove the
 * losing variant before merge. Both share the logo choreography; they differ in how the
 * wordmark comes back: A types it letter by letter, B forms it from particles arriving from
 * every edge.
 */
const VARIANTS = { a: { rewrite: 'type' }, b: { rewrite: 'particles' } } as const;
export type HeroVariant = keyof typeof VARIANTS;

/** `radius` (triangles) and `icon` (motorcycle size) in px; the text layer uses finer particles. */
type Layer = { field: Field; shapes: Uint8Array; radius: number; icon: number };
type Phase = 'hold' | 'moto' | 'spin' | 'rewrite' | 'done';

/**
 * Hero sequence: the server-rendered wordmark (painted before any script, LCP) disintegrates,
 * the particles build the motorcycle while the flame particles fly loose, the flame ring spins
 * into place, then the wordmark comes back. The h1 stays in the DOM the whole time (only its
 * opacity changes). Reduced motion: no sequence, static logo, text always visible.
 */
export function HeroStage({
  children,
  variant: variantId,
}: {
  children: ReactNode;
  variant: HeroVariant;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const logoBox = logoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const wordmark = stage?.querySelector<HTMLElement>('[data-wordmark]');
    if (!stage || !logoBox || !canvas || !ctx || !wordmark) return;

    const variant = VARIANTS[variantId];
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cores = (navigator.hardwareConcurrency as number | undefined) ?? 4;
    const small = window.innerWidth < 768 || cores <= 4;
    const targets = decodeTargets(PARTICLES_B64, small ? 700 : 1300);
    const flame = flameMask(targets.x, targets.y);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    const radius = small ? 2.4 : 3;
    const iconSize = small ? 9 : 11;
    // Finer particles for the re-formed wordmark so the letters stay legible.
    const textRadius = small ? 1.4 : 1.8;
    const textIcon = small ? 5 : 7;

    // Motorcycle icons are drawn once per (size, color) into sprites, then stamped every frame.
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (size: number, slot: number) => {
      const key = `${size}-${slot}`;
      let image = sprites.get(key);
      if (!image) {
        image = document.createElement('canvas');
        image.width = image.height = Math.ceil(size * dpr);
        const sctx = image.getContext('2d');
        if (sctx) {
          sctx.scale((size * dpr) / 24, (size * dpr) / 24);
          sctx.fillStyle = palette[slot] ?? 'currentColor';
          sctx.fill(new Path2D(MOTO_PATH), 'evenodd');
        }
        sprites.set(key, image);
      }
      return image;
    };

    let canvasBox: Box = { width: 0, height: 0 };
    let logo: Layer | null = null;
    let text: Layer | null = null; // variant B: particles forming the wordmark
    let baseHomeX = new Float32Array(0); // final logo homes (flame ring is rotated from these)
    let baseHomeY = new Float32Array(0);
    let phase: Phase = 'done';
    let phaseStart = 0;
    const pointer = { x: 0, y: 0, lastMove: Number.NEGATIVE_INFINITY };
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let holdTimer = 0;

    const logoArea = (): Box => {
      const stageRect = stage.getBoundingClientRect();
      const rect = logoBox.getBoundingClientRect();
      return {
        x: rect.left - stageRect.left,
        y: rect.top - stageRect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const sizeCanvas = () => {
      canvasBox = { width: stage.clientWidth, height: stage.clientHeight };
      canvas.width = Math.round(canvasBox.width * dpr);
      canvas.height = Math.round(canvasBox.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawLayer = ({ field, shapes, radius: r, icon }: Layer) => {
      ctx.lineWidth = 1;
      for (let slot = 0; slot < palette.length; slot++) {
        ctx.strokeStyle = palette[slot] ?? 'currentColor';
        ctx.beginPath();
        for (let i = 0; i < field.count; i++) {
          if (shapes[i] !== 0 || field.color[i] !== slot) continue;
          const x = field.px[i] ?? 0;
          const y = field.py[i] ?? 0;
          const a = field.angle[i] ?? 0;
          ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a + 2.094) * r, y + Math.sin(a + 2.094) * r);
          ctx.lineTo(x + Math.cos(a + 4.189) * r, y + Math.sin(a + 4.189) * r);
          ctx.closePath();
        }
        ctx.stroke();
      }
      const half = icon / 2;
      for (let i = 0; i < field.count; i++) {
        if (shapes[i] !== 1) continue;
        ctx.drawImage(
          sprite(icon, field.color[i] ?? 0),
          (field.px[i] ?? 0) - half,
          (field.py[i] ?? 0) - half,
          icon,
          icon,
        );
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);
      if (logo) drawLayer(logo);
      if (text) drawLayer(text);
    };

    /** Samples the rendered wordmark into points (canvas coordinates) with gradient color slots. */
    const sampleWordmark = (count: number) => {
      const stageRect = stage.getBoundingClientRect();
      const rect = wordmark.getBoundingClientRect();
      const style = getComputedStyle(wordmark);
      const off = document.createElement('canvas');
      off.width = Math.ceil(rect.width);
      off.height = Math.ceil(rect.height);
      const octx = off.getContext('2d', { willReadFrequently: true });
      const xs: number[] = [];
      const ys: number[] = [];
      if (octx) {
        octx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        octx.textBaseline = 'middle';
        octx.fillText(wordmark.textContent, 0, off.height / 2);
        const { data } = octx.getImageData(0, 0, off.width, off.height);
        for (let y = 0; y < off.height; y += 2) {
          for (let x = 0; x < off.width; x += 2) {
            if ((data[(y * off.width + x) * 4 + 3] ?? 0) > 128) {
              xs.push(x);
              ys.push(y);
            }
          }
        }
      }
      const offsetX = rect.left - stageRect.left;
      const offsetY = rect.top - stageRect.top;
      const x = new Float32Array(count);
      const y = new Float32Array(count);
      const color = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        const j = xs.length ? Math.floor(Math.random() * xs.length) : 0;
        x[i] = offsetX + (xs[j] ?? 0);
        y[i] = offsetY + (ys[j] ?? 0);
        color[i] = gradientSlot((xs[j] ?? 0) / Math.max(1, off.width));
      }
      return { x, y, color };
    };

    /** Flame particles drift toward random points around the stage while the motorcycle forms. */
    const scatterFlame = (field: Field) => {
      for (let i = 0; i < field.count; i++) {
        if (!flame[i]) continue;
        field.hx[i] = Math.random() * canvasBox.width;
        field.hy[i] = Math.random() * canvasBox.height;
      }
    };

    /** During the spin, flame homes rotate (eased) from SPIN_ANGLE back to their final place. */
    const spinFlame = (field: Field, progress: number) => {
      const area = logoArea();
      const cx = (area.x ?? 0) + area.width / 2;
      const cy = (area.y ?? 0) + area.height / 2;
      const angle = SPIN_ANGLE * (1 - easeOutCubic(progress));
      for (let i = 0; i < field.count; i++) {
        if (!flame[i]) continue;
        const point = rotateAround(baseHomeX[i] ?? 0, baseHomeY[i] ?? 0, cx, cy, angle);
        field.hx[i] = point.x;
        field.hy[i] = point.y;
      }
    };

    const showWordmark = () => {
      if (variant.rewrite === 'type') {
        wordmark.dataset.state = 'typing';
        phase = 'done';
        return;
      }
      // Particles arrive from every edge and form the letters; then the real text fades in.
      const goal = sampleWordmark(small ? 900 : 1600);
      const from = { x: new Float32Array(goal.x.length), y: new Float32Array(goal.x.length) };
      for (let i = 0; i < goal.x.length; i++) {
        const point = pointFromEdges(canvasBox);
        from.x[i] = point.x;
        from.y[i] = point.y;
      }
      text = {
        field: createFieldAt(from, goal, goal.color),
        shapes: assignShapes(goal.x.length, 0.5),
        radius: textRadius,
        icon: textIcon,
      };
      phase = 'rewrite';
    };

    const loop = (time: number) => {
      const dt = Math.min(Math.max((time - lastTime) / FRAME_MS, 0.25), 2);
      lastTime = time;
      const elapsed = time - phaseStart;

      if (logo && phase === 'moto') {
        if (Math.floor(elapsed / 400) !== Math.floor((elapsed - dt * FRAME_MS) / 400))
          scatterFlame(logo.field);
        if (elapsed >= MOTO_MS) {
          phase = 'spin';
          phaseStart = time;
        }
      } else if (logo && phase === 'spin') {
        spinFlame(logo.field, elapsed / SPIN_MS);
        if (elapsed >= SPIN_MS) {
          logo.field.hx.set(baseHomeX);
          logo.field.hy.set(baseHomeY);
          showWordmark();
          phaseStart = time;
        }
      }

      const active = phase === 'done' && time - pointer.lastMove < POINTER_IDLE_MS;
      const logoEnergy = logo ? stepField(logo.field, active ? pointer : null, dt) : 0;
      const textEnergy = text ? stepField(text.field, null, dt) : 0;
      draw();

      if (phase === 'rewrite' && text && textEnergy / text.field.count < ARRIVED) {
        wordmark.dataset.state = 'shown';
        phase = 'done';
        window.setTimeout(() => {
          text = null;
          draw();
        }, 300);
      }

      const busy = phase !== 'done' || active || logoEnergy > 0.01 || textEnergy > 0.01;
      if (busy) frame = requestAnimationFrame(loop);
      else running = false;
    };

    const wake = () => {
      if (running || motionQuery.matches) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const stageRect = stage.getBoundingClientRect();
      const area = logoArea();
      const x = event.clientX - stageRect.left;
      const y = event.clientY - stageRect.top;
      const ax = area.x ?? 0;
      const ay = area.y ?? 0;
      if (x < ax || x > ax + area.width || y < ay || y > ay + area.height) return;
      pointer.x = x;
      pointer.y = y;
      pointer.lastMove = performance.now();
      wake();
    };

    const finishNow = () => {
      if (!logo) return;
      window.clearTimeout(holdTimer);
      logo.field.hx.set(baseHomeX);
      logo.field.hy.set(baseHomeY);
      text = null;
      wordmark.dataset.state = 'shown';
      phase = 'done';
    };

    const onResize = () => {
      // ResizeObserver also fires once right after observe(): ignore callbacks without a real change.
      if (
        !logo ||
        (stage.clientWidth === canvasBox.width && stage.clientHeight === canvasBox.height)
      )
        return;
      sizeCanvas();
      layoutHomes(logo.field, targets, logoArea());
      baseHomeX = logo.field.hx.slice();
      baseHomeY = logo.field.hy.slice();
      if (phase !== 'done') finishNow(); // skip to the end state instead of re-sampling moving text
      if (motionQuery.matches) settle(logo.field);
      draw();
      wake();
    };

    const resizeObserver = new ResizeObserver(onResize);

    const begin = async () => {
      await document.fonts.ready;
      sizeCanvas();
      const field = createField(targets, logoArea());
      baseHomeX = field.hx.slice();
      baseHomeY = field.hy.slice();
      logo = { field, shapes: assignShapes(field.count, 0.5), radius, icon: iconSize };
      stage.addEventListener('pointermove', onPointerMove);
      resizeObserver.observe(stage);
      canvas.dataset.ready = 'true';

      if (motionQuery.matches) {
        settle(field);
        draw();
        return;
      }

      // 1) Hold the wordmark, 2) disintegrate it: particles start on the letters (color-paired).
      phase = 'hold';
      holdTimer = window.setTimeout(() => {
        const start = sampleWordmark(field.count);
        const pairs = pairStartPoints(field.color, start.x);
        for (let i = 0; i < field.count; i++) {
          const point = pairs[i] ?? 0;
          field.px[i] = start.x[point] ?? 0;
          field.py[i] = start.y[point] ?? 0;
          const direction = Math.random() * Math.PI * 2;
          field.vx[i] = Math.cos(direction) * 2.5;
          field.vy[i] = Math.sin(direction) * 2.5;
        }
        scatterFlame(field);
        wordmark.dataset.state = 'hidden';
        phase = 'moto';
        phaseStart = performance.now();
        wake();
      }, HOLD_MS);
    };

    // Start once the browser is idle AND the stage is on screen, so the sequence is actually seen.
    const startObserver = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      startObserver.disconnect();
      void begin();
    });
    const watch = () => {
      startObserver.observe(stage);
    };
    const hasIdle = typeof (window.requestIdleCallback as unknown) === 'function';
    const idle = hasIdle
      ? window.requestIdleCallback(watch, { timeout: 1500 })
      : window.setTimeout(watch, 300);

    return () => {
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.clearTimeout(holdTimer);
      cancelAnimationFrame(frame);
      startObserver.disconnect();
      resizeObserver.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      wordmark.dataset.state = 'shown';
    };
  }, [variantId]);

  return (
    <div ref={stageRef} className="relative grid items-center gap-36 md:grid-cols-[1.2fr_1fr]">
      {children}
      {/* Target area for the particle logo (after the copy on mobile: CTAs stay above the fold). */}
      <div
        ref={logoRef}
        aria-hidden="true"
        className="mx-auto aspect-square w-full max-w-[340px] touch-pan-y touch-pinch-zoom md:max-w-[520px]"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300 data-[ready=true]:opacity-100"
      />
    </div>
  );
}
