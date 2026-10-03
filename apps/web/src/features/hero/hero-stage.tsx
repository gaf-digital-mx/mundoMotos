'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  createField,
  decodeTargets,
  layoutHomes,
  settle,
  snapToHome,
  stepField,
  type Box,
  type Field,
} from './particle-field';
import { PARTICLES_B64 } from './particles-data';
import {
  assignShapes,
  choreoAt,
  MOTO_PATH,
  pairStartPoints,
  SEQUENCE_END,
  type Choreo,
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
const HOLD_MS = 300; // wordmark visible before it disintegrates
/** Sizes at the desktop logo width; they scale with the logo box (crisper figure on phones). */
const REFERENCE_WIDTH = 520;
const TRIANGLE_RADIUS = 3;
const ICON_SIZE = 11;
const SPRITE_DPR = 2; // sprites always rasterized at 2× so small icons stay sharp

/**
 * Hero sequence: the server-rendered wordmark (painted before any script) disintegrates; the
 * particles float softly near the logo; the motorcycle glides into shape over 1 s while the
 * flame particles keep floating; the flame ring spins into place; the wordmark is typed again.
 * Motion during the sequence is fully time-parameterized (see sequence.ts) so it never jumps;
 * physics only takes over afterwards for pointer interaction. The h1 stays in the DOM the
 * whole time. Reduced motion: no sequence, static logo, text always visible.
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
    const phone = window.innerWidth < 768;
    const count = cores <= 4 ? 800 : phone ? 1000 : 1600;
    const targets = decodeTargets(PARTICLES_B64, count);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim() || 'gray');
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);

    let radius = TRIANGLE_RADIUS;
    let iconSize = ICON_SIZE;
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (slot: number) => {
      const key = `${iconSize}-${slot}`;
      let image = sprites.get(key);
      if (!image) {
        image = document.createElement('canvas');
        image.width = image.height = Math.ceil(iconSize * SPRITE_DPR);
        const sctx = image.getContext('2d');
        if (sctx) {
          sctx.scale((iconSize * SPRITE_DPR) / 24, (iconSize * SPRITE_DPR) / 24);
          sctx.fillStyle = palette[slot] ?? 'gray';
          sctx.fill(new Path2D(MOTO_PATH), 'evenodd');
        }
        sprites.set(key, image);
      }
      return image;
    };

    let canvasBox: Box = { width: 0, height: 0 };
    let field: Field | null = null;
    let shapes = new Uint8Array(0);
    let choreo: Choreo[] = [];
    let homeX = new Float32Array(0);
    let homeY = new Float32Array(0);
    let center = { x: 0, y: 0 };
    let phase: 'hold' | 'sequence' | 'done' = 'done';
    let sequenceStart = 0;
    const pointer = { x: 0, y: 0, lastMove: Number.NEGATIVE_INFINITY };
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let holdTimer = 0;
    let watchdog = 0;
    let disposed = false;

    const logoArea = () => {
      const stageRect = stage.getBoundingClientRect();
      const rect = logoBox.getBoundingClientRect();
      return {
        x: rect.left - stageRect.left,
        y: rect.top - stageRect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const layout = () => {
      canvasBox = { width: stage.clientWidth, height: stage.clientHeight };
      canvas.width = Math.round(canvasBox.width * dpr);
      canvas.height = Math.round(canvasBox.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = logoArea();
      const scale = area.width / REFERENCE_WIDTH;
      radius = Math.min(TRIANGLE_RADIUS, Math.max(1.6, TRIANGLE_RADIUS * scale));
      iconSize = Math.round(Math.min(ICON_SIZE, Math.max(6, ICON_SIZE * scale)));
      center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
      return area;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);
      if (!field) return;
      ctx.lineWidth = 1;
      for (let slot = 0; slot < palette.length; slot++) {
        ctx.strokeStyle = palette[slot] ?? 'gray';
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

    /** Samples the rendered wordmark into start points (canvas coordinates). */
    const sampleWordmark = (n: number) => {
      const stageRect = stage.getBoundingClientRect();
      const rect = wordmark.getBoundingClientRect();
      const style = getComputedStyle(wordmark);
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.ceil(rect.width));
      off.height = Math.max(1, Math.ceil(rect.height));
      const octx = off.getContext('2d', { willReadFrequently: true });
      const xs: number[] = [];
      const ys: number[] = [];
      if (octx) {
        octx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        if ('letterSpacing' in octx) octx.letterSpacing = style.letterSpacing;
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
      const x = new Float32Array(n);
      const y = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const j = xs.length ? Math.floor(Math.random() * xs.length) : 0;
        x[i] = rect.left - stageRect.left + (xs[j] ?? off.width / 2);
        y[i] = rect.top - stageRect.top + (ys[j] ?? off.height / 2);
      }
      return { x, y };
    };

    /** Floating orbits live in a bounded zone around the logo (not the whole hero). */
    const buildChoreo = (f: Field, area: Box) => {
      const start = sampleWordmark(f.count);
      const pairs = pairStartPoints(f.color, start.x);
      const zoneRx = area.width * 0.62;
      const zoneRy = area.height * 0.55;
      choreo = Array.from({ length: f.count }, (_, i) => {
        const point = pairs[i] ?? 0;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random());
        const ax = Math.min(
          canvasBox.width - 8,
          Math.max(8, center.x + Math.cos(angle) * zoneRx * distance),
        );
        const ay = Math.min(
          canvasBox.height - 8,
          Math.max(8, center.y + Math.sin(angle) * zoneRy * distance),
        );
        return {
          sx: start.x[point] ?? 0,
          sy: start.y[point] ?? 0,
          hx: homeX[i] ?? 0,
          hy: homeY[i] ?? 0,
          ax,
          ay,
          rx: 8 + Math.random() * 22,
          ry: 6 + Math.random() * 18,
          w1: 0.0008 + Math.random() * 0.001,
          w2: 0.0007 + Math.random() * 0.001,
          p1: Math.random() * Math.PI * 2,
          p2: Math.random() * Math.PI * 2,
          delay: Math.random() * 250,
          flame: (targets.flame[i] ?? 0) === 1,
        };
      });
    };

    const finish = () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(watchdog);
      if (field) {
        snapToHome(field, homeX, homeY, () => true);
        draw();
      }
      if (wordmark.dataset.state === 'hidden') wordmark.dataset.state = 'typing';
      phase = 'done';
    };

    const loop = (time: number) => {
      if (!field) return;
      const dt = Math.min(Math.max((time - lastTime) / FRAME_MS, 0.25), 2);
      lastTime = time;
      let energy = 0;
      let active = false;

      if (phase === 'sequence') {
        const t = time - sequenceStart;
        for (let i = 0; i < field.count; i++) {
          const c = choreo[i];
          if (!c) continue;
          const point = choreoAt(c, t, center.x, center.y);
          field.px[i] = point.x;
          field.py[i] = point.y;
          field.angle[i] = (field.angle[i] ?? 0) + (field.spin[i] ?? 0) * dt;
        }
        if (t >= SEQUENCE_END) finish();
      } else {
        active = time - pointer.lastMove < POINTER_IDLE_MS;
        energy = stepField(field, active ? pointer : null, dt);
      }
      draw();

      if (phase === 'sequence' || active || energy > 0.01) frame = requestAnimationFrame(loop);
      else running = false;
    };

    const wake = () => {
      if (running || motionQuery.matches) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (phase !== 'done') return;
      const stageRect = stage.getBoundingClientRect();
      const area = logoArea();
      const x = event.clientX - stageRect.left;
      const y = event.clientY - stageRect.top;
      if (x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height) return;
      pointer.x = x;
      pointer.y = y;
      pointer.lastMove = performance.now();
      wake();
    };

    const onMotionChange = () => {
      if (motionQuery.matches) finish();
    };

    const onResize = () => {
      // ResizeObserver also fires once right after observe(): ignore callbacks without a real change.
      if (
        !field ||
        (stage.clientWidth === canvasBox.width && stage.clientHeight === canvasBox.height)
      )
        return;
      const area = layout();
      layoutHomes(field, targets, area);
      homeX = field.hx.slice();
      homeY = field.hy.slice();
      finish(); // mid-sequence resize: jump to the end state instead of re-sampling moving text
      wake();
    };

    const resizeObserver = new ResizeObserver(onResize);

    const begin = async () => {
      await document.fonts.ready;
      if (disposed) return; // unmounted while fonts were loading
      const area = layout();
      const f = createField(targets, area);
      field = f;
      shapes = assignShapes(f.count, 0.5);
      homeX = f.hx.slice();
      homeY = f.hy.slice();
      stage.addEventListener('pointermove', onPointerMove);
      motionQuery.addEventListener('change', onMotionChange);
      resizeObserver.observe(stage);
      canvas.dataset.ready = 'true';

      if (motionQuery.matches) {
        settle(f);
        draw();
        return;
      }

      phase = 'hold';
      holdTimer = window.setTimeout(() => {
        if (disposed || motionQuery.matches) return;
        buildChoreo(f, area);
        wordmark.dataset.state = 'hidden';
        // Safety net: whatever happens (exceptions, throttled tabs), the text comes back.
        watchdog = window.setTimeout(finish, SEQUENCE_END + 1500);
        phase = 'sequence';
        sequenceStart = performance.now();
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
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.clearTimeout(holdTimer);
      window.clearTimeout(watchdog);
      cancelAnimationFrame(frame);
      motionQuery.removeEventListener('change', onMotionChange);
      startObserver.disconnect();
      resizeObserver.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      wordmark.dataset.state = 'shown';
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative grid items-center gap-36 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
    >
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
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-0 transition-opacity duration-300 data-[ready=true]:opacity-100"
      />
    </div>
  );
}
