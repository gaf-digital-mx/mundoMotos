/**
 * Pure helpers for the "disintegrate the wordmark into the logo" sequence. Unit-tested; the
 * island only wires them to the DOM and canvas.
 */

/** Gradient color slot (0 red … 4 gold) for a horizontal position 0–1 across the wordmark. */
export const gradientSlot = (fraction: number): number =>
  Math.min(4, Math.max(0, Math.floor(fraction * 5)));

/**
 * Pairs wordmark points with logo particles so colors travel coherently: logo particles sorted by
 * color slot (red → gold → chrome) start from wordmark points sorted left → right (red → gold).
 * Returns, for each logo particle, the index of its starting wordmark point.
 */
export const pairStartPoints = (logoColors: Uint8Array, wordmarkX: Float32Array): Uint32Array => {
  const count = logoColors.length;
  const byColor = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => (logoColors[a] ?? 0) - (logoColors[b] ?? 0),
  );
  const byX = Array.from({ length: wordmarkX.length }, (_, i) => i).sort(
    (a, b) => (wordmarkX[a] ?? 0) - (wordmarkX[b] ?? 0),
  );
  const pairs = new Uint32Array(count);
  byColor.forEach((particle, rank) => {
    const point = byX[Math.floor((rank / count) * byX.length)] ?? 0;
    pairs[particle] = point;
  });
  return pairs;
};

/** Particle shapes: 0 = outlined triangle, 1 = motorcycle icon, 2 = helmet icon. */
export const assignShapes = (
  count: number,
  iconShare: number,
  random: () => number = Math.random,
) => {
  const shapes = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    if (random() < iconShare) shapes[i] = random() < 0.5 ? 1 : 2;
  }
  return shapes;
};

/** 24×24 filled icon paths (even-odd), drawn once into sprites. */
export const ICON_PATHS: Record<1 | 2, string> = {
  1: 'M5 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM19 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM6.5 14l3-5h5.5l2-3h3.5l-1.2 2.2h-1.5l-1.6 2.6 3 3.8h-2.4l-1.9-2.6h-3.4l-2.2 3.6h-1.8Z',
  2: 'M2 17.5C2 10.6 6.5 5 12.5 5S22 9.6 22 14.5V19H2v-1.5Zm10.5-8.6c-3.2 0-5.8 2.1-6.6 5.1H16a2 2 0 0 0 2-2v-1.4c-1.4-1.1-3.4-1.7-5.5-1.7Z',
};
