// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// The truth behind the figure: a 180/55 ZR17 rear tyre on a 5.50 × 17 rim,
// changed on a manual stand. Every number the card shows comes from here.
import { surfaceAt } from "./shapes";
import { ARM_IN, BREAKER_REST, PIVOT_Z, SHOE, SHOE_R } from "./view";

export const TYRE = {
  width: 180, // mm, section width
  aspect: 55, // %, sidewall height over width
  rim: 17, // in, bead-seat diameter
  rimWidth: 5.5, // in, between the flanges
};

export const SIDEWALL_MM = (TYRE.width * TYRE.aspect) / 100; // 99 mm
export const BEAD_DIAMETER_MM = TYRE.rim * 25.4; // 431.8 mm
export const OUTER_DIAMETER_MM = BEAD_DIAMETER_MM + SIDEWALL_MM * 2; // 629.8 mm

export const PSI_PER_BAR = 14.5038;
export const SPEC_BAR = 2.5; // rear, solo, cold
export const SPEC_PSI = SPEC_BAR * PSI_PER_BAR; // 36.3
export const SEAT_PSI = 38; // where this bead pops onto its seat
export const SEAT_LIMIT_PSI = 40; // never exceed while seating a bead
export const GAUGE_MAX_PSI = 60;

export const TREAD_NEW_MM = 6.0;
export const TREAD_LIMIT_MM = 1.6; // the wear bars: legal minimum

// Air, in figure time (the change is sped up about tenfold; the pressures are true).
const VENT_TAU = 0.55; // s, valve core out
const FLOW = 16; // psi/s from the compressor into a sealed tyre
const LEAK = 0.12; // 1/s, air escaping past a bead that hasn't seated
const TRIM_TAU = 0.35; // s, bleeding from SEAT_PSI down to spec

export interface Pose {
  psi: number;
  open: number; // valve open to the gauge bleed, 0..1
  breaker: number; // 0 raised, 1 shoe pressing the sidewall
  drop: number; // top bead: 0 on its seat, 1 pushed into the drop centre
  over: number; // top bead: 0 inside the flange, 1 levered over it
  lube: number; // 0 dry, 1 bead and seat soaped
  lever: number; // 0 on the base, 1 under the bead, 2 pried down
  lift: number; // 0 on the rim, 1 lifted clear
  tread: number; // 0 worn to the bars, 1 new
  leak: number; // 0..1, air escaping past the bead (bubbles)
  compressor: number; // 0..1
  pop: number; // seconds since the bead popped onto its seat (negative: not yet)
}

export interface Step {
  name: string;
  brief: string;
  length: number;
}

// The full change, stage by stage. The figure shows the last three: the stages before
// (deflate, break the bead, soap it) are where it starts.
const STAGES = [3.0, 3.0, 3.4, 2.2, 3.4, 4.8, 4.4, 2.6];

export const STEPS: Step[] = [
  { name: "Palanca", brief: "El desmontador saca el talón sobre la pestaña", length: STAGES[4]! },
  { name: "Cambiar", brief: "Sale la gastada, entra la nueva", length: STAGES[5]! },
  { name: "Asentar", brief: "Aire hasta que el talón salta a su asiento y se purga a 2,5 bar", length: STAGES[6]! + STAGES[7]! },
];

export const REST: Pose = {
  psi: SPEC_PSI,
  open: 0,
  breaker: 0,
  drop: 0,
  over: 0,
  lube: 0,
  lever: 0,
  lift: 0,
  tread: 0,
  leak: 0,
  compressor: 0,
  pop: -1,
};

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const ease = (value: number) => {
  const u = clamp(value);
  return u * u * (3 - 2 * u);
};
const ramp = (t: number, from: number, to: number) => ease((t - from) / (to - from));

// The bead breaker: a lever on a pin, its shoe hanging from the inner end. At `breaker` b
// the inner arm sits at BREAKER_REST − (BREAKER_REST + 6)·b degrees; where the shoe would go
// below the seated sidewall it pushes the bead down instead.
const RAD = Math.PI / 180;
const shoeZ = (b: number) => {
  const theta = (BREAKER_REST - (BREAKER_REST + 6) * b) * RAD;
  return PIVOT_Z + ARM_IN * Math.sin(theta) - SHOE * Math.cos(theta);
};
const SEATED_AT_SHOE = surfaceAt(SHOE_R, 0, 0);
const SUNK_AT_SHOE = surfaceAt(SHOE_R, 1, 0);
export function dropUnder(b: number) {
  return clamp((SEATED_AT_SHOE - shoeZ(b)) / (SEATED_AT_SHOE - SUNK_AT_SHOE));
}

// Seconds from the start of inflating until the leaking bead reaches SEAT_PSI.
export const SEAT_AT = -Math.log(1 - (SEAT_PSI * LEAK) / FLOW) / LEAK;

function inflated(t: number) {
  if (t <= 0) return 0;
  if (t < SEAT_AT) return (FLOW / LEAK) * (1 - Math.exp(-LEAK * t));
  return SEAT_PSI;
}

// The scripted pose at time t into a step, starting from that step's canonical start.
function stage(step: number, t: number): Pose {
  const worn = { ...REST };
  switch (step) {
    case 0:
      return { ...worn, tread: 1 - ramp(t, 0.2, 2.2) };
    case 1:
      return { ...worn, open: ramp(t, 0, 0.25) * (1 - ramp(t, 2.6, 2.95)), psi: t < 0.2 ? SPEC_PSI : SPEC_PSI * Math.exp(-(t - 0.2) / VENT_TAU) };
    case 2: {
      const press = ramp(t, 0.1, 1.3) * (1 - ramp(t, 2.2, 3.2));
      const most = t < 2.2 ? press : 1;
      return { ...worn, psi: 0, breaker: press, drop: dropUnder(most) };
    }
    case 3:
      return { ...worn, psi: 0, drop: 1, lube: ramp(t, 0.2, 1.8) };
    case 4: {
      const lever = ramp(t, 0, 1.0) + ramp(t, 1.2, 2.1) - 2 * ramp(t, 2.3, 3.3);
      return { ...worn, psi: 0, drop: 1, lube: 1, lever, over: ramp(t, 1.2, 2.1) };
    }
    case 5: {
      const up = ramp(t, 0.1, 1.4) * (1 - ramp(t, 2.9, 4.4));
      return { ...worn, psi: 0, drop: 1, lube: 1, over: 1 - ramp(t, 3.4, 4.4), lift: up, tread: ramp(t, 1.5, 2.7) };
    }
    case 6: {
      const air = Math.max(0, t - 0.3);
      const psi = inflated(air);
      const sealed = air >= SEAT_AT;
      const since = sealed ? air - SEAT_AT : -1;
      return {
        ...worn,
        tread: 1,
        lube: 1,
        psi,
        compressor: ramp(t, 0, 0.3) * (sealed ? 1 - ease(since / 0.3) : 1),
        drop: sealed ? 1 - ease(since / 0.12) : 1,
        leak: sealed ? 0 : clamp(psi / SEAT_PSI) * ramp(t, 0.4, 0.9),
        pop: since,
      };
    }
    case 7:
      return {
        ...worn,
        tread: 1,
        lube: 1 - ramp(t, 0.4, 2.4),
        open: ramp(t, 0.1, 0.3) * (1 - ramp(t, 1.6, 2.0)),
        psi: t < 0.2 ? SEAT_PSI : SPEC_PSI + (SEAT_PSI - SPEC_PSI) * Math.exp(-(t - 0.2) / TRIM_TAU),
        pop: 10 + t,
      };
    default:
      return worn;
  }
}

export function scripted(step: number, t: number): Pose {
  if (step === 0) return stage(4, t);
  if (step === 1) return stage(5, t);
  return t < STAGES[6]! ? stage(6, t) : stage(7, t - STAGES[6]!);
}

export const startOf = (step: number) => scripted(step, 0);
export const endOf = (step: number) => scripted(step, STEPS[step]!.length);

export const barOf = (psi: number) => psi / PSI_PER_BAR;
export const treadOf = (pose: Pose) => TREAD_LIMIT_MM + (TREAD_NEW_MM - TREAD_LIMIT_MM) * pose.tread;

const comma = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");

export function readoutOf(step: number, pose: Pose) {
  const psi = Math.max(0, pose.psi);
  const bar = barOf(psi);
  return `${STEPS[step]!.name.toLowerCase()} · ${comma(bar < 0.005 ? 0 : bar, 2)} bar · ${Math.round(psi)} psi · huella ${comma(treadOf(pose), 1)} mm`;
}

export function spokenOf(step: number, pose: Pose) {
  const psi = Math.max(0, pose.psi);
  return `Paso ${step + 1} de ${STEPS.length}, ${STEPS[step]!.name}: ${STEPS[step]!.brief}. ${comma(barOf(psi), 1)} bar, ${Math.round(psi)} psi, huella ${comma(treadOf(pose), 1)} milímetros.`;
}

/** The three pieces the chips name, in the order they are numbered. */
export const PARTS = [
  { id: "tyre", name: "Llanta" },
  { id: "rim", name: "Rin" },
  { id: "gauge", name: "Manómetro" },
];
