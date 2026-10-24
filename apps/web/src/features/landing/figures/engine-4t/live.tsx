// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching some fifty index
// reads would turn every refresh into a merge. Its exported types still reach callers.
"use client";

import * as React from "react";
import { glLayer, settle } from "../../../../shared/iso/gl.mjs";
import { RPM_SHOWN, crankAt, exhaustLift, gasAt, intakeLift, readoutOf, strokeOf } from "./model.mjs";
import { counterweightPath, pinAt, rodPaths, springPaths } from "./moving.mjs";
import { GAS_FRAGMENT } from "./shader";

type Vec3 = [number, number, number];
type Flat = [number, number];
export interface EngineData {
  W: number;
  H: number;
  origin: Flat;
  EX: Flat;
  EY: Flat;
  EZ: Flat;
  V: Vec3;
  camera: { origin: number[]; k: number; cam: number[] };
  rest: number;
  lifts: Record<string, number>;
  stagger: string[];
  spring: { stagger: number; stiffness: number; damping: number; substeps: number };
  parts: Array<{ id: string; name: string; say: string }>;
  axes: { intake: Vec3; exhaust: Vec3 };
  gas: {
    bore: number;
    deck: number;
    dome: number;
    inPort: number[];
    exPort: number[];
    plugTip: Vec3;
    pipeEnd: Vec3;
    pipeDir: Vec3;
    pipeR: number;
    podMouth: Vec3;
  };
  assembled: Flat[];
}

interface Spring {
  x: number;
  v: number;
  target: number;
  pending: { value: number; at: number } | null;
}
interface Node {
  el: SVGGElement;
  piece: string;
  name: string;
  key: number;
  lift: number;
  shown: string;
}
interface Puff {
  p: Vec3;
  v: Vec3;
  age: number;
}

const DEG_PER_S = RPM_SHOWN * 6;
const TOUR: Array<["run" | "stop" | "apart" | "together", number]> = [
  ["run", 10.5],
  ["apart", 5.5],
  ["together", 2.6],
];
const TOUR_BACK = 4000;

export function EngineLive({ data, children }: { data: EngineData; children: React.ReactNode }) {
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const host = root.current;
    if (!host) return;
    const D = data;
    const stage = host.querySelector<HTMLDivElement>(".e4-stage")!;
    const canvas = stage.querySelector<HTMLCanvasElement>(".e4-gas")!;
    const cams = [...stage.querySelectorAll<SVGGElement>(".e4-cam")];
    const readout = host.querySelector<HTMLElement>("[data-readout]");
    const liveRegion = host.querySelector<HTMLElement>("[data-live-region]");
    const runButton = host.querySelector<HTMLButtonElement>("[data-run]");
    const apartButton = host.querySelector<HTMLButtonElement>("[data-apart]");
    const partButtons = [...host.querySelectorAll<HTMLButtonElement>("[data-part]")];
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const light = (host.closest("[data-theme]")?.getAttribute("data-theme") ?? "light") !== "dark";

    const screen = (v: Vec3): Flat => [D.EX[0] * v[0] + D.EY[0] * v[1] + D.EZ[0] * v[2], D.EX[1] * v[0] + D.EY[1] * v[1] + D.EZ[1] * v[2]];
    const backLayer = stage.querySelector<SVGGElement>(".e4-sorted")!;
    const nodes: Node[] = [...stage.querySelectorAll<SVGGElement>(".it")].map((el) => {
      const piece = el.dataset.piece ?? "";
      return { el, piece, name: el.dataset.name ?? "", key: Number(el.dataset.k), lift: (D.lifts[piece] ?? 0) * D.V[2], shown: "" };
    });
    const sorted = nodes.filter((node) => (node.el.parentNode as unknown) === backLayer);
    let order = sorted.map((_, i) => i);
    const byName = (name: string) => nodes.find((node) => node.name === name)?.el;
    const pieces = Object.fromEntries(Object.keys(D.lifts).map((id) => [id, { x: 0, v: 0, target: 0, pending: null } as Spring]));

    // the moving parts' DOM, rewritten each frame
    const rodEl = byName("rod");
    const rodParts = rodEl ? [...rodEl.querySelectorAll<SVGPathElement>("[data-live=rod] > path")] : [];
    const bearingEl = rodEl?.querySelector<SVGPathElement>("[data-live=bearing]");
    const capEl = rodEl?.querySelector<SVGPathElement>("[data-live=cap]");
    const weightEl = stage.querySelector<SVGPathElement>("[data-live=weight]");
    const springEls = {
      intake: [stage.querySelector<SVGPathElement>("[data-live=spring-back-intake]"), stage.querySelector<SVGPathElement>("[data-live=spring-front-intake]")],
      exhaust: [stage.querySelector<SVGPathElement>("[data-live=spring-back-exhaust]"), stage.querySelector<SVGPathElement>("[data-live=spring-front-exhaust]")],
    };
    const writeSolid = (els: SVGPathElement[], paths: { fill: string; shades: string[]; top: string; crease: string; outline: string }) => {
      const ds = [paths.fill, ...paths.shades, paths.top, paths.crease, paths.outline];
      els.forEach((el, i) => el.setAttribute("d", ds[i] ?? ""));
    };

    const layer = glLayer({
      canvas,
      fragment: GAS_FRAGMENT,
      view: [D.W, D.H],
      camera: D.camera,
      uniforms: ["uCrown", "uFresh", "uSqueeze", "uFlame", "uFront", "uBurnt", "uIn", "uEx", "uSpark", "uRun", "uPhase", "uSmoke", "uAir", "uOrigin", "uK"],
      fixed: {
        uLight: light ? 1 : 0,
        uBore: D.gas.bore,
        uDeck: D.gas.deck,
        uDome: D.gas.dome,
        uInA: D.gas.inPort.slice(0, 4),
        uExA: D.gas.exPort.slice(0, 4),
        uInR: D.gas.inPort[4],
        uExR: D.gas.exPort[4],
        uPlug: D.gas.plugTip,
      },
    });
    if (layer) stage.setAttribute("data-gl", "");

    // the camera: close on the engine when it is together, the whole stack when apart
    const box = D.assembled;
    const lo = [Math.min(...box.map((p) => p[0])), Math.min(...box.map((p) => p[1]))];
    const hi = [Math.max(...box.map((p) => p[0])), Math.max(...box.map((p) => p[1]))];
    const zoomIn = Math.min(D.W / (hi[0] - lo[0] + 90), D.H / (hi[1] - lo[1] + 90));
    const centre = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
    const camAt = (z: number) => {
      const s = zoomIn + (1 - zoomIn) * z;
      const tx = (D.W / 2 - centre[0] * zoomIn) * (1 - z);
      const ty = (D.H / 2 - centre[1] * zoomIn) * (1 - z);
      return { s, tx, ty };
    };

    const state = {
      deg: D.rest,
      omega: 0,
      running: false,
      apart: false,
      parking: false,
      part: null as string | null,
      clock: 0,
      run: { x: 0, v: 0 },
      cam: { x: 0, v: 0 },
      phase: Math.random() * 10,
      smoke: [] as Puff[],
      air: [] as Puff[],
      emitSmoke: 0,
      emitAir: 0,
      announced: "",
    };
    let touring = !still.matches;
    let tourClock = 0;
    let tourTimer = 0;
    let frame = 0;
    let last = 0;
    let visible = false;

    const say = (text: string) => {
      if (readout && readout.textContent !== text) readout.textContent = text;
    };
    const announce = (text: string) => {
      if (liveRegion && state.announced !== text) liveRegion.textContent = state.announced = text;
    };
    const buttons = () => {
      if (runButton) {
        runButton.dataset.state = state.running ? "on" : "off";
        runButton.querySelector("[data-label]")!.textContent = state.running ? "Parar" : "Arrancar";
      }
      if (apartButton) apartButton.querySelector("[data-label]")!.textContent = state.apart ? "Ensamblar" : "Desensamblar";
    };

    function schedule(apart: boolean) {
      const goal = apart ? 1 : 0;
      const list = apart ? D.stagger : [...D.stagger].reverse();
      let index = 0;
      for (const id of list) {
        const spring = pieces[id];
        if (!spring) continue;
        if (spring.target === goal && !spring.pending) continue;
        spring.pending = { value: goal, at: state.clock + (still.matches ? 0 : index++ * D.spring.stagger) };
      }
    }
    function setApart(apart: boolean) {
      if (apart === state.apart && !state.parking) return;
      state.apart = apart;
      if (apart) {
        state.running = false;
        state.parking = true; // turn on to top dead centre first, then come apart
      } else {
        state.parking = false;
        schedule(false);
      }
      buttons();
      announce(apart ? "desensamblando" : "ensamblando");
      run();
    }
    function setRunning(on: boolean) {
      if (on && state.apart) setApart(false);
      state.running = on;
      if (on) state.parking = false;
      buttons();
      announce(on ? "arrancando" : "parando");
      run();
    }
    function select(id: string | null) {
      state.part = id;
      for (const node of nodes) {
        if (id && node.piece === id) node.el.setAttribute("data-on", "");
        else node.el.removeAttribute("data-on");
      }
      if (id) stage.setAttribute("data-focus", "");
      else stage.removeAttribute("data-focus");
      partButtons.forEach((b) => (b.dataset.part === id ? b.setAttribute("data-on", "") : b.removeAttribute("data-on")));
      run();
    }

    function stepSpring(s: Spring, dt: number, calm: boolean) {
      if (s.pending && state.clock >= s.pending.at) {
        s.target = s.pending.value;
        s.pending = null;
      }
      if (calm) {
        s.x = s.target;
        s.v = 0;
        return s.pending !== null;
      }
      const { substeps, stiffness, damping } = D.spring;
      for (let i = 0; i < substeps; i++) {
        const h = dt / substeps;
        s.v += ((s.target - s.x) * stiffness - s.v * damping) * h;
        s.x += s.v * h;
      }
      if (Math.abs(s.target - s.x) < 2e-4 && Math.abs(s.v) < 2e-4) {
        s.x = s.target;
        s.v = 0;
        return s.pending !== null;
      }
      return true;
    }

    // one pose of the mechanism at a crank angle
    const restCrown = crankAt(D.rest).crown;
    const restPin = pinAt(D.rest);
    function pose() {
      const deg = state.deg;
      const share = (id: string) => pieces[id]?.x ?? 0;
      const lifted = (id: string, extra: Vec3 = [0, 0, 0]) => screen([extra[0], extra[1], extra[2] + (D.lifts[id] ?? 0) * share(id)]);
      const set = (node: Node, offset: Flat) => {
        const text = Math.abs(offset[0]) < 0.005 && Math.abs(offset[1]) < 0.005 ? "" : `translate(${offset[0].toFixed(2)} ${offset[1].toFixed(2)})`;
        if (text !== node.shown) {
          node.shown = text;
          if (text) node.el.setAttribute("transform", text);
          else node.el.removeAttribute("transform");
        }
      };
      const iLift = intakeLift(deg);
      const eLift = exhaustLift(deg);
      for (const node of nodes) {
        let extra: Vec3 = [0, 0, 0];
        if (node.piece === "piston") extra = [0, 0, crankAt(deg).crown - restCrown];
        else if (node.name === "valve-intake") extra = D.axes.intake.map((v) => -v * iLift) as Vec3;
        else if (node.name === "valve-exhaust") extra = D.axes.exhaust.map((v) => -v * eLift) as Vec3;
        else if (node.name === "pin") {
          const p = pinAt(deg);
          extra = [p[0] - restPin[0], 0, p[2] - restPin[2]];
        }
        set(node, lifted(node.piece, extra));
      }
      const rod = rodPaths(deg);
      writeSolid(rodParts, rod.paths);
      bearingEl?.setAttribute("d", rod.bearing);
      capEl?.setAttribute("d", rod.capLine);
      weightEl?.setAttribute("d", counterweightPath(deg));
      for (const [id, lift] of [["intake", iLift], ["exhaust", eLift]] as const) {
        const spring = springPaths(id, lift);
        springEls[id][0]?.setAttribute("d", spring.back);
        springEls[id][1]?.setAttribute("d", spring.front);
      }
      // re-sort the back layer only when the order changes
      const keyOf = (i: number) => sorted[i].key + sorted[i].lift * share(sorted[i].piece);
      const next = sorted.map((_, i) => i).sort((a, b) => keyOf(a) - keyOf(b));
      if (next.some((v, i) => v !== order[i])) {
        const fragment = document.createDocumentFragment();
        for (const i of next) fragment.appendChild(sorted[i].el);
        backLayer.appendChild(fragment);
        order = next;
      }
      const cam = camAt(state.cam.x);
      const transform = `translate(${cam.tx.toFixed(2)} ${cam.ty.toFixed(2)}) scale(${cam.s.toFixed(4)})`;
      for (const g of cams) g.setAttribute("transform", transform);
      return cam;
    }

    function gas(dt: number, calm: boolean, cam: { s: number; tx: number; ty: number }) {
      const g = gasAt(state.deg);
      const together = Object.values(pieces).every((s) => s.x < 0.01 && s.target === 0);
      const active = state.omega > 1 && together;
      const moving = settle(state.run, active ? 1 : 0, dt, 0.35, calm);
      // exhaust puffs leave the pipe while the exhaust valve is open; air goes into the filter during intake
      const speed = state.omega / DEG_PER_S;
      if (!calm && active) {
        state.emitSmoke += dt * 9 * g.exhaustFlow * speed;
        state.emitAir += dt * 7 * g.intakeFlow * speed;
      }
      while (state.emitSmoke >= 1) {
        state.emitSmoke -= 1;
        const d = D.gas.pipeDir;
        state.smoke.push({ p: [...D.gas.pipeEnd] as Vec3, v: [d[0] * 70, 0, d[2] * 70], age: 0 });
      }
      while (state.emitAir >= 1) {
        state.emitAir -= 1;
        const m = D.gas.podMouth;
        state.air.push({ p: [m[0] - 50, (Math.random() - 0.5) * 30, m[2] + (Math.random() - 0.5) * 30], v: [0, 0, 0], age: 0 });
      }
      for (const puff of state.smoke) {
        puff.age += dt / 1.6;
        puff.v[2] += 26 * dt;
        puff.v[0] *= 1 - 0.8 * dt;
        puff.p = [puff.p[0] + puff.v[0] * dt, puff.p[1], puff.p[2] + puff.v[2] * dt];
      }
      for (const puff of state.air) {
        puff.age += dt / 0.9;
        const m = D.gas.podMouth;
        puff.p = puff.p.map((v, i) => v + (m[i] - v) * Math.min(1, dt * 2.6)) as Vec3;
      }
      state.smoke = state.smoke.filter((p) => p.age < 1.15).slice(-10);
      state.air = state.air.filter((p) => p.age < 1).slice(-8);
      const pack = (list: Puff[], n: number) => {
        const out = new Float32Array(n * 4);
        list.forEach((p, i) => out.set([p.p[0], p.p[1], p.p[2], Math.max(0.001, p.age)], i * 4));
        return out;
      };
      if (layer) {
        if (state.run.x > 0.002 || state.smoke.length) {
          layer.draw(
            {
              uCrown: g.crown,
              uFresh: g.fresh,
              uSqueeze: Math.min(1, Math.max(0, (1 / g.volume - 1) / 8)),
              uFlame: g.flame,
              uFront: g.front,
              uBurnt: g.burnt,
              uIn: g.intakeFlow,
              uEx: g.exhaustFlow,
              uSpark: calm ? 0 : g.spark,
              uRun: state.run.x,
              uPhase: state.phase,
              uSmoke: pack(state.smoke, 10),
              uAir: pack(state.air, 8),
              uOrigin: [D.camera.origin[0] * cam.s + cam.tx, D.camera.origin[1] * cam.s + cam.ty],
              uK: D.camera.k * cam.s,
            },
            calm ? 1.2 : state.clock,
          );
        } else layer.clear();
      }
      return moving || state.smoke.length > 0 || state.air.length > 0;
    }

    function tourTick(dt: number) {
      tourClock += dt;
      const total = TOUR.reduce((n, [, s]) => n + s, 0);
      let t = tourClock % total;
      for (const [step, seconds] of TOUR) {
        if (t < seconds) {
          if (step === "run" && !state.running) setRunning(true);
          if (step === "apart" && !state.apart) setApart(true);
          if (step === "together" && state.apart) setApart(false);
          return;
        }
        t -= seconds;
      }
    }

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const calm = still.matches;
      state.clock += dt;
      if (touring) tourTick(dt);
      // the crank: spin up and down smoothly; when parking, run on to the next top dead centre
      let busy = false;
      if (state.parking) {
        const goal = D.rest + 720 * Math.ceil((state.deg - D.rest) / 720 - 1e-6);
        const left = goal - state.deg;
        if (calm || left < 0.5) {
          state.deg = goal;
          state.omega = 0;
          state.parking = false;
          schedule(true);
        } else {
          state.omega = Math.min(DEG_PER_S, Math.max(18, left * 2.2));
          state.deg += state.omega * dt;
        }
        busy = true;
      } else {
        const target = state.running ? DEG_PER_S : 0;
        state.omega = calm ? target : state.omega + (target - state.omega) * (1 - Math.exp(-dt / 0.6));
        if (!state.running && state.omega < 2) state.omega = 0;
        state.deg += state.omega * dt;
        busy = state.omega > 0;
      }
      if (state.deg > 7200) state.deg -= 7200;
      for (const s of Object.values(pieces)) busy = stepSpring(s, dt, calm) || busy;
      const apartShare = Math.max(...Object.values(pieces).map((s) => s.x));
      busy = settle(state.cam, state.apart ? 1 : Math.min(1, apartShare * 1.4), dt, 0.45, calm) || busy;
      const cam = pose();
      busy = gas(dt, calm, cam) || busy;
      const movingParts = Object.values(pieces).some((s) => s.pending || Math.abs(s.x - s.target) > 1e-3);
      const partName = state.part ? D.parts.find((p) => p.id === state.part)?.say ?? null : null;
      say(readoutOf({ moving: movingParts || state.parking, apart: state.apart, running: state.omega > 1, deg: state.deg, part: partName }));
      if (state.omega > 1 && !state.apart) announce(strokeOf(state.deg).name);
      frame = visible && (busy || touring) ? requestAnimationFrame(tick) : 0;
    }
    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const takeOver = () => {
      touring = false;
      window.clearTimeout(tourTimer);
      if (!still.matches) tourTimer = window.setTimeout(() => ((touring = true), (tourClock = 0), run()), TOUR_BACK * 4);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("[data-run]")) {
        takeOver();
        setRunning(!state.running);
      } else if (target.closest("[data-apart]")) {
        takeOver();
        setApart(!state.apart);
      } else {
        const button = target.closest<HTMLButtonElement>("[data-part]");
        const node = target.closest<SVGGElement>(".it");
        const id = button?.dataset.part ?? node?.dataset.piece ?? null;
        if (!id || id === "stand") return;
        takeOver();
        select(state.part === id ? null : id);
      }
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const node = (event.target as Element).closest<SVGGElement>(".it");
      const id = node?.dataset.piece;
      if (id && id !== state.part) select(id);
    };
    const onLeave = () => select(null);
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (event.key === " " || event.key === "Enter") setRunning(!state.running);
      else if (event.key.toLowerCase() === "d" || event.key === "ArrowUp") setApart(true);
      else if (event.key.toLowerCase() === "e" || event.key === "ArrowDown") setApart(false);
      else if (index >= 0 && index < D.parts.length) select(D.parts[index].id);
      else if (event.key === "Escape") (select(null), setRunning(false), setApart(false));
      else return;
      event.preventDefault();
      takeOver();
    };
    host.addEventListener("click", onClick);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("keydown", onKey);
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) run();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(stage);
    const onResize = () => run();
    window.addEventListener("resize", onResize);
    buttons();
    pose();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(tourTimer);
      host.removeEventListener("click", onClick);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("keydown", onKey);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [data]);

  return (
    <div ref={root} className="e4-live">
      {children}
    </div>
  );
}
