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
import { assignShapes, gradientSlot, ICON_PATHS, pairStartPoints } from './sequence';

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
/** Mean per-particle energy under which a flight counts as "arrived". */
const ARRIVED = 0.02;

/**
 * TEMPORARY A/B: both variants render stacked on the page for the client to compare. Remove the
 * losing variant before merge.
 * A: wordmark retypes letter by letter; mixed triangles + ~15% icons.
 * B: particles fly back from the logo to re-form the wordmark; small icons only.
 */
const VARIANTS = {
  a: { rewrite: 'type', iconShare: 0.15, iconSize: 12, desktop: 1400, mobile: 700 },
  b: { rewrite: 'reform', iconShare: 1, iconSize: 8, desktop: 900, mobile: 500 },
} as const;

type Layer = { field: Field; shapes: Uint8Array };

/**
 * Hero visual sequence: the server-rendered wordmark (the LCP element) disintegrates into
 * particles that assemble the logo, then the wordmark is written again. The h1 stays in the DOM
 * the whole time (only its opacity changes). Reduced motion: no sequence, static logo.
 */
export type HeroVariant = keyof typeof VARIANTS;

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

    const variant =
      VARIANTS[new URLSearchParams(window.location.search).get('hero') === 'b' ? 'b' : 'a'];
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cores = (navigator.hardwareConcurrency as number | undefined) ?? 4;
    const small = window.innerWidth < 768 || cores <= 4;
    const targets = decodeTargets(PARTICLES_B64, small ? variant.mobile : variant.desktop);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    const radius = small ? 2.4 : 3;
    const iconSize = small ? variant.iconSize - 1 : variant.iconSize;

    // Icons are drawn once per (shape, color) into small sprites, then stamped every frame.
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (shape: 1 | 2, slot: number) => {
      const key = `${shape}-${slot}`;
      let image = sprites.get(key);
      if (!image) {
        image = document.createElement('canvas');
        image.width = image.height = Math.ceil(iconSize * dpr);
        const sctx = image.getContext('2d');
        if (sctx) {
          sctx.scale((iconSize * dpr) / 24, (iconSize * dpr) / 24);
          sctx.fillStyle = palette[slot] ?? 'currentColor';
          sctx.fill(new Path2D(ICON_PATHS[shape]), 'evenodd');
        }
        sprites.set(key, image);
      }
      return image;
    };

    let canvasBox: Box = { width: 0, height: 0 };
    let logo: Layer | null = null;
    let text: Layer | null = null; // particles re-forming the wordmark (variant B)
    let phase: 'idle' | 'assemble' | 'reform' | 'done' = 'idle';
    const pointer = { x: 0, y: 0, lastMove: Number.NEGATIVE_INFINITY };
    let running = false;
    let frame = 0;
    let lastTime = 0;

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

    const drawLayer = ({ field, shapes }: Layer) => {
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
        const shape = shapes[i];
        if (shape !== 1 && shape !== 2) continue;
        ctx.drawImage(
          sprite(shape, field.color[i] ?? 0),
          (field.px[i] ?? 0) - half,
          (field.py[i] ?? 0) - half,
          iconSize,
          iconSize,
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

    const finishReform = () => {
      wordmark.dataset.state = 'shown';
      phase = 'done';
      window.setTimeout(() => {
        text = null;
        draw();
      }, 300);
    };

    const loop = (time: number) => {
      const dt = Math.min(Math.max((time - lastTime) / FRAME_MS, 0.25), 2);
      lastTime = time;
      const active = time - pointer.lastMove < POINTER_IDLE_MS && phase === 'done';
      const logoEnergy = logo ? stepField(logo.field, active ? pointer : null, dt) : 0;
      const textEnergy = text ? stepField(text.field, null, dt) : 0;
      draw();

      if (phase === 'assemble' && logo && logoEnergy / logo.field.count < ARRIVED) {
        if (variant.rewrite === 'type') {
          wordmark.dataset.state = 'typing';
          phase = 'done';
        } else {
          // Copies of the logo particles fly back and re-form the wordmark.
          const goal = sampleWordmark(logo.field.count);
          const from = { x: new Float32Array(goal.x.length), y: new Float32Array(goal.x.length) };
          for (let i = 0; i < goal.x.length; i++) {
            from.x[i] = logo.field.hx[i] ?? 0;
            from.y[i] = logo.field.hy[i] ?? 0;
          }
          text = { field: createFieldAt(from, goal, goal.color, 1.5), shapes: logo.shapes };
          phase = 'reform';
        }
      } else if (phase === 'reform' && text && textEnergy / text.field.count < ARRIVED) {
        finishReform();
      }

      const busy =
        phase === 'assemble' ||
        phase === 'reform' ||
        active ||
        logoEnergy > 0.01 ||
        textEnergy > 0.01;
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
      const inside =
        x >= (area.x ?? 0) &&
        x <= (area.x ?? 0) + area.width &&
        y >= (area.y ?? 0) &&
        y <= (area.y ?? 0) + area.height;
      if (!inside) return;
      pointer.x = x;
      pointer.y = y;
      pointer.lastMove = performance.now();
      wake();
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
      // A resize mid-sequence: skip to the end state instead of re-sampling moving text.
      if (phase !== 'done') {
        text = null;
        wordmark.dataset.state = 'shown';
        phase = 'done';
      }
      if (motionQuery.matches) settle(logo.field);
      draw();
      wake();
    };

    const resizeObserver = new ResizeObserver(onResize);

    const begin = async () => {
      await document.fonts.ready;
      sizeCanvas();
      const field = createField(targets, logoArea());
      logo = { field, shapes: assignShapes(field.count, variant.iconShare) };

      if (motionQuery.matches) {
        settle(field);
        phase = 'done';
      } else {
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
        wordmark.dataset.state = 'hidden';
        phase = 'assemble';
      }
      stage.addEventListener('pointermove', onPointerMove);
      resizeObserver.observe(stage);
      draw();
      canvas.dataset.ready = 'true';
      wake();
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
