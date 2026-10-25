// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
"use client";

import * as React from "react";
import type { SolidPaths } from "../../../../shared/iso/iso-kit";
import * as GL from "../../../../shared/iso/gl.mjs";
import { asksForStillness, follow, useReadout } from "../../../../shared/iso/react/live";
import { FLANGE_NEAR, INSIDE_ART } from "./geometry";
import { frameOf, belowOutside, type Frame } from "./frame";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { burst, glCamera, glLayer, settle, smooth } = GL as any;
import { PARTS, STEPS, startOf, readoutOf, scripted, spokenOf, type Pose } from "./model";
import { FOAM_FRAGMENT } from "./shader";
import { HEIGHT, LIP_R, P, RIM_TOP, WIDTH } from "./view";

const TOUR_FIRST = 1.2;
const TOUR_BACK = 7000;
const EASE = 0.14;
const MOST_DT = 1 / 30;
const LAST = STEPS.length - 1;

const KEYS = Object.keys(startOf(0)) as Array<keyof Pose>;
const GLIDE = 0.45; // ease after a jump between steps, so a loop back reads as a reset, not a cut
const GLIDE_FOR = 1.6;

function eased(shown: Pose, target: Pose, dt: number, calm: boolean, slow: boolean): Pose {
  const next = { ...shown };
  for (const key of KEYS) {
    if (key === "pop") next.pop = target.pop;
    else next[key] = follow(shown[key], target[key], dt, slow ? GLIDE : key === "psi" ? 0.09 : EASE, calm);
  }
  return next;
}

const same = (a: Pose, b: Pose) => KEYS.every((key) => key === "pop" || Math.abs(a[key] - b[key]) < 1e-3);

// One solid whose paths are rewritten in place.
function setSolid(node: SVGGElement | null, paths: SolidPaths) {
  if (!node) return;
  const set = (selector: string, d: string) => node.querySelector(selector)?.setAttribute("d", d);
  set(":scope > .iso-fill", paths.fill);
  paths.shades.forEach((d, index) => set(`:scope > .iso-shade[data-shade="${index}"]`, d));
  set(":scope > .iso-top", paths.top);
  set(":scope > .iso-crease", paths.crease);
  set(":scope > .iso-bevel", paths.bevel ?? "");
  set(":scope > .iso-edge", paths.outline);
  if (paths.seamless) node.setAttribute("data-seamless", "");
  else node.removeAttribute("data-seamless");
}

function LiveSolid({ paths, tone = "hi", crease = "faint", bind, className, children }: { paths: SolidPaths; tone?: string; crease?: string; bind: (node: SVGGElement | null) => void; className?: string; children?: React.ReactNode }) {
  return (
    <g ref={bind} className={className ? `iso-solid ${className}` : "iso-solid"} data-seamless={paths.seamless ? "" : undefined}>
      <path className="iso-fill" d={paths.fill} />
      {[0, 1, 2, 3].map((shade) => (
        <path key={shade} className="iso-shade" data-shade={shade} d={paths.shades[shade] ?? ""} />
      ))}
      <path className="iso-top" d={paths.top} />
      <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} />
      <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel ?? ""} />
      {children}
      <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
    </g>
  );
}

interface Props {
  label: string;
  base: React.ReactNode;
  halo: React.ReactNode;
  tub: React.ReactNode;
  wet: React.ReactNode;
  bubbles: React.ReactNode;
  stand: React.ReactNode;
  standFront: React.ReactNode;
  under: React.ReactNode;
  rim: React.ReactNode;
  insideBack: React.ReactNode;
  through: React.ReactNode;
  insideFront: React.ReactNode;
  hose: React.ReactNode;
  stack: React.ReactNode;
  gaugeHub: React.ReactNode;
  treadNew: React.ReactNode;
  treadWorn: React.ReactNode;
  dot: React.ReactNode;
}

const START = startOf(0);
const FIRST: Frame = frameOf(START, null);
const FIRST_TYRE = FIRST.tyre!;
const FLANGE_CLIP = belowOutside(LIP_R, RIM_TOP);
const flangeShown = (lift: number) => 1 - smooth(0.68, 0.9, lift);
const seatShown = (lift: number) => 1 - smooth(0.0, 0.25, lift);

export function LlantaLive(props: Props) {
  const { anchor, say } = useReadout<HTMLDivElement>();
  const root = React.useRef<HTMLDivElement | null>(null);
  const canvas = React.useRef<HTMLCanvasElement | null>(null);
  const spoken = React.useRef<HTMLSpanElement | null>(null);
  const raw = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `ll${raw}${name}`;
  const nodes = React.useRef<Record<string, SVGElement | null>>({});
  const bind = (name: string) => (node: SVGElement | null) => {
    nodes.current[name] = node;
  };
  const solid = (name: string) => (node: SVGGElement | null) => {
    nodes.current[name] = node;
  };

  const step = React.useRef(0);
  const clock = React.useRef(0);
  const glide = React.useRef(0);
  const shown = React.useRef<Pose>({ ...START });
  const last = React.useRef<{ drop: number; over: number } | null>({ drop: START.drop, over: START.over });
  const touring = React.useRef(false);
  const frame = React.useRef(0);
  const before = React.useRef(0);
  const glClock = React.useRef(0);
  const foam = React.useRef({ x: 0, v: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = React.useRef<any>(null);
  const drawn = React.useRef("");
  const [current, setCurrent] = React.useState(0);
  const [picked, setPicked] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [quiet, setQuiet] = React.useState(true);
  const [poke, setPoke] = React.useState(0);

  const apply = React.useCallback(
    (pose: Pose, dt: number, calm: boolean) => {
      const n = nodes.current;
      const built = frameOf(pose, last.current);
      if (built.tyre) {
        last.current = { drop: pose.drop, over: pose.over };
        setSolid(n.tyreA as SVGGElement, built.tyre.paths);
        setSolid(n.tyreB as SVGGElement, built.tyre.paths);
        n.hole?.setAttribute("d", built.tyre.hole);
        n.front?.setAttribute("d", built.tyre.front);
        n.nearArc?.setAttribute("d", built.tyre.near);
        n.lineA?.setAttribute("d", built.tyre.line);
        n.inner?.setAttribute("d", built.tyre.inner);
        n.lineB?.setAttribute("d", built.tyre.line);
        n.farArc?.setAttribute("d", built.tyre.far);
      }
      n.liftA?.setAttribute("transform", built.lift);
      n.liftB?.setAttribute("transform", built.lift);
      n.needle?.setAttribute("d", built.needle);
      const b = built.breaker;
      setSolid(n.arm as SVGGElement, b.arm);
      setSolid(n.shoe as SVGGElement, b.shoe);
      setSolid(n.tongue as SVGGElement, b.tongue);
      setSolid(n.grip as SVGGElement, b.grip);
      n.gripRibs?.setAttribute("d", b.ribs);
      const i = built.iron;
      setSolid(n.shaft as SVGGElement, i.shaft);
      setSolid(n.spoon as SVGGElement, i.spoon);
      setSolid(n.ironGrip as SVGGElement, i.grip);
      n.ironRibs?.setAttribute("d", i.ribs);
      const opacity = (name: string, value: number) => {
        const node = n[name] as SVGElement | undefined | null;
        const text = `${Math.round(value * 1000) / 1000}`;
        if (node && node.style.opacity !== text) node.style.opacity = text;
      };
      opacity("treadNew", pose.tread);
      opacity("treadWorn", 1 - pose.tread);
      opacity("dot", pose.tread);
      opacity("flange", flangeShown(pose.lift));
      opacity("wet", pose.lube * seatShown(pose.lift));
      opacity("bubbles", Math.min(1, pose.leak * 1.6) * seatShown(pose.lift));
      if (n.gauge) {
        if (pose.open > 0.5 || pose.compressor > 0.5) n.gauge.setAttribute("data-on", "");
        else n.gauge.removeAttribute("data-on");
      }
      say(readoutOf(step.current, pose));
      const node = spoken.current;
      if (node) {
        const text = spokenOf(step.current, pose);
        if (node.textContent !== text) node.textContent = text;
      }
      // the paste and its bubbles
      foam.current.x = Math.max(foam.current.x, 0);
      settle(foam.current, pose.leak > 0.05 ? 1 : 0, dt, pose.leak > 0.05 ? 0.5 : 1.4, calm);
      const gl = layer.current;
      if (gl) {
        const values = {
          uLube: pose.lube,
          uLeak: pose.leak,
          uFoam: Math.max(0, foam.current.x),
          uSeat: seatShown(pose.lift),
          uPop: calm ? 0 : burst(pose.pop, 0.06, 0.4),
        };
        const active = values.uLube > 1e-3 || values.uLeak > 1e-3 || values.uFoam > 1e-3;
        const animated = values.uLeak > 1e-3 || values.uFoam > 1e-3;
        if (!calm && animated) glClock.current += dt;
        const key = JSON.stringify(values) + (animated ? glClock.current.toFixed(3) : "");
        if (!active) {
          if (drawn.current) gl.clear();
          drawn.current = "";
        } else if (key !== drawn.current) {
          gl.draw(values, calm ? 0.8 : glClock.current);
          drawn.current = key;
        }
        return animated || Math.abs(foam.current.v) > 1e-4;
      }
      return false;
    },
    [say],
  );

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const run = React.useCallback(() => {
    if (frame.current) return;
    before.current = 0;
    const tick = (now: number) => {
      const dt = before.current ? Math.min((now - before.current) / 1000, MOST_DT) : 1 / 60;
      before.current = now;
      const calm = asksForStillness();
      const length = STEPS[step.current]!.length;
      clock.current = calm ? length : Math.min(length, clock.current + dt);
      if (clock.current >= length && touring.current && !calm) {
        if (step.current === LAST) glide.current = GLIDE_FOR;
        step.current = step.current === LAST ? 0 : step.current + 1;
        clock.current = 0;
        setCurrent(step.current);
      }
      glide.current = Math.max(0, glide.current - dt);
      const target = scripted(step.current, clock.current);
      shown.current = eased(shown.current, target, dt, calm, glide.current > 0);
      const busy = apply(shown.current, dt, calm);
      const done = !touring.current && clock.current >= STEPS[step.current]!.length && same(shown.current, target) && !busy;
      frame.current = done ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [apply]);

  const go = React.useCallback(
    (next: number) => {
      touring.current = false;
      glide.current = GLIDE_FOR;
      step.current = Math.max(0, Math.min(LAST, next));
      clock.current = 0;
      setCurrent(step.current);
      setQuiet(false);
      setPoke((count) => count + 1);
      run();
    },
    [run],
  );

  React.useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => setVisible(Boolean(entries.at(-1)?.isIntersecting)), { rootMargin: "120px 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [stop]);

  React.useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const light = root.current?.closest("[data-theme]")?.getAttribute("data-theme") !== "dark";
    const made = glLayer({
      canvas: target,
      fragment: FOAM_FRAGMENT,
      view: [WIDTH, HEIGHT],
      camera: glCamera(P),
      uniforms: ["uLube", "uLeak", "uFoam", "uSeat", "uPop"],
      fixed: { uLight: light ? 1 : 0 },
    });
    layer.current = made;
    if (made) root.current?.setAttribute("data-gl", "");
    const redraw = () => {
      drawn.current = "";
      apply(shown.current, 0, true);
    };
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("resize", redraw);
      layer.current = null;
      root.current?.removeAttribute("data-gl");
    };
  }, [apply]);

  React.useEffect(() => {
    if (quiet) return;
    const timer = window.setTimeout(() => setQuiet(true), TOUR_BACK);
    return () => window.clearTimeout(timer);
  }, [quiet, poke]);

  React.useEffect(() => {
    if (!visible) {
      stop();
      return;
    }
    if (!quiet || asksForStillness()) {
      run();
      return;
    }
    const timer = window.setTimeout(() => {
      if (!touring.current) {
        touring.current = true;
        if (clock.current >= STEPS[step.current]!.length) {
          step.current = step.current === LAST ? 0 : step.current + 1;
          clock.current = 0;
          setCurrent(step.current);
        }
      }
      run();
    }, TOUR_FIRST * 1000);
    return () => window.clearTimeout(timer);
  }, [visible, quiet, run, stop]);

  const onKey = (event: React.KeyboardEvent) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown" || key === " " || key === "Enter") {
      event.preventDefault();
      go(step.current === LAST ? 0 : step.current + 1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      event.preventDefault();
      go(step.current === 0 ? LAST : step.current - 1);
    } else if (key === "Home") {
      event.preventDefault();
      go(0);
    } else if (key === "End") {
      event.preventDefault();
      go(LAST);
    } else if (/^[1-9]$/.test(key) && Number(key) <= STEPS.length) {
      event.preventDefault();
      go(Number(key) - 1);
    }
  };

  const f = FIRST;
  const lit = (piece: string) => (picked === piece ? "" : undefined);
  return (
    <>
    <div className="iso-plate">
      <div className="iso-plate-corners" aria-hidden="true">
        <span className="iso-plate-corner" data-corner="title">
          Cambio de llanta · desmontadora
        </span>
        <span className="iso-plate-corner" data-corner="readout" data-readout="">
          {readoutOf(0, START)}
        </span>
      </div>
    <div
      ref={(node) => {
        root.current = node;
        anchor.current = node;
      }}
      className="ll"
      role="group"
      tabIndex={0}
      aria-label="Cambio de llanta de moto. Los botones Palanca, Cambiar y Asentar llevan a cada paso; las flechas también."
      onKeyDown={onKey}
      onClick={(event) => {
        if ((event.target as Element).closest("button")) return;
        go(step.current === LAST ? 0 : step.current + 1);
      }}
    >
      <div className="ll-stage" data-focus={picked ? "" : undefined}>
        <svg className="iso-svg ll-back" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={props.label} focusable="false">
          <defs>
            <clipPath id={id("lip")}>
              <path d={INSIDE_ART.lip} />
            </clipPath>
            <clipPath id={id("through")}>
              <path d={INSIDE_ART.through} />
            </clipPath>
            <mask id={id("hole")} maskUnits="userSpaceOnUse" x={-200} y={-200} width={WIDTH + 400} height={HEIGHT + 400}>
              <rect x={-200} y={-200} width={WIDTH + 400} height={HEIGHT + 400} fill="#fff" />
              <path ref={bind("hole")} d={FIRST_TYRE.hole} fill="#000" />
            </mask>
            <clipPath id={id("front")}>
              <path ref={bind("front")} d={FIRST_TYRE.front} clipRule="evenodd" />
            </clipPath>
            <clipPath id={id("flange")}>
              <path d={FLANGE_CLIP} clipRule="evenodd" />
            </clipPath>
          </defs>
          {props.base}
          {props.halo}
          {props.tub}
          {props.stand}
          {props.under}
          <g data-piece="rim" data-on={lit("rim")}>{props.rim}</g>
          <g ref={bind("liftA")} className="ll-rubber" data-piece="tyre" data-on={lit("tyre")} transform={f.lift}>
            <g mask={`url(#${id("hole")})`}>
              <LiveSolid paths={FIRST_TYRE.paths} tone="hi" crease="lo" bind={solid("tyreA")} />
              <path ref={bind("inner")} className="ll-inner" d={FIRST_TYRE.inner} />
              <path ref={bind("lineA")} className="iso-line" data-tone="lo" d={FIRST_TYRE.line} />
            </g>
            <path ref={bind("farArc")} className="iso-line" data-tone="hi" d={FIRST_TYRE.far} />
          </g>
          <LiveSolid paths={FLANGE_NEAR} tone="hi" crease="lo" bind={() => {}} />
          <g clipPath={`url(#${id("lip")})`} data-piece="rim" data-on={lit("rim")}>
            {props.insideBack}
            <g clipPath={`url(#${id("through")})`}>{props.through}</g>
            {props.insideFront}
          </g>
          <g data-piece="gauge" data-on={lit("gauge")}>{props.hose}</g>
          <g ref={bind("gauge")} className="ll-gauge" data-piece="gauge" data-on={lit("gauge")}>
            {props.stack}
            <path ref={bind("needle")} className="iso-line ll-needle" data-tone="lit" d={f.needle} />
            {props.gaugeHub}
          </g>
          <g ref={bind("liftB")} className="ll-rubber" data-piece="tyre" data-on={lit("tyre")} transform={f.lift}>
            <g mask={`url(#${id("hole")})`} clipPath={`url(#${id("front")})`}>
              <LiveSolid paths={FIRST_TYRE.paths} tone="hi" crease="lo" bind={solid("tyreB")} />
              <path ref={bind("lineB")} className="iso-line" data-tone="lo" d={FIRST_TYRE.line} />
              <g ref={bind("treadNew")} style={{ opacity: START.tread }}>
                {props.treadNew}
              </g>
              <g ref={bind("treadWorn")} style={{ opacity: 1 - START.tread }}>
                {props.treadWorn}
              </g>
            </g>
            <g ref={bind("dot")} style={{ opacity: START.tread }}>
              {props.dot}
            </g>
            <path ref={bind("nearArc")} className="iso-line" data-tone="hi" d={FIRST_TYRE.near} />
          </g>
          <g ref={bind("flange")} clipPath={`url(#${id("flange")})`} style={{ opacity: flangeShown(START.lift) }}>
            <LiveSolid paths={FLANGE_NEAR} tone="hi" crease="lo" bind={() => {}} />
          </g>
          <g className="ll-fallback">
            <g ref={bind("wet")} style={{ opacity: 0 }}>
              {props.wet}
            </g>
            <g ref={bind("bubbles")} style={{ opacity: 0 }}>
              {props.bubbles}
            </g>
          </g>
        </svg>
        <canvas ref={canvas} className="ll-gl" aria-hidden="true" />
        <svg className="iso-svg ll-front" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
          <LiveSolid paths={f.breaker.arm} tone="mid" bind={solid("arm")} />
          <LiveSolid paths={f.breaker.grip} tone="mid" crease="none" bind={solid("grip")} />
          <path ref={bind("gripRibs")} className="iso-line" data-tone="lo" d={f.breaker.ribs} />
          <LiveSolid paths={f.breaker.tongue} tone="mid" bind={solid("tongue")} />
          <LiveSolid paths={f.breaker.shoe} tone="hi" crease="lo" bind={solid("shoe")} />
          {props.standFront}
          <LiveSolid paths={f.iron.shaft} tone="hi" crease="lo" bind={solid("shaft")} />
          <LiveSolid paths={f.iron.spoon} tone="hi" crease="lo" bind={solid("spoon")} />
          <LiveSolid paths={f.iron.grip} tone="mid" crease="none" bind={solid("ironGrip")} />
          <path ref={bind("ironRibs")} className="iso-line" data-tone="lo" d={f.iron.ribs} />
        </svg>
      </div>
      <span ref={spoken} className="ll-live-region" aria-live="polite" />
      <div className="ll-controls">
        {STEPS.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className="ll-button"
            aria-pressed={current === index}
            data-state={current === index ? "on" : "off"}
            onClick={() => go(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
    </div>
    <figcaption className="iso-legend">
      <span className="ll-parts">
        {PARTS.map((part, index) => (
          <button
            key={part.id}
            type="button"
            className="ll-part"
            data-part={part.id}
            data-on={picked === part.id ? "" : undefined}
            onClick={() => {
              setPicked(picked === part.id ? "" : part.id);
            }}
          >
            <span className="ll-num">{String(index + 1).padStart(2, "0")}</span>
            {part.name}
          </button>
        ))}
      </span>
    </figcaption>
    </>
  );
}

