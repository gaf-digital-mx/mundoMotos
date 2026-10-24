// Parts that change shape as the crank turns: the connecting rod (it swings), the crank's
// counterweight and pin (they orbit) and the valve springs (they compress). Built with the kit
// from the crank angle, in the build for the rest pose and in the browser for every frame.
import * as k from "../../../../shared/iso/iso-kit.mjs";
import * as G from "../../../../shared/iso/lathe.mjs";
import { Z0, ROD, CRANK_R, crankAt } from "./model.mjs";
import { P, Y, valveFrame, springSeat, RETAINER_S } from "./view.mjs";

export const ROD_HALF = 5.5;
export const BIG_END = 17;
export const SMALL_END = 9.5;
export const WEB = { y0: -19, y1: -7.5, r: 44 };
export const PIN_R = 10.5;

const DEG = Math.PI / 180;

// the pin centre in world space at a crank angle
export function pinAt(deg) {
  const { pin } = crankAt(deg);
  return [pin[0], 0, Z0 + pin[1]];
}

export function rodPaths(deg) {
  const { pin, piston } = crankAt(deg);
  const big = [pin[0], 0, Z0 + pin[1]];
  const small = [0, 0, Z0 + piston];
  const u = G.unit3(G.sub3(small, big));
  const F = G.frameOf(big, Y, u, G.cross3(Y, u));
  const paths = G.prismOf(F, G.stadium(BIG_END, SMALL_END, ROD), -ROD_HALF, ROD_HALF, P);
  const face = G.frameOf(big, Y, u, G.cross3(Y, u));
  const bearing = G.circleOf(face, ROD_HALF, PIN_R + 1.4, P, 32);
  const capLine = k.pathOf([G.pointOf(face, ROD_HALF, BIG_END - 0.6, Math.PI / 2 + 0.02), G.pointOf(face, ROD_HALF, BIG_END - 0.6, -Math.PI / 2 - 0.02)].map((p) => k.iso(p, P)));
  const ribL = k.pathOf([G.add3(G.add3(big, G.mul3(u, BIG_END + 4)), [0, ROD_HALF, 0]), G.add3(G.add3(big, G.mul3(u, ROD - SMALL_END - 4)), [0, ROD_HALF, 0])].map((p) => k.iso(p, P)));
  return { paths, bearing, capLine, rib: ribL, big, small, u };
}

// the half-moon counterweight drawn on the web's face, opposite the pin
export function counterweightPath(deg) {
  const a = deg * DEG;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = Math.PI * 0.62 + (i / 24) * Math.PI * 0.76;
    const r = WEB.r - 4;
    pts.push([Math.sin(a + t) * r, Math.cos(a + t) * r]);
  }
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI * 1.38 - (i / 12) * Math.PI * 0.76;
    const r = 17;
    pts.push([Math.sin(a + t) * r, Math.cos(a + t) * r]);
  }
  return k.pathOf(pts.map(([x, z]) => k.iso([x, WEB.y1, Z0 + z], P)), true);
}

export function pinPaths(deg) {
  const c = pinAt(deg);
  const F = G.frameOf(c, Y, [1, 0, 0], [0, 0, 1]);
  return G.disc(WEB.y1, ROD_HALF + 1, PIN_R, F, P);
}

// a valve spring: a helix from the head top to the retainer, which follows the valve. Its
// back turns are drawn behind the stem and its front turns in front of it.
export function springPaths(id, lift) {
  const F = valveFrame(id);
  const s0 = springSeat(id);
  const s1 = RETAINER_S(id) - lift;
  const view = G.viewOf(P);
  const turns = 6.5;
  const steps = Math.round(turns * 28);
  const back = [];
  const front = [];
  let run = [];
  let side = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * Math.PI * 2;
    const p = k.iso(G.pointOf(F, s0 + (s1 - s0) * t, 7.4, ang), P);
    const facing = G.dot3(G.radialOf(F, ang), view) >= 0;
    if (side !== null && facing !== side) {
      run.push(p);
      (side ? front : back).push(run);
      run = [];
    }
    side = facing;
    run.push(p);
  }
  if (run.length > 1) (side ? front : back).push(run);
  return { back: back.map((r) => k.pathOf(r)).join(""), front: front.map((r) => k.pathOf(r)).join(""), s1 };
}
