/**
 * Dependency-free particle field for the hero: particles spring toward their target (the logo
 * silhouette) and are pushed away from the pointer. Physics is pure and unit-tested; rendering
 * lives in the island. Kept small on purpose: it ships to the browser.
 */

export type Targets = { x: Float32Array; y: Float32Array; color: Uint8Array; count: number };

/** Decodes base64 [x, y, colorIndex] byte triples, evenly thinned to at most `limit` points. */
export const decodeTargets = (b64: string, limit = Number.POSITIVE_INFINITY): Targets => {
  const bin = atob(b64);
  const total = Math.floor(bin.length / 3);
  const count = Math.min(total, Math.max(0, Math.floor(limit)));
  const stride = total / Math.max(count, 1);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const color = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const j = Math.floor(i * stride) * 3;
    x[i] = bin.charCodeAt(j) / 255;
    y[i] = bin.charCodeAt(j + 1) / 255;
    color[i] = bin.charCodeAt(j + 2);
  }
  return { x, y, color, count };
};

export type Field = {
  count: number;
  px: Float32Array; // position
  py: Float32Array;
  vx: Float32Array; // velocity
  vy: Float32Array;
  hx: Float32Array; // home (target) in pixels
  hy: Float32Array;
  angle: Float32Array;
  spin: Float32Array;
  color: Uint8Array;
};

export type Box = { width: number; height: number };
export type Pointer = { x: number; y: number } | null;

const SPRING = 0.035;
const DAMPING = 0.86;
const REPEL_RADIUS = 70;
const REPEL_FORCE = 2.4;

/** Fits normalized targets into the box (centered, aspect preserved, small margin). */
export const layoutHomes = (field: Field, targets: Targets, box: Box): void => {
  const size = Math.min(box.width, box.height) * 0.92;
  const offsetX = (box.width - size) / 2;
  const offsetY = (box.height - size) / 2;
  for (let i = 0; i < field.count; i++) {
    field.hx[i] = offsetX + (targets.x[i] ?? 0) * size;
    field.hy[i] = offsetY + (targets.y[i] ?? 0) * size;
  }
};

/** Creates a field with particles scattered randomly (they assemble on the first frames). */
export const createField = (
  targets: Targets,
  box: Box,
  random: () => number = Math.random,
): Field => {
  const { count } = targets;
  const field: Field = {
    count,
    px: new Float32Array(count),
    py: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    hx: new Float32Array(count),
    hy: new Float32Array(count),
    angle: new Float32Array(count),
    spin: new Float32Array(count),
    color: targets.color,
  };
  layoutHomes(field, targets, box);
  for (let i = 0; i < count; i++) {
    field.px[i] = random() * box.width;
    field.py[i] = random() * box.height;
    field.angle[i] = random() * Math.PI * 2;
    field.spin[i] = (random() - 0.5) * 0.04;
  }
  return field;
};

/** Snaps every particle home (reduced motion: static figure). */
export const settle = (field: Field): void => {
  field.px.set(field.hx);
  field.py.set(field.hy);
  field.vx.fill(0);
  field.vy.fill(0);
};

/**
 * Advances the simulation by `dt` frames-at-60Hz (time-based, so 30/60/120 Hz displays move at
 * the same speed). Returns the kinetic energy so the caller can sleep once the figure settles.
 */
export const stepField = (field: Field, pointer: Pointer, dt = 1): number => {
  let energy = 0;
  const damping = DAMPING ** dt;
  for (let i = 0; i < field.count; i++) {
    const px = field.px[i] ?? 0;
    const py = field.py[i] ?? 0;
    let vx = ((field.vx[i] ?? 0) + ((field.hx[i] ?? 0) - px) * SPRING * dt) * damping;
    let vy = ((field.vy[i] ?? 0) + ((field.hy[i] ?? 0) - py) * SPRING * dt) * damping;

    if (pointer) {
      const dx = px - pointer.x;
      const dy = py - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < REPEL_RADIUS) {
        const push = ((REPEL_RADIUS - distance) / REPEL_RADIUS) * REPEL_FORCE * dt;
        vx += (dx / distance) * push;
        vy += (dy / distance) * push;
      }
    }

    field.vx[i] = vx;
    field.vy[i] = vy;
    field.px[i] = px + vx;
    field.py[i] = py + vy;
    field.angle[i] =
      (field.angle[i] ?? 0) + (field.spin[i] ?? 0) * (1 + Math.abs(vx) + Math.abs(vy));
    energy += vx * vx + vy * vy;
  }
  return energy;
};
