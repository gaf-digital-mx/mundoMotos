'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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
  IDLE_FRAME_MS,
  idleOffset,
  introShift,
  introSpot,
  MOTO_PATH,
  randomOrbit,
  SEQUENCE_END,
  TIMING,
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
/** Gap between the wordmark and the figure while they lead the intro, and the figure's top margin. */
const INTRO_GAP_PX = 24;
/** Particles enter from this far above the stage, as a fraction of its height. */
const INTRO_RISE = 0.35;
/** Sizes at the desktop logo width; they scale with the logo box (crisper figure on phones). */
const REFERENCE_WIDTH = 520;
const TRIANGLE_RADIUS = 3;
const ICON_SIZE = 11;
const SPRITE_DPR = 2; // sprites always rasterized at 2× so small icons stay sharp

/**
 * Hero sequence: the stage opens with the wordmark alone, centred above the middle; particles
 * fall from above it, spread across the width, and settle into the logo. Once the figure is
 * complete, both glide into their places in the layout while the rest of the hero sweeps in
 * (the `reveal` animation in globals.css, which this island simply schedules).
 * Motion is fully time-parameterized (see sequence.ts) so it never jumps; physics only takes
 * over afterwards for pointer interaction. Everything is in the DOM the whole time.
 * Reduced motion: no sequence, static logo, everything visible at once.
 */
type Props = {
  children: ReactNode;
  /** Visible control for the continuous flame motion (WCAG 2.2.2: motion longer than 5 s). */
  pauseLabel: string;
  playLabel: string;
};

type IntroVector = { x: number; y: number };

export function HeroStage({ children, pauseLabel, playLabel }: Props) {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const wakeRef = useRef<() => void>(() => undefined);
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
    // Matches the `md` breakpoint the layout and globals.css use for the intro.
    const phoneLayout = window.matchMedia('(width < 48rem)');
    const cores = (navigator.hardwareConcurrency as number | undefined) ?? 4;
    const phone = window.innerWidth < 768;
    // All 1600 points wherever it's affordable: fewer of them visibly softens the figure.
    const count = cores <= 4 ? 1200 : 1600;
    const targets = decodeTargets(PARTICLES_B64, count);
    const styles = getComputedStyle(document.documentElement);
    const palette = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim() || 'gray');
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);

    let radius = TRIANGLE_RADIUS;
    let iconSize = ICON_SIZE;
    const sprites = new Map<number, HTMLCanvasElement>(); // per color slot, at the current size
    const sprite = (slot: number) => {
      let image = sprites.get(slot);
      if (!image) {
        image = document.createElement('canvas');
        image.width = image.height = Math.ceil(iconSize * SPRITE_DPR);
        const sctx = image.getContext('2d');
        if (sctx) {
          sctx.scale((iconSize * SPRITE_DPR) / 24, (iconSize * SPRITE_DPR) / 24);
          sctx.fillStyle = palette[slot] ?? 'gray';
          sctx.fill(new Path2D(MOTO_PATH), 'evenodd');
        }
        sprites.set(slot, image);
      }
      return image;
    };

    let canvasBox: Box = { width: 0, height: 0 };
    let field: Field | null = null;
    let shapes = new Uint8Array(0);
    /** Triangle indices per color slot (colors never change): one path per slot without scanning. */
    let triangles: number[][] = [];
    let icons: number[] = [];
    let choreo: Choreo[] = [];
    /** Idle drift parameters for the flame particles (orbit-like, softer than the float). */
    let idleParams: Pick<Choreo, 'rx' | 'ry' | 'w1' | 'w2' | 'p1' | 'p2'>[] = [];
    let idleTime = 0; // advances only while idling, so pause/off-screen resume where they left off
    let visible = true;
    let homeX = new Float32Array(0);
    let homeY = new Float32Array(0);
    let phase: 'sequence' | 'done' = 'done';
    /** Vector from where the figure forms (centred under the wordmark) to its place in the layout. */
    let introOffset: IntroVector = { x: 0, y: 0 };
    let sequenceStart = 0;
    const pointer = { x: 0, y: 0, lastMove: Number.NEGATIVE_INFINITY };
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let watchdog = 0;

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
      const nextIconSize = Math.round(Math.min(ICON_SIZE, Math.max(6, ICON_SIZE * scale)));
      if (nextIconSize !== iconSize) sprites.clear();
      iconSize = nextIconSize;
      introOffset = introVector(area);
      return area;
    };

    /**
     * Where the figure sits while it forms: on a phone, centred on the stage just under the
     * wordmark (clamped, so a short landscape viewport never pushes it off-screen). From `md`
     * the hero keeps its two columns, so it forms where it already belongs.
     */
    const introVector = (area: Box & { x: number; y: number }): IntroVector => {
      if (!phoneLayout.matches) return { x: 0, y: 0 };
      const stageRect = stage.getBoundingClientRect();
      const mark = wordmark.getBoundingClientRect();
      return introSpot(canvasBox, area, mark.bottom - stageRect.top, INTRO_GAP_PX);
    };

    /** Hands the hero over to its layout: the sweep starts and the figure glides into place. */
    const reveal = () => {
      if (stage.dataset.intro !== 'idle' && stage.dataset.intro !== 'running') return;
      // If the 4s fallback already swept the hero in, keep it: replaying would blink out copy
      // the visitor is reading (and blur whatever they had focused).
      const swept = [...stage.querySelectorAll('[data-reveal]')].some((element) =>
        element.getAnimations().some((animation) => animation.playState === 'finished'),
      );
      stage.dataset.intro = swept ? 'shown' : 'done';
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvasBox.width, canvasBox.height);
      if (!field) return;
      ctx.lineWidth = 1;
      for (const [slot, indices] of triangles.entries()) {
        ctx.strokeStyle = palette[slot] ?? 'gray';
        ctx.beginPath();
        for (const i of indices) {
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
      for (const i of icons) {
        ctx.drawImage(
          sprite(field.color[i] ?? 0),
          (field.px[i] ?? 0) - half,
          (field.py[i] ?? 0) - half,
          iconSize,
          iconSize,
        );
      }
    };

    /** Start points: anywhere across the stage, well above its top edge. */
    const buildChoreo = (f: Field) => {
      const rise = canvasBox.height * INTRO_RISE;
      choreo = Array.from({ length: f.count }, (_, i) => ({
        sx: Math.random() * canvasBox.width,
        sy: -rise * (0.2 + Math.random() * 0.8),
        hx: homeX[i] ?? 0,
        hy: homeY[i] ?? 0,
        ...randomOrbit(),
        delay: Math.random() * TIMING.maxDelay,
        flame: (targets.flame[i] ?? 0) === 1,
      }));
    };

    const finish = () => {
      window.clearTimeout(watchdog);
      if (field) {
        snapToHome(field, homeX, homeY, () => true);
        draw();
      }
      reveal();
      phase = 'done';
      idleTime = 0;
      wake(); // continue into the idle drift (no-op if the loop is already running)
    };

    /** The finished ring keeps drifting softly unless paused, off-screen or reduced motion. */
    const idling = () => phase === 'done' && !pausedRef.current && visible && !motionQuery.matches;

    const loop = (time: number) => {
      if (!field) {
        running = false; // without this, a pause before `begin()` would strand every later wake()
        return;
      }
      const idle = idling();
      const active = phase === 'done' && time - pointer.lastMove < POINTER_IDLE_MS;
      // ~30 fps while only idling (2 ms tolerance so 60 Hz displays don't drop to 20 fps).
      if (idle && !active && time - lastTime < IDLE_FRAME_MS - 2) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const elapsed = time - lastTime;
      const dt = Math.min(Math.max(elapsed / FRAME_MS, 0.25), 2);
      lastTime = time;
      let energy = 0;

      if (phase === 'sequence') {
        const t = time - sequenceStart;
        // The whole figure forms at the intro position, then slides to the layout's.
        const shift = introShift(t);
        const ox = introOffset.x * shift;
        const oy = introOffset.y * shift;
        for (let i = 0; i < field.count; i++) {
          const c = choreo[i];
          if (!c) continue;
          const point = choreoAt(c, t);
          field.px[i] = point.x + ox;
          field.py[i] = point.y + oy;
          field.angle[i] = (field.angle[i] ?? 0) + (field.spin[i] ?? 0) * dt;
        }
        // The sweep starts the moment the figure is whole; the travel finishes alongside it.
        if (t >= SEQUENCE_END) reveal();
        if (t >= SEQUENCE_END + TIMING.settle) finish();
      } else {
        if (idle) {
          idleTime += Math.min(elapsed, 100);
          const t = idleTime;
          for (let i = 0; i < field.count; i++) {
            const params = idleParams[i];
            if (!params || !targets.flame[i]) continue;
            const offset = idleOffset(params, t);
            field.hx[i] = (homeX[i] ?? 0) + offset.x;
            field.hy[i] = (homeY[i] ?? 0) + offset.y;
          }
        }
        energy = stepField(field, active ? pointer : null, dt);
      }
      draw();

      if (phase === 'sequence' || idling() || active || energy > 0.01)
        frame = requestAnimationFrame(loop);
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
      else wake();
    };
    wakeRef.current = () => {
      if (pausedRef.current && phase === 'sequence') finish();
      wake();
    };

    // Stop drawing while the hero is off-screen (battery); resume when it scrolls back.
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries.at(-1)?.isIntersecting ?? true;
      if (visible) wake();
    });

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

    // No longer waits for `document.fonts.ready`: nothing here is sampled from the rendered
    // text any more, and waiting delayed the whole intro behind a slow webfont.
    const begin = () => {
      const area = layout();
      const f = createField(targets, area);
      field = f;
      shapes = assignShapes(f.count, 0.5);
      homeX = f.hx.slice();
      homeY = f.hy.slice();
      triangles = palette.map(() => []);
      icons = [];
      for (let i = 0; i < f.count; i++) {
        if (shapes[i] === 1) icons.push(i);
        else triangles[f.color[i] ?? 0]?.push(i);
      }
      idleParams = Array.from({ length: f.count }, randomOrbit);
      visibilityObserver.observe(stage);
      stage.addEventListener('pointermove', onPointerMove);
      motionQuery.addEventListener('change', onMotionChange);
      resizeObserver.observe(stage);
      canvas.dataset.ready = 'true';

      if (motionQuery.matches || pausedRef.current) {
        // Nothing to watch: show the finished hero at once.
        settle(f);
        draw();
        finish();
        return;
      }

      buildChoreo(f);
      stage.dataset.intro = 'running';
      // Safety net: whatever happens (exceptions, throttled tabs), the hero reveals itself.
      watchdog = window.setTimeout(finish, SEQUENCE_END + TIMING.settle + 1500);
      phase = 'sequence';
      sequenceStart = performance.now();
      wake();
    };

    // Start once the browser is idle AND the stage is on screen, so the sequence is actually seen.
    const startObserver = new IntersectionObserver((entries) => {
      if (!entries.at(-1)?.isIntersecting) return;
      startObserver.disconnect();
      begin();
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
      window.clearTimeout(watchdog);
      cancelAnimationFrame(frame);
      motionQuery.removeEventListener('change', onMotionChange);
      startObserver.disconnect();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      reveal();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      data-intro="idle"
      className="relative grid items-center gap-36 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
    >
      {children}
      {/* Target area for the particle logo (after the copy on mobile: CTAs stay above the fold). */}
      <div className="relative z-10 mx-auto flex w-full max-w-[340px] flex-col items-end gap-12 md:max-w-[520px]">
        <div
          ref={logoRef}
          aria-hidden="true"
          className="aspect-square w-full touch-pan-y touch-pinch-zoom"
        />
        <button
          type="button"
          data-reveal
          style={{ '--reveal-i': 4 } as CSSProperties}
          onClick={() => {
            const next = !pausedRef.current;
            pausedRef.current = next;
            setPaused(next);
            wakeRef.current();
          }}
          className="min-h-11 rounded-3xl border border-ash-gray/50 px-18 py-6 text-caption font-semibold tracking-label text-silver-mist uppercase hover:border-bone-white hover:text-bone-white motion-reduce:hidden"
        >
          {paused ? playLabel : pauseLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-0 transition-opacity duration-300 data-[ready=true]:opacity-100"
      />
    </div>
  );
}
