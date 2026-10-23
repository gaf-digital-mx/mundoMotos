// The four-stroke model: dimensions of a 150 cc air-cooled single, its kinematics and valve
// timing, and the state of the gas in the cylinder at any crank angle. Pure numbers and
// functions, shared by the geometry build and the live figure. World units are millimetres:
// x runs from the intake (−x) to the exhaust (+x), y along the crankshaft (the cutaway plane is
// y = 0, the viewer is on +y), z up from the stand.

export const BORE = 57.3;
export const STROKE = 57.8;
export const ROD = 103;
export const PIN_TO_CROWN = 26;
export const SKIRT = 18;
export const COMPRESSION = 9.5;
export const R_BORE = BORE / 2;
export const CRANK_R = STROKE / 2;

export const Z0 = 92; // crank centre above the stand
export const CASE_TOP = Z0 + 70;
export const DECK = Z0 + CRANK_R + ROD + PIN_TO_CROWN + 1.2; // 1.2 mm squish at TDC
export const HEAD_TOP = DECK + 54;

// valve timing in crank degrees, 0 = TDC at the start of intake, a cycle is 720°
export const TIMING = { ivo: -10, ivc: 215, evo: 505, evc: 730, spark: 348, lift: 7.2 };
export const VALVE_TILT = 21;
export const VALVES = {
  intake: { x: -13.5, r: 13, side: -1 },
  exhaust: { x: 13.5, r: 11, side: 1 },
};

const DEG = Math.PI / 180;
const wrap = (deg) => ((deg % 720) + 720) % 720;

// slider-crank: the pin height above the crank centre, and the rod's angle from vertical
export function crankAt(deg) {
  const a = deg * DEG;
  const s = CRANK_R * Math.sin(a);
  const c = CRANK_R * Math.cos(a);
  const h = Math.sqrt(ROD * ROD - s * s);
  return { pin: [s, c], piston: c + h, rod: Math.atan2(-s, h), crown: Z0 + c + h + PIN_TO_CROWN };
}

// a smooth lift event between open and close (crank degrees, may cross 720)
function liftOf(deg, open, close) {
  const t = wrap(deg - open) / (close - open);
  if (t < 0 || t > 1) return 0;
  return TIMING.lift * Math.sin(Math.PI * t) ** 1.6;
}
export const intakeLift = (deg) => liftOf(deg, TIMING.ivo, TIMING.ivc);
export const exhaustLift = (deg) => liftOf(deg, TIMING.evo, TIMING.evc);

const STROKES = [
  { name: "admisión", what: "entra la mezcla", from: 0 },
  { name: "compresión", what: "mezcla comprimida", from: 180 },
  { name: "explosión", what: "la chispa la enciende", from: 360 },
  { name: "escape", what: "salen los gases", from: 540 },
];
export const strokeOf = (deg) => STROKES[Math.floor(wrap(deg) / 180)];

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// What fills the cylinder, as continuous functions of crank angle so nothing pops:
// fresh charge, how compressed it is, the flame, the burnt gas, flow in each port.
export function gasAt(deg) {
  const d = wrap(deg);
  const { crown } = crankAt(d);
  const volume = (DECK + 4 - crown) / (DECK + 4 - crankAt(180).crown); // share of the BDC volume
  const fresh = d < 360 ? 0.2 + 0.8 * smooth(0, 150, d) : d < 700 ? 1 - smooth(360, 372, d) : 0.2 * smooth(700, 720, d);
  const flame = d < 345 ? 0 : d < 420 ? smooth(347, 380, d) : 1 - smooth(420, 540, d);
  const front = smooth(347, 372, d); // flame front radius as a share of the bore
  const burnt = d < 360 ? 0.35 * (1 - smooth(0, 90, d)) : d < 540 ? smooth(360, 470, d) : 1 - 0.65 * smooth(540, 715, d);
  const intakeFlow = intakeLift(d) / TIMING.lift;
  const exhaustFlow = exhaustLift(d) / TIMING.lift;
  const spark = Math.max(0, 1 - Math.abs(d - TIMING.spark - 2) / 6);
  return { crown, volume, fresh, flame, front, burnt, intakeFlow, exhaustFlow, spark };
}

export const PARTS = [
  { id: "valves", name: "Válvulas", say: "válvulas · admisión Ø26, escape Ø22 mm" },
  { id: "head", name: "Culata", say: "culata · cámara de combustión y bujía" },
  { id: "cylinder", name: "Cilindro", say: "cilindro · Ø57.3 mm, aletas de refrigeración" },
  { id: "piston", name: "Pistón", say: "pistón · carrera 57.8 mm, 3 aros" },
  { id: "rod", name: "Biela", say: "biela · 103 mm entre centros" },
  { id: "crank", name: "Cigüeñal", say: "cigüeñal · muñequilla a 28.9 mm del eje" },
  { id: "case", name: "Cárter", say: "cárter · aloja el cigüeñal y el aceite" },
];

// how far each part rises when the engine comes apart, bottom of the stack first
export const LIFT = { case: 0, crank: 136, rod: 196, piston: 246, cylinder: 384, head: 410, valves: 490 };
export const STAGGER = ["valves", "head", "cylinder", "piston", "rod", "crank", "case"];
export const SPRING = { stagger: 0.06, stiffness: 46, damping: 12.6, substeps: 4 };

export const RPM_SHOWN = 24; // the cycle runs slowly enough to follow: one turn in 2.5 s

export function readoutOf(state) {
  if (state.moving) return state.apart ? "desensamblando" : "ensamblando";
  if (state.apart) return state.part ? state.part : "desensamblado · 7 piezas";
  if (!state.running) return state.part ?? "ensamblado · parado en PMS";
  const s = strokeOf(state.deg);
  return `${s.name} · ${s.what} · ${Math.round(((state.deg % 720) + 720) % 720)}°`;
}
