'use client';

import { useEffect, useRef, type ReactNode } from 'react';

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
import {
  assignShapes,
  easeInOutCubic,
  easeOutCubic,
  flameMask,
  MOTO_PATH,
  pairStartPoints,
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
  '--color-graphite',
];
const FRAME_MS = 1000 / 60;
const POINTER_IDLE_MS = 200;
/** Timeline (ms). */
const HOLD_MS = 300; // wordmark visible before it disintegrates
const FLOAT_MS = 1200; // every particle floats softly around the hero
const MOTO_MS = 1000; // the motorcycle forms; flame particles keep floating
const SPIN_MS = 500; // the flame ring spins into place
const SPIN_ANGLE = Math.PI * 0.9;
/** Weak spring + high damping toward drifting targets reads as "floating". */
const FLOAT_SPRING = 0.006;
const FLOAT_DAMPING = 0.94;
const WANDER_EVERY_MS = 350;
/** Max wobble (px) of motorcycle particles while they glide in; fades to 0 on arrival. */
const WOBBLE = 6;

type Phase = 'hold' | 'float' | 'moto' | 'spin' | 'done';

/**
 * Hero sequence: the server-rendered wordmark (painted before any script, LCP) disintegrates
 * into particles that float softly around the hero; the motorcycle glides into shape over 1 s
 * while the flame particles keep floating; the flame ring spins into place; then the wordmark
 * is typed again. The h1 stays in the DOM the whole time (only its opacity changes).
 * Reduced motion: no sequence, static logo, text always visible.
 */
export function HeroStage({ children }: { children: ReactNode }) {
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

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cores = (navigator.hardwareConcurrency as number | undefined) ?? 4;
    const small = window.innerWidth < 768 || cores <= 4;
    const targets = decodeTargets(PARTICLES_B64, small ? 800 : 1600);
    const flame = flameMask(targets.x, targets.y);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    const radius = small ? 2.4 : 3;
    const iconSize = small ? 9 : 11;

    // Motorcycle icons are drawn once per color into sprites, then stamped every frame.
    const sprites: (HTMLCanvasElement | undefined)[] = [];
    const sprite = (slot: number) => {
      let image = sprites[slot];
      if (!image) {
        image = document.createElement('canvas');
        image.width = image.height = Math.ceil(iconSize * dpr);
        const sctx = image.getContext('2d');
        if (sctx) {
          sctx.scale((iconSize * dpr) / 24, (iconSize * dpr) / 24);
          sctx.fillStyle = palette[slot] ?? 'currentColor';
          sctx.fill(new Path2D(MOTO_PATH), 'evenodd');
        }
        sprites[slot] = image;
      }
      return image;
    };

    let canvasBox: Box = { width: 0, height: 0 };
    let field: Field | null = null;
    let shapes = new Uint8Array(0);
    let baseHomeX = new Float32Array(0); // final logo positions
    let baseHomeY = new Float32Array(0);
    let glideFromX = new Float32Array(0); // motorcycle particles: where the glide starts
    let glideFromY = new Float32Array(0);
    let wobblePhase = new Float32Array(0);
    let phase: Phase = 'done';
    let phaseStart = 0;
    let lastWander = 0;
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

    const draw = () => {
      ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);
      if (!field) return;
      ctx.lineWidth = 1;
      for (let slot = 0; slot < palette.length; slot++) {
        ctx.strokeStyle = palette[slot] ?? 'currentColor';
        ctx.beginPath();
        for (let i = 0; i < field.count; i++) {
          if (shapes[i] !== 0 || field.color[i] !== slot) continue;
          const x = field.px[i] ?? 0;
          const y = field.py[i] ?? 0;
          const a = field.angle[i] ?? 0;
          ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
          ctx.lineTo(x + Math.cos(a + 2.094) * radius, y + Math.sin(a + 2.094) * radius);
          ctx.lineTo(x + Math.cos(a + 4.189) * radius, y + Math.sin(a + 4.189) * radius);
          ctx.closePath();
        }
        ctx.stroke();
      }
      const half = iconSize / 2;
      for (let i = 0; i < field.count; i++) {
        if (shapes[i] !== 1) continue;
        ctx.drawImage(
          sprite(field.color[i] ?? 0),
          (field.px[i] ?? 0) - half,
          (field.py[i] ?? 0) - half,
          iconSize,
          iconSize,
        );
      }
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
      const x = new Float32Array(count);
      const y = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const j = xs.length ? Math.floor(Math.random() * xs.length) : 0;
        x[i] = rect.left - stageRect.left + (xs[j] ?? 0);
        y[i] = rect.top - stageRect.top + (ys[j] ?? 0);
      }
      return { x, y };
    };

    /** Floating particles drift toward new random points around the hero, a few at a time. */
    const wander = (f: Field, onlyFlame: boolean) => {
      for (let i = 0; i < f.count; i++) {
        if ((onlyFlame && !flame[i]) || Math.random() > 0.35) continue;
        f.hx[i] = Math.random() * canvasBox.width;
        f.hy[i] = Math.random() * canvasBox.height;
      }
    };

    /** During the spin, flame homes rotate (eased) from SPIN_ANGLE back to their final place. */
    const spinFlame = (f: Field, progress: number) => {
      const area = logoArea();
      const cx = (area.x ?? 0) + area.width / 2;
      const cy = (area.y ?? 0) + area.height / 2;
      const angle = SPIN_ANGLE * (1 - easeOutCubic(progress));
      for (let i = 0; i < f.count; i++) {
        if (!flame[i]) continue;
        const point = rotateAround(baseHomeX[i] ?? 0, baseHomeY[i] ?? 0, cx, cy, angle);
        f.hx[i] = point.x;
        f.hy[i] = point.y;
      }
    };

    /** Motorcycle particles glide (eased) from where they floated to their place, with a fading wobble. */
    const glideMoto = (f: Field, progress: number, time: number) => {
      const t = easeInOutCubic(progress);
      const wobble = WOBBLE * (1 - t);
      for (let i = 0; i < f.count; i++) {
        if (flame[i]) continue;
        const phaseOffset = wobblePhase[i] ?? 0;
        const x = (glideFromX[i] ?? 0) + ((baseHomeX[i] ?? 0) - (glideFromX[i] ?? 0)) * t;
        const y = (glideFromY[i] ?? 0) + ((baseHomeY[i] ?? 0) - (glideFromY[i] ?? 0)) * t;
        f.px[i] = x + Math.sin(time / 260 + phaseOffset) * wobble;
        f.py[i] = y + Math.cos(time / 310 + phaseOffset) * wobble;
        f.vx[i] = 0;
        f.vy[i] = 0;
      }
    };

    const loop = (time: number) => {
      if (!field) return;
      const dt = Math.min(Math.max((time - lastTime) / FRAME_MS, 0.25), 2);
      lastTime = time;
      const elapsed = time - phaseStart;
      const floating = phase === 'float' || phase === 'moto';

      if (floating && time - lastWander > WANDER_EVERY_MS) {
        wander(field, phase === 'moto');
        lastWander = time;
      }
      if (phase === 'float' && elapsed >= FLOAT_MS) {
        glideFromX = field.px.slice();
        glideFromY = field.py.slice();
        phase = 'moto';
        phaseStart = time;
      } else if (phase === 'moto' && elapsed >= MOTO_MS) {
        phase = 'spin';
        phaseStart = time;
      } else if (phase === 'spin' && elapsed >= SPIN_MS) {
        field.hx.set(baseHomeX);
        field.hy.set(baseHomeY);
        wordmark.dataset.state = 'typing';
        phase = 'done';
      }
      if (phase === 'spin') spinFlame(field, (time - phaseStart) / SPIN_MS);

      const active = phase === 'done' && time - pointer.lastMove < POINTER_IDLE_MS;
      const energy = floating
        ? stepField(field, null, dt, FLOAT_SPRING, FLOAT_DAMPING)
        : stepField(field, active ? pointer : null, dt);
      if (phase === 'moto') glideMoto(field, (time - phaseStart) / MOTO_MS, time);
      draw();

      if (phase !== 'done' || active || energy > 0.01) frame = requestAnimationFrame(loop);
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

    const onResize = () => {
      // ResizeObserver also fires once right after observe(): ignore callbacks without a real change.
      if (
        !field ||
        (stage.clientWidth === canvasBox.width && stage.clientHeight === canvasBox.height)
      )
        return;
      sizeCanvas();
      layoutHomes(field, targets, logoArea());
      baseHomeX = field.hx.slice();
      baseHomeY = field.hy.slice();
      if (phase !== 'done') {
        // Mid-sequence resize: skip to the end state instead of re-sampling moving text.
        window.clearTimeout(holdTimer);
        wordmark.dataset.state = 'shown';
        phase = 'done';
      }
      if (motionQuery.matches) settle(field);
      draw();
      wake();
    };

    const resizeObserver = new ResizeObserver(onResize);

    const begin = async () => {
      await document.fonts.ready;
      sizeCanvas();
      const f = createField(targets, logoArea());
      field = f;
      shapes = assignShapes(f.count, 0.5);
      baseHomeX = f.hx.slice();
      baseHomeY = f.hy.slice();
      wobblePhase = Float32Array.from({ length: f.count }, () => Math.random() * Math.PI * 2);
      stage.addEventListener('pointermove', onPointerMove);
      resizeObserver.observe(stage);
      canvas.dataset.ready = 'true';

      if (motionQuery.matches) {
        settle(f);
        draw();
        return;
      }

      // Hold the wordmark, then disintegrate it: particles start on the letters (color-paired)
      // and drift away softly.
      phase = 'hold';
      holdTimer = window.setTimeout(() => {
        const start = sampleWordmark(f.count);
        const pairs = pairStartPoints(f.color, start.x);
        for (let i = 0; i < f.count; i++) {
          const point = pairs[i] ?? 0;
          f.px[i] = start.x[point] ?? 0;
          f.py[i] = start.y[point] ?? 0;
          const direction = Math.random() * Math.PI * 2;
          f.vx[i] = Math.cos(direction) * 1.2;
          f.vy[i] = Math.sin(direction) * 1.2;
        }
        wander(f, false);
        wordmark.dataset.state = 'hidden';
        phase = 'float';
        phaseStart = performance.now();
        lastWander = phaseStart;
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
  }, []);

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
