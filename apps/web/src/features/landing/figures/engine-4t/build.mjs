// Static geometry for the four-stroke figure. Run `node build.mjs` to write art.generated.json.
// Everything is drawn at the rest pose (crank at 360°, top dead centre before the power stroke);
// the live figure moves the piston and valves, and rebuilds the rod, pin, counterweight and
// springs from moving.mjs every frame.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../shared/iso/iso-kit.mjs";
import * as G from "../../../../shared/iso/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../shared/iso/tube.mjs";
import { glCamera } from "../../../../shared/iso/gl.mjs";
import { Z0, R_BORE, DECK, HEAD_TOP, CASE_TOP, PIN_TO_CROWN, SKIRT, VALVES, LIFT, STAGGER, SPRING, PARTS, crankAt } from "./model.mjs";
import { W, H, P, PLATE, at, X, Y, Z, CRANK_F, valveFrame, springSeat, RETAINER_S, VALVE_SEAT_Z } from "./view.mjs";
import { WEB, rodPaths, counterweightPath, pinPaths, springPaths, ROD_HALF, PIN_R } from "./moving.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REST = 360;
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const along = (o, a, u, v) => G.frameOf(o, a, u, v);
const hexagon = (r, phase = Math.PI / 6) => Array.from({ length: 6 }, (_, i) => [r * Math.cos(phase + (i * Math.PI) / 3), r * Math.sin(phase + (i * Math.PI) / 3)]);
const poly = (points) => k.pathOf(points.map(([x, z]) => at([x, 0, z])), true);
const arc = (cx, cz, r, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
});
const capsule = ([ax, az], [bx, bz], r) => {
  const ang = Math.atan2(bz - az, bx - ax);
  return [...arc(bx, bz, r, ang - Math.PI / 2, ang + Math.PI / 2, 12), ...arc(ax, az, r, ang + Math.PI / 2, ang + (3 * Math.PI) / 2, 12)];
};

// every drawn item: which part it belongs to, its painter's key, and its markup
const items = [];
const put = (piece, key, svg, extra = {}) => items.push({ piece, key, svg, ...extra });
// solid markup whose paths can be rewritten each frame (all four shades always present)
const live = (paths, tone, role) =>
  `<g class="iso-solid" data-live="${role}"><path class="iso-fill" d="${paths.fill}"/>${paths.shades.map((d, i) => `<path class="iso-shade" data-shade="${i}" d="${d}"/>`).join("")}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="faint" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;

// ---------------------------------------------------------------- stand
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -22, 22, P)}"/>`);
const FEET = k.corners(PLATE, 20).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of FEET) {
  back.push(S(k.cylinder(x, y, 9, -22, 2, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 6.6, -20, 8, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
const SCREWS = k.corners(PLATE, 13);
back.push(Ln(SCREWS.map(([x, y]) => k.ring(x, y, 2.8, 0, P, 18)).join(""), { tone: "lo" }));
back.push(Dots(SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
const STRIP = { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 15, w: 210, d: 8, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y, 0.8, [1.8, 3.3], P);
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 4, 0.8]), at([STRIP.x + STRIP.w - 2, STRIP.y + 4, 0.8])], { size: 0.45 }));
const TAG = { x: PLATE.x + PLATE.w - 80, y: PLATE.y + 16, w: 64, d: 14, r: 1.5 };
back.push(S(k.slabOf(TAG, 0, 1, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(TAG, 1.8), 1, P), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([TAG.x + 6, TAG.y + 9], 1, P, "x"), "150 CC 4T", { size: 4.6, tone: "lo" }));
back.push(Dots([at([TAG.x + 2.6, TAG.y + TAG.d / 2, 1]), at([TAG.x + TAG.w - 2.6, TAG.y + TAG.d / 2, 1])], { size: 0.45 }));
// two engine mounts under the crankcase
for (const x of [-46, 46]) {
  const foot = { x: x - 11, y: -33, w: 22, d: 22, r: 3 };
  back.push(S(k.slabOf(foot, 0, 3, P, 3, 0.4), { tone: "mid" }), Dots(k.corners(foot, 3.4).map(([px, py]) => at([px, py, 3])), { size: 0.42 }));
  back.push(S(k.cylinder(x, -22, 6, 3, Z0 - 66 - 3, P, 24), { tone: "mid", inner: Ln(k.sideArc(x, -22, 6, 14, P, 20), { tone: "faint" }) }));
}

// ---------------------------------------------------------------- crankcase, back half (cut at y = 0)
const D_CASE = 44;
const CASE_CORNERS = [[-82, Z0 + 22], [-80, Z0 - 20], [-70, Z0 - 50], [-40, Z0 - 66], [30, Z0 - 66], [68, Z0 - 50], [84, Z0 - 18], [80, Z0 + 30], [54, Z0 + 62], [32, CASE_TOP], [-32, CASE_TOP], [-62, Z0 + 56]];
const chaikin = (points) => points.flatMap((p, i) => {
  const q = points[(i + 1) % points.length];
  return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]];
});
const CASE_PROFILE = chaikin(chaikin(CASE_CORNERS));
const CASE_F = along([0, -D_CASE, 0], Y, X, Z);
const caseSolid = S(G.prismOf(CASE_F, CASE_PROFILE, 0, D_CASE, P), { tone: "mid" });
const CHAMBER_R = 50;
const meet = Math.sqrt(CHAMBER_R ** 2 - (R_BORE + 1) ** 2);
const CASE_CAVITY = [[R_BORE + 1, CASE_TOP], [R_BORE + 1, Z0 + meet], ...arc(0, Z0, CHAMBER_R, Math.atan2(meet, R_BORE + 1), Math.atan2(meet, -(R_BORE + 1)) - 2 * Math.PI, 48), [-(R_BORE + 1), CASE_TOP]];
const caseCut = `<path class="et-cavity" d="${poly(CASE_CAVITY)}"/>` + Ln(poly(CASE_CAVITY), { tone: "lo" });
const caseBolts = Dots([[-70, Z0 + 10], [-56, Z0 - 44], [56, Z0 - 44], [72, Z0 + 4], [64, Z0 + 40], [-50, Z0 + 46]].map(([x, z]) => at([x, 0, z])), { size: 0.9, tone: "mid" });
// the main bearing in the back wall, seen through the chamber
const bearing = Ln(G.circleOf(CRANK_F, -D_CASE + 6, 16, P, 40), { tone: "lo" });
put("case", 10, caseSolid + caseCut + bearing + caseBolts);

// ---------------------------------------------------------------- cylinder, back half
const halfRing = (rOut, rIn, n = 40) => [...arc(0, 0, rOut, 0, -Math.PI, n), ...arc(0, 0, rIn, -Math.PI, 0, n)];
const cylParts = [];
const BARREL_R = 35;
const FIN_R = 47;
for (let z = CASE_TOP; z < DECK - 0.01; ) {
  const top = Math.min(z + 2, DECK);
  cylParts.push(S(k.extrude(halfRing(z === CASE_TOP ? BARREL_R + 4 : FIN_R, R_BORE), z, top - z, P, { convex: false }), { tone: "mid", crease: "none" }));
  z = top;
  const next = Math.min(z + 5.2, DECK);
  if (next > z) cylParts.push(S(k.extrude(halfRing(BARREL_R, R_BORE), z, next - z, P, { convex: false }), { tone: "lo", crease: "none" }));
  z = next;
}
put("cylinder", 12, cylParts.join(""));

// ---------------------------------------------------------------- head, back half, with its ports cut open
const D_HEAD = 40;
const HEAD_F = along([0, -D_HEAD, 0], Y, X, Z);
const headParts = [];
const slice = (hx, z0, z1, tone) => headParts.push(S(G.prismOf(HEAD_F, [[-hx, z0], [hx, z0], [hx, z1], [-hx, z1]], 0, D_HEAD, P), { tone, crease: "none" }));
let hz = DECK;
for (const finAt of [DECK + 3, DECK + 10, DECK + 17]) {
  if (finAt > hz) slice(46, hz, finAt, "mid");
  slice(56, finAt, finAt + 2, "mid");
  hz = finAt + 2;
}
headParts.push(S(G.prismOf(HEAD_F, [[-46, hz], [46, hz], [46, HEAD_TOP - 6], [40, HEAD_TOP], [-40, HEAD_TOP], [-46, HEAD_TOP - 6]], 0, D_HEAD, P), { tone: "mid", crease: "faint" }));
const DOME_H = 9;
const CHAMBER = [...Array.from({ length: 25 }, (_, i) => {
  const x = R_BORE - (2 * R_BORE * i) / 24;
  return [x, DECK + DOME_H * Math.sqrt(Math.max(0, 1 - (x / R_BORE) ** 2))];
}), [-R_BORE, DECK - 0.01], [R_BORE, DECK - 0.01]];
const IN_PORT = capsule([VALVES.intake.x - 2, VALVE_SEAT_Z + 3], [-48, DECK + 33], 8.5);
const EX_PORT = capsule([VALVES.exhaust.x + 2, VALVE_SEAT_Z + 3], [48, DECK + 33], 8);
const PLUG_HOLE = [[-6, DECK + 6], [6, DECK + 6], [6, HEAD_TOP], [-6, HEAD_TOP]];
const guide = (id) => {
  const F = valveFrame(id);
  const a = F.a;
  const n = [a[2], 0, -a[0]];
  const p0 = G.pointOf(F, 12, 0, 0);
  const p1 = G.pointOf(F, (HEAD_TOP - VALVE_SEAT_Z) / a[2], 0, 0);
  return [[p0[0] + n[0] * 3.4, p0[2] + n[2] * 3.4], [p1[0] + n[0] * 3.4, p1[2] + n[2] * 3.4], [p1[0] - n[0] * 3.4, p1[2] - n[2] * 3.4], [p0[0] - n[0] * 3.4, p0[2] - n[2] * 3.4]];
};
const headCut = [CHAMBER, IN_PORT, EX_PORT, PLUG_HOLE, guide("intake"), guide("exhaust")].map((shape) => `<path class="et-cavity" d="${poly(shape)}"/>`).join("") + Ln([CHAMBER, IN_PORT, EX_PORT, PLUG_HOLE, guide("intake"), guide("exhaust")].map(poly).join(""), { tone: "lo" });
// spark plug, whole, on the centre line
const PLUG_F = along([0, 0, 0], Z, X, Y);
const plugSvg =
  S(G.solidOf([[DECK + 5, 0], [DECK + 5, 1.2], [HEAD_TOP - 0.01, 1.2], [HEAD_TOP - 0.01, 0]], PLUG_F, P), { tone: "mid" }) +
  S(G.solidOf([[DECK + 9.5, 0], [DECK + 9.5, 5.6], [HEAD_TOP, 5.6], [HEAD_TOP, 0]], PLUG_F, P), { tone: "mid", inner: Ln([DECK + 16, DECK + 23, DECK + 30, DECK + 37, DECK + 44].map((z) => G.arcOf(PLUG_F, z, 5.6, P)).join(""), { tone: "faint" }) }) +
  S(G.prismOf(along([0, 0, HEAD_TOP], Z, X, Y), hexagon(8.2), 0, 7, P), { tone: "hi" }) +
  S(G.solidOf([[HEAD_TOP + 7, 0], [HEAD_TOP + 7, 5], [HEAD_TOP + 25, 4.2], [HEAD_TOP + 25, 2], [HEAD_TOP + 30, 2], [HEAD_TOP + 30, 0]], PLUG_F, P), { tone: "hi" }) +
  Faded(G.ribsOf(PLUG_F, HEAD_TOP + 10, HEAD_TOP + 22, 4.8, 12, P, { fade: [0.1, 0.55], seams: true, r1: 4.4 }), { tone: "faint" });
// exhaust pipe out of the right-hand port, and the carburettor with its filter on the left
const PIPE_R = 7.5;
const PIPE = G.fillet([[46, 0, DECK + 33], [68, 0, DECK + 33], [96, 0, DECK + 2], [96, 0, 150], [158, 0, 118]], 20, 14, { P, tube: PIPE_R });
const pipeSvg = tubePieces(PIPE, PIPE_R, P, { maxLength: 400 }).map((part) => tubeSvg(part, { tone: "mid" })).join("");
const PIPE_END = PIPE[PIPE.length - 1];
const PIPE_DIR = G.unit3(G.sub3(PIPE_END, PIPE[PIPE.length - 2]));
const pipeLip = S(G.disc(-2, 0, PIPE_R + 1.2, along(PIPE_END, PIPE_DIR, Y, G.cross3(PIPE_DIR, Y)), P), { tone: "mid" }) + `<path class="et-cavity" d="${G.circleOf(along(PIPE_END, PIPE_DIR, Y, G.cross3(PIPE_DIR, Y)), 0, PIPE_R - 1.4, P, 28)}"/>`;
const pipeFlange = S(G.disc(0, 3, 12, along([46, 0, DECK + 33], X, Y, Z), P), { tone: "mid" }) + Dots([[49, -8, DECK + 33], [49, 8, DECK + 33]].map(at), { size: 1, tone: "mid" });
const INTAKE_F = along([-46, 0, DECK + 33], [-1, 0, 0], Y, Z);
const carbSvg =
  S(G.solidOf([[0, 9.4], [8, 9.4]], INTAKE_F, P), { tone: "lo" }) +
  S(G.solidOf([[8, 10], [32, 10]], INTAKE_F, P), { tone: "mid", inner: Ln(G.arcOf(INTAKE_F, 20, 10, P), { tone: "faint" }) }) +
  S(G.disc(0, 14, 7.5, along([-66, 0, DECK + 33 - 8], [0, 0, -1], X, Y), P), { tone: "hi" }) +
  S(G.disc(0, 10, 6, along([-66, 0, DECK + 33 + 8], Z, X, Y), P), { tone: "mid" }) +
  S(G.disc(10, 12, 7, along([-66, 0, DECK + 33 + 8], Z, X, Y), P), { tone: "hi" });
const pod = (s) => 17 - 3 * ((s - 34) / 34) ** 1.4;
const podSlope = (s) => (-3 * 1.4 * Math.max(0, (s - 34) / 34) ** 0.4) / 34;
const podSvg =
  S(G.solidOf([[32, 11.6], [37, 11.6]], INTAKE_F, P), { tone: "mid" }) +
  S(G.solidOf([[37, 0], ...Array.from({ length: 13 }, (_, i) => [37 + (31 * i) / 12, pod(37 + (31 * i) / 12)]), [68, 0]], INTAKE_F, P, { smooth: { slope: podSlope, rows: 4 } }), { tone: "hi" }) +
  Faded(G.ribsOf(INTAKE_F, 37, 68, 17, 56, P, { fade: [0.1, 0.55], r1: pod(68) }), { tone: "lo" }) +
  S(G.solidOf([[68, 15], [70.5, 15], [71, 13]], INTAKE_F, P), { tone: "mid" });
put("head", 14, headParts.join("") + headCut + pipeFlange + pipeSvg + pipeLip + carbSvg + podSvg);
put("head", 90, plugSvg, { name: "plug", front: true });

// ---------------------------------------------------------------- crank: the web (back half), its counterweight, the pin
const webSvg = S(G.disc(WEB.y0, WEB.y1, WEB.r, CRANK_F, P, { bevel: 0.6 }), { tone: "mid" }) + S(G.disc(-D_CASE + 6, WEB.y0, 12, CRANK_F, P), { tone: "mid" });
put("crank", 20, webSvg + `<path class="et-weight" data-live="weight" d="${counterweightPath(REST)}"/>` + Ln(G.circleOf(CRANK_F, WEB.y1, 13, P, 32), { tone: "faint" }), { name: "web" });
put("crank", 21, live(pinPaths(REST), "hi", "pin"), { name: "pin" });

// ---------------------------------------------------------------- connecting rod (rebuilt each frame)
const rod = rodPaths(REST);
put("rod", 30, live(rod.paths, "hi", "rod") + `<path class="iso-line" data-tone="lo" data-live="bearing" d="${rod.bearing}"/><path class="iso-line" data-tone="faint" data-live="cap" d="${rod.capLine}"/>`, { name: "rod" });

// ---------------------------------------------------------------- piston (moves along z)
const restCrown = crankAt(REST).crown;
// the piston is cut too: its back half, with the ring grooves and the pin bore in the section
const PISTON_R = R_BORE - 0.35;
const pinZ = restCrown - PIN_TO_CROWN;
const pistonHalf = [...arc(0, 0, PISTON_R, 0, -Math.PI, 48)];
const grooves = [PIN_TO_CROWN - 4.5, PIN_TO_CROWN - 7.5, PIN_TO_CROWN - 10.5];
const PISTON_INNER = [[-(PISTON_R - 4), pinZ - SKIRT], [-(PISTON_R - 4), pinZ + PIN_TO_CROWN - 8], [PISTON_R - 4, pinZ + PIN_TO_CROWN - 8], [PISTON_R - 4, pinZ - SKIRT]];
const pistonSvg =
  S(k.extrude(pistonHalf, pinZ - SKIRT, SKIRT + PIN_TO_CROWN, P, { convex: true, bevel: 0.6 }), {
    tone: "hi",
    inner: Ln(grooves.map((z) => k.pathOf(arc(0, 0, PISTON_R, 0, -Math.PI, 48).map(([x, y]) => at([x, y, pinZ + z])))).join(""), { tone: "lo" }),
  }) +
  `<path class="et-cavity" d="${poly(PISTON_INNER)}"/>` + Ln(poly(PISTON_INNER), { tone: "lo" }) +
  Ln(grooves.map((z) => poly([[-PISTON_R, pinZ + z - 0.6], [-PISTON_R + 2, pinZ + z - 0.6], [-PISTON_R + 2, pinZ + z + 0.6], [-PISTON_R, pinZ + z + 0.6]]) + poly([[PISTON_R, pinZ + z - 0.6], [PISTON_R - 2, pinZ + z - 0.6], [PISTON_R - 2, pinZ + z + 0.6], [PISTON_R, pinZ + z + 0.6]])).join(""), { tone: "lo" }) +
  S(G.disc(-PISTON_R + 4, 0, 7.4, along([0, 0, pinZ], Y, X, Z), P), { tone: "mid" });
put("piston", 25, pistonSvg, { name: "piston" });

// ---------------------------------------------------------------- valves (move along their stems) and springs
for (const id of ["intake", "exhaust"]) {
  const F = valveFrame(id);
  const r = VALVES[id].r;
  const ret = RETAINER_S(id);
  const valve =
    S(G.disc(2.4, ret + 6, 2.7, F, P), { tone: "hi" }) +
    S(G.solidOf([[-1.6, 0], [-1.6, r], [0.2, r], [1.4, r * 0.5], [2.6, 3.6], [2.6, 0]], F, P), { tone: "hi" }) +
    S(G.disc(ret, ret + 2.6, 9, F, P, { bevel: 0.3 }), { tone: "hi" }) +
    S(G.disc(ret + 2.6, ret + 4.4, 4.2, F, P), { tone: "mid" });
  const spring = springPaths(id, 0);
  put("valves", 79, `<path class="iso-line et-spring" data-tone="lo" data-live="spring-back-${id}" d="${spring.back}"/>`, { name: `spring-back-${id}`, front: true });
  put("valves", 80, valve, { name: `valve-${id}`, front: true });
  put("valves", 81, `<path class="iso-line et-spring" data-tone="mid" data-live="spring-front-${id}" d="${spring.front}"/>` + S(G.disc(springSeat(id) - 1.2, springSeat(id), 9.4, F, P), { tone: "mid" }), { name: `spring-front-${id}`, front: true });
}

items.sort((a, b) => a.key - b.key);

// ---------------------------------------------------------------- data for the live figure and the shader
const unit = (v) => {
  const o = at([0, 0, 0]);
  const p = at(v);
  return [p[0] - o[0], p[1] - o[1]];
};
const VIEW = G.viewOf(P);
const lifts = Object.fromEntries(Object.entries(LIFT).map(([id, dz]) => [id, dz]));
const DATA = {
  W,
  H,
  origin: at([0, 0, 0]),
  EX: unit(X),
  EY: unit(Y),
  EZ: unit(Z),
  V: VIEW,
  camera: glCamera(P),
  rest: REST,
  lifts,
  stagger: STAGGER,
  spring: SPRING,
  parts: PARTS,
  axes: { intake: valveFrame("intake").a, exhaust: valveFrame("exhaust").a },
  gas: {
    bore: R_BORE,
    deck: DECK,
    dome: DOME_H,
    inPort: [VALVES.intake.x - 2, VALVE_SEAT_Z + 3, -48, DECK + 33, 8.5],
    exPort: [VALVES.exhaust.x + 2, VALVE_SEAT_Z + 3, 48, DECK + 33, 8],
    plugTip: [0, 0, DECK + 6],
    pipeEnd: PIPE_END,
    pipeDir: PIPE_DIR,
    pipeR: PIPE_R,
    podMouth: G.pointOf(INTAKE_F, 70, 0, 0),
  },
  // the assembled engine's box, for the camera's zoom when it is together
  assembled: [at([-140, 110, -22]), at([170, -120, -22]), at([-130, 0, HEAD_TOP + 40]), at([160, 0, HEAD_TOP + 40]), at([170, 110, -22]), at([-170, -120, -22])],
};

const art = { W, H, back: back.join(""), items: items.map(({ piece, key, svg, name, front }) => ({ piece, key, svg, name: name ?? "", front: Boolean(front) })), data: DATA };
writeFileSync(join(HERE, "art.generated.json"), JSON.stringify(art));
console.log(`wrote art.generated.json · ${(JSON.stringify(art).length / 1024).toFixed(0)} KB · ${items.length} items`);
