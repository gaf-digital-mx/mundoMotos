// Static geometry for the front-brake figure. `node build.mjs` writes art.generated.json;
// `node build.mjs --audit` proves it: clearances at rest, apart and in every replayed frame of
// the explode, supports, terminals and painter's order. Nothing is rebuilt at run time — the
// live figure only slides whole assemblies along the vector recorded with each item.
//
// Anything that wraps the disc is drawn as two items, one behind the plane of the disc and one
// in front of it, so every pair has a true order: a single item straddling it could only ever
// be both in front of and behind the pads.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AXLE, CALIPER, DISC, HUB, LIFT, PAD, PARTS, SPRING, STAGGER } from './model.mjs';
import * as A from '../../../../shared/iso/audit.mjs';
import * as k from '../../../../shared/iso/iso-kit.mjs';
import * as G from '../../../../shared/iso/lathe.mjs';
import { tubePieces, tubeSvg } from '../../../../shared/iso/tube.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAU = Math.PI * 2;
const rad = (deg) => (deg * Math.PI) / 180;

const W = 760;
const H = 900;
const PLATE = { x: -150, y: -112, w: 300, d: 208, r: 9 };
const COLUMN = { x: -30, y: -78, w: 60, d: 30, r: 5 };
const COLUMN_TOP = AXLE.z + 34;
const COLUMN_FACE = COLUMN.y + COLUMN.d; // -48
const BOSS = { back: -48, front: -32, r: 30 };
const ARM = { back: COLUMN_FACE, front: -40, rIn: 34, rOut: 78 };
const EARS = { back: ARM.front, front: -CALIPER.half, rIn: 70, rOut: 100 };
const BODY = { rIn: 84, rOut: 132 };
const BRIDGE = { rIn: 132, rOut: 150 };

const Y = [0, 1, 0];
const X = [1, 0, 0];
const Z = [0, 0, 1];
const CA = rad(90 - CALIPER.angle); // where the caliper sits round the disc, from +x

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, 0, 0),
    [0, 0, AXLE.z + DISC.r + 26],
    [DISC.r + 30, 0, AXLE.z - DISC.r],
    [-DISC.r - 16, 0, AXLE.z - DISC.r],
    [0, LIFT.disc, AXLE.z + DISC.r],
    [0, -LIFT.padInner, AXLE.z + 40],
    [0, LIFT.padOuter, AXLE.z + 40 - LIFT.padDrop],
    [
      Math.cos(CA) * (BRIDGE.rOut + LIFT.caliper),
      0,
      AXLE.z + Math.sin(CA) * (BRIDGE.rOut + LIFT.caliper),
    ],
  ],
  W,
  H,
  { pad: 24, azimuth: 54, elevation: 28 },
);
const at = (point) => k.iso(point, P);
const V3 = G.viewOf(P);
const AXLE_F = G.frameOf([0, 0, AXLE.z], Y, X, Z);
const RADIAL = [Math.cos(CA), 0, Math.sin(CA)];
const FACE = G.dot3(Y, V3) > 0 ? 1 : -1; // the side of the disc the viewer stands on
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

/** A sector of the disc's plane, as a polygon in the axle frame's own u, v coordinates. */
const sector = (rIn, rOut, from, to, steps = 18) => {
  const arc = (r, a0, a1) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / steps;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
  return [...arc(rOut, from, to), ...arc(rIn, to, from)];
};

/** A small circle lying in the disc's plane: one drilled hole, on the face that can be seen. */
const faceCircle = (s, radius, angle, r, steps = 16) =>
  k.pathOf(
    Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * TAU;
      const centre = G.pointOf(AXLE_F, s, radius, angle);
      return at(
        G.add3(
          centre,
          G.add3(G.mul3(AXLE_F.u, r * Math.cos(a)), G.mul3(AXLE_F.v, r * Math.sin(a))),
        ),
      );
    }),
    true,
  );

const CALIPER_MOVE = G.mul3(RADIAL, LIFT.caliper);
const DISC_MOVE = [0, FACE * LIFT.disc, 0];
// The pads come off the way they are changed: sideways off the disc. They travel different
// distances because on screen both the disc and the far pad run down to the left, and the near
// one up to the right behind the caliper: even travel would stack them.
const padMove = (side) =>
  side === -1 ? [0, -LIFT.padInner, 0] : [0, LIFT.padOuter, -LIFT.padDrop];
const MOVES = { caliper: CALIPER_MOVE, disc: DISC_MOVE };

const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const put = (piece, name, svg, shapes, { at: where, move, bias } = {}) => {
  const vector = move ?? MOVES[piece];
  R.put({
    piece,
    name,
    svg,
    shapes,
    ride: piece,
    at: where ?? [0, 0, AXLE.z],
    ...(vector ? { move: vector } : {}),
    ...(bias === undefined ? {} : { bias }),
  });
};

// ---------------------------------------------------------------- the bench
const halo = `<path class="iso-halo" d="${k.haloOf(PLATE, 0, 20, P)}"/>`;
const feet = k
  .corners(PLATE, 20)
  .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of feet) {
  put(
    'stand',
    'stand.foot',
    S(k.cylinder(x, y, 9, -20, 2, P, 28), { tone: 'lo' }) +
      S(k.cylinder(x, y, 6.6, -18, 8, P, 28), { tone: 'mid' }),
    [
      R.solid(A.cylinder(x, y, 9, -20, 2, { name: 'stand.foot', ground: true })),
      R.solid(A.cylinder(x, y, 6.6, -18, 8, { name: 'stand.foot.post', ground: true })),
    ],
    { at: [x, y, 0] },
  );
}

const SCREWS = k.corners(PLATE, 13);
const STRIP = { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 15, w: 196, d: 8, r: 1 };
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y, 0.8, [1.8, 3.3], P);
const TAG = { x: PLATE.x + PLATE.w - 86, y: PLATE.y + 15, w: 70, d: 14, r: 1.5 };
put(
  'stand',
  'stand.plate',
  S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), {
    tone: 'mid',
    inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: 'faint' }),
  }) +
    Ln(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: 'lo' }) +
    Ln(SCREWS.map(([x, y]) => k.ring(x, y, 2.8, 0, P, 18)).join(''), { tone: 'lo' }) +
    Dots(
      SCREWS.map(([x, y]) => at([x, y, 0])),
      { size: 0.55 },
    ) +
    S(k.slabOf(STRIP, 0, 0.8, P, 3), { tone: 'lo', crease: 'none' }) +
    Ln(TICKS.minor, { tone: 'lo' }) +
    Ln(TICKS.major, { tone: 'mid' }) +
    S(k.slabOf(TAG, 0, 1, P, 3), { tone: 'mid' }) +
    Ln(k.planOutline(k.insetPlan(TAG, 1.8), 1, P), { tone: 'faint' }) +
    k.faceTextSvg(k.topMatrix([TAG.x + 6, TAG.y + 9], 1, P, 'x'), 'DISCO 240', {
      size: 4.6,
      tone: 'lo',
    }),
  [
    R.solid(A.slab(PLATE, -10, 10, { name: 'stand.plate', ground: true })),
    R.solid(A.slab(STRIP, 0, 0.8, { name: 'stand.plate.strip', owner: 'stand.plate' })),
    R.solid(A.slab(TAG, 0, 1, { name: 'stand.plate.tag', owner: 'stand.plate' })),
  ],
  { at: [0, 0, 0] },
);

put(
  'stand',
  'stand.column',
  S(k.extrude(k.ringOf(COLUMN), 0, COLUMN_TOP, P, { bevel: 0.8 }), {
    tone: 'mid',
    inner: Ln(k.sideSeam(COLUMN, COLUMN_TOP - 30, P, 8), { tone: 'faint' }),
  }) +
    Ln(k.sideSeam(COLUMN, 28, P, 8), { tone: 'faint' }) +
    Ln(
      k.sideTicks(
        COLUMN.y + 4,
        COLUMN.y + COLUMN.d - 4,
        14,
        4,
        { x: COLUMN.x, axis: 'y' },
        COLUMN_TOP - 10,
        [2.4, 4.4],
        P,
      ).minor,
      { tone: 'lo' },
    ),
  [R.solid(A.extruded(k.ringOf(COLUMN), 0, COLUMN_TOP, { name: 'stand.column', ground: true }))],
  { at: [0, COLUMN.y + COLUMN.d / 2, COLUMN_TOP / 2] },
);

const bossProfile = [
  [BOSS.back, 0],
  [BOSS.back, BOSS.r],
  [BOSS.front - 3, BOSS.r],
  [BOSS.front, BOSS.r - 4],
  [BOSS.front, 0],
];
put(
  'stand',
  'stand.boss',
  S(G.solidOf(bossProfile, AXLE_F, P), { tone: 'mid' }) +
    Ln(G.circleOf(AXLE_F, BOSS.front, BOSS.r - 4, P, 40), { tone: 'faint' }) +
    Dots(
      Array.from({ length: 4 }, (_, i) =>
        at(G.pointOf(AXLE_F, BOSS.front - 4, BOSS.r - 2, rad(45 + i * 90))),
      ),
      { size: 0.6, tone: 'lo' },
    ),
  [R.solid(A.body(AXLE_F, bossProfile, { name: 'stand.boss', owner: 'stand.column' }))],
  { at: G.pointOf(AXLE_F, BOSS.front - 4, 0, 0) },
);

const ARM_PLAN = sector(ARM.rIn, ARM.rOut, CA - rad(18), CA + rad(18));
put(
  'stand',
  'stand.arm',
  S(G.prismOf(AXLE_F, ARM_PLAN, ARM.back, ARM.front, P), { tone: 'lo' }) +
    Dots(
      [CA - rad(14), CA + rad(14)].map((a) => at(G.pointOf(AXLE_F, ARM.front, 70, a))),
      { size: 1.1, tone: 'mid' },
    ),
  [
    R.solid(
      A.prism(AXLE_F, ARM_PLAN, ARM.back, ARM.front, {
        name: 'stand.arm',
        owner: 'stand.column',
      }),
    ),
  ],
  { at: G.pointOf(AXLE_F, ARM.front, (ARM.rIn + ARM.rOut) / 2, CA) },
);

const HUB_BACK = -9;
const HUB_FRONT = -DISC.half - 0.5; // the disc's carrier bolts onto this face
put(
  'stand',
  'stand.axle.back',
  S(G.disc(BOSS.front, HUB_BACK, AXLE.r, AXLE_F, P), { tone: 'hi' }),
  [
    R.solid(
      A.disc(AXLE_F, BOSS.front, HUB_BACK, AXLE.r, {
        name: 'stand.axle.back',
        owner: 'stand.column',
      }),
    ),
  ],
  { at: G.pointOf(AXLE_F, HUB_BACK, 0, 0) },
);
const axleProfile = [
  [HUB_FRONT, 0],
  [HUB_FRONT, AXLE.r],
  [16, AXLE.r],
  [18, AXLE.r - 1.6],
  [18, 0],
];
put(
  'stand',
  'stand.axle',
  S(G.solidOf(axleProfile, AXLE_F, P), { tone: 'hi' }) +
    S(G.disc(18, 24, 11, AXLE_F, P, { bevel: 0.5 }), { tone: 'mid' }) +
    Ln(G.circleOf(AXLE_F, 24, 6.4, P, 28), { tone: 'faint' }),
  [
    R.solid(A.body(AXLE_F, axleProfile, { name: 'stand.axle', owner: 'stand.axle.back' })),
    R.solid(A.disc(AXLE_F, 18, 24, 11, { name: 'stand.axle.nut', owner: 'stand.axle' })),
  ],
  { at: G.pointOf(AXLE_F, 20, 0, 0) },
);

put(
  'stand',
  'stand.hub',
  S(G.ringBand(HUB_BACK, HUB_FRONT, AXLE.r, HUB.r, AXLE_F, P, { bevel: 0.5 }), { tone: 'mid' }) +
    Ln(G.circleOf(AXLE_F, HUB_FRONT, HUB.boltAt + 7, P, 44), { tone: 'faint' }),
  [
    R.solid(
      A.ring(AXLE_F, HUB_BACK, HUB_FRONT, AXLE.r, HUB.r, {
        name: 'stand.hub',
        owner: 'stand.column',
      }),
    ),
  ],
  { at: G.pointOf(AXLE_F, HUB_FRONT, HUB.r / 2, CA) },
);

// ---------------------------------------------------------------- the disc
const DISC_S = DISC.half * FACE;
const holes = Array.from({ length: DISC.holes }, (_, i) =>
  faceCircle(DISC_S, DISC.holeAt, (i * TAU) / DISC.holes + rad(18), DISC.holeR),
).join('');
put(
  'disc',
  'disc.rotor',
  S(G.ringBand(-DISC.half, DISC.half, DISC.track, DISC.r, AXLE_F, P, { bevel: 0.4 }), {
    tone: 'hi',
    inner: Ln(G.circleOf(AXLE_F, DISC_S, DISC.track + 4, P, 64), { tone: 'faint' }),
  }) +
    S(G.ringBand(-DISC.half - 0.5, DISC.half + 0.5, DISC.carrier, DISC.track, AXLE_F, P), {
      tone: 'mid',
    }) +
    Ln(holes, { tone: 'lo' }) +
    Ln(G.circleOf(AXLE_F, DISC_S, DISC.r - 8, P, 64), { tone: 'faint' }) +
    Ln(G.circleOf(AXLE_F, DISC_S + 0.5, HUB.boltAt, P, 48), { tone: 'faint' }) +
    Ln(G.circleOf(AXLE_F, DISC_S, DISC.track + 10, P, 64), { tone: 'faint' }) +
    Array.from({ length: HUB.bolts }, (_, i) => {
      const angle = (i * TAU) / HUB.bolts + rad(30);
      const F = G.frameOf(G.pointOf(AXLE_F, DISC_S + 0.5, HUB.boltAt, angle), [0, FACE, 0], X, Z);
      return (
        S(
          G.solidOf(
            [
              [0, 0],
              [0, HUB.boltR + 1.4],
              [1.6, HUB.boltR + 1.4],
              [2.6, HUB.boltR],
              [4.2, HUB.boltR],
              [4.2, 0],
            ],
            F,
            P,
          ),
          { tone: 'hi', crease: 'none' },
        ) + Ln(G.circleOf(F, 4.2, HUB.boltR - 1.1, P, 16), { tone: 'lo' })
      );
    }).join(''),
  [
    R.solid(A.ring(AXLE_F, -DISC.half, DISC.half, DISC.track, DISC.r, { name: 'disc.rotor' })),
    R.solid(
      A.ring(AXLE_F, -DISC.half - 0.5, DISC.half + 0.5, DISC.carrier, DISC.track, {
        name: 'disc.carrier',
        owner: 'disc.rotor',
      }),
    ),
  ],
  { at: G.pointOf(AXLE_F, 0, DISC.r - 14, CA) },
);

// ---------------------------------------------------------------- the pads
const PAD_SECTOR = sector(PAD.rIn, PAD.rOut, CA - rad(PAD.span / 2), CA + rad(PAD.span / 2));
const EAR_SECTOR = sector(PAD.rOut, PAD.rOut + 5, CA - rad(3.5), CA + rad(3.5));
const PAD_FACE = DISC.half + PAD.gap;
const PAD_BACK = PAD_FACE + PAD.friction;
const PAD_PLATE = PAD_BACK + PAD.backing;
for (const side of [-1, 1]) {
  const inner = side === -1;
  const name = inner ? 'pads.inner' : 'pads.outer';
  const [f0, f1] = inner ? [-PAD_BACK, -PAD_FACE] : [PAD_FACE, PAD_BACK];
  const [p0, p1] = inner ? [-PAD_PLATE, -PAD_BACK] : [PAD_BACK, PAD_PLATE];
  put(
    'pads',
    name,
    S(G.prismOf(AXLE_F, PAD_SECTOR, f0, f1, P), { tone: 'lit', crease: 'none' }) +
      S(G.prismOf(AXLE_F, PAD_SECTOR, p0, p1, P), { tone: 'mid' }) +
      S(G.prismOf(AXLE_F, EAR_SECTOR, p0, p1, P), { tone: 'mid' }) +
      Ln(
        k.pathOf(
          [
            G.pointOf(AXLE_F, (f0 + f1) / 2, PAD.rOut, CA - rad(PAD.span / 2)),
            G.pointOf(AXLE_F, (f0 + f1) / 2, PAD.rOut, CA + rad(PAD.span / 2)),
          ].map(at),
        ),
        { tone: 'faint' },
      ),
    [
      R.solid(A.prism(AXLE_F, PAD_SECTOR, f0, f1, { name: `${name}.friction` })),
      R.solid(
        A.prism(AXLE_F, PAD_SECTOR, p0, p1, { name: `${name}.plate`, owner: `${name}.friction` }),
      ),
      R.solid(
        A.prism(AXLE_F, EAR_SECTOR, p0, p1, { name: `${name}.ear`, owner: `${name}.friction` }),
      ),
    ],
    {
      move: padMove(side),
      at: G.pointOf(AXLE_F, p1, (PAD.rIn + PAD.rOut) / 2, CA),
    },
  );
}

// ---------------------------------------------------------------- the caliper
const BODY_SECTOR = sector(BODY.rIn, BODY.rOut, CA - rad(12.5), CA + rad(12.5));
const BRIDGE_LEGS = [
  sector(BRIDGE.rIn, BRIDGE.rOut, CA - rad(12.5), CA - rad(6)),
  sector(BRIDGE.rIn, BRIDGE.rOut, CA + rad(6), CA + rad(12.5)),
];
const EAR_SECTORS = [
  sector(EARS.rIn, EARS.rOut, CA - rad(17), CA - rad(11.5)),
  sector(EARS.rIn, EARS.rOut, CA + rad(11.5), CA + rad(17)),
];
const NIPPLE_F = G.frameOf(
  G.pointOf(AXLE_F, -CALIPER.half + 9, BODY.rOut - 4, CA + rad(9)),
  RADIAL,
  Y,
  G.cross3(RADIAL, Y),
);
// On the back face, pointing away: a hose leaving radially would have to cross the bridge.
const BANJO_F = G.frameOf(G.pointOf(AXLE_F, -CALIPER.half, 104, CA - rad(3)), [0, -1, 0], X, Z);

const backBody = [];
const backShapes = [];
backBody.push(
  S(G.prismOf(AXLE_F, BODY_SECTOR, -CALIPER.half, -PAD_PLATE, P), {
    tone: 'hi',
    inner: Ln(
      k.pathOf(
        [
          G.pointOf(AXLE_F, -CALIPER.half / 2, BODY.rOut, CA - rad(12.5)),
          G.pointOf(AXLE_F, -CALIPER.half / 2, BODY.rOut, CA + rad(12.5)),
        ].map(at),
      ),
      { tone: 'faint' },
    ),
  }),
);
backShapes.push(A.prism(AXLE_F, BODY_SECTOR, -CALIPER.half, -PAD_PLATE, { name: 'caliper.inner' }));
for (const sign of [-1, 1]) {
  const F = G.frameOf(G.pointOf(AXLE_F, 0, 100, CA + sign * rad(5.5)), Y, X, Z);
  backBody.push(
    Ln(G.circleOf(F, -PAD_PLATE, CALIPER.piston, P, 36), { tone: 'lo' }) +
      Ln(G.circleOf(F, -PAD_PLATE, CALIPER.piston - 2.6, P, 36), { tone: 'faint' }),
  );
}
backBody.push(
  S(
    G.solidOf(
      [
        [4, 0],
        [4, 5],
        [12, 4.4],
        [12, 2.2],
        [17, 2.2],
        [17, 0],
      ],
      NIPPLE_F,
      P,
    ),
    { tone: 'mid' },
  ),
);
backShapes.push(A.disc(NIPPLE_F, 0, 17, 5, { name: 'caliper.nipple', owner: 'caliper.inner' }));
put(
  'caliper',
  'caliper.back',
  backBody.join(''),
  backShapes.map((shape) => R.solid(shape)),
  { at: G.pointOf(AXLE_F, -CALIPER.half, BODY.rOut - 10, CA) },
);

EAR_SECTORS.forEach((plan, i) => {
  const name = `caliper.ears${i ? '#2' : ''}`;
  put(
    'caliper',
    name,
    S(G.prismOf(AXLE_F, plan, EARS.back, EARS.front, P), { tone: 'lo' }),
    [R.solid(A.prism(AXLE_F, plan, EARS.back, EARS.front, { name, owner: 'caliper.inner' }))],
    {
      at: G.pointOf(AXLE_F, EARS.front, (EARS.rIn + EARS.rOut) / 2, CA + (i ? rad(14) : -rad(14))),
    },
  );
});

BRIDGE_LEGS.forEach((plan, i) => {
  for (const half of ['back', 'front']) {
    const s0 = half === 'back' ? -CALIPER.half : 0;
    const s1 = half === 'back' ? 0 : CALIPER.half;
    const name = `caliper.bridge.${half}${i ? '#2' : ''}`;
    put(
      'caliper',
      name,
      S(G.prismOf(AXLE_F, plan, s0, s1, P), { tone: 'mid' }),
      [R.solid(A.prism(AXLE_F, plan, s0, s1, { name, owner: 'caliper.inner' }))],
      {
        at: G.pointOf(AXLE_F, (s0 + s1) / 2, BRIDGE.rIn + 6, CA + (i ? rad(9) : -rad(9))),
      },
    );
  }
});

put(
  'caliper',
  'caliper.front',
  S(G.prismOf(AXLE_F, BODY_SECTOR, PAD_PLATE, CALIPER.half, P), {
    tone: 'hi',
    inner: Ln(
      k.pathOf(
        [
          G.pointOf(AXLE_F, CALIPER.half, BODY.rOut, CA - rad(12.5)),
          G.pointOf(AXLE_F, CALIPER.half, BODY.rOut, CA + rad(12.5)),
        ].map(at),
      ),
      { tone: 'faint' },
    ),
  }) +
    Dots(
      [CA - rad(10), CA + rad(10)].map((a) => at(G.pointOf(AXLE_F, CALIPER.half, 92, a))),
      { size: 1.1, tone: 'mid' },
    ),
  [
    R.solid(
      A.prism(AXLE_F, BODY_SECTOR, PAD_PLATE, CALIPER.half, {
        name: 'caliper.outer',
        owner: 'caliper.inner',
      }),
    ),
  ],
  { at: G.pointOf(AXLE_F, CALIPER.half, BODY.rOut - 10, CA) },
);

// the short hose from the banjo bolt down onto the caliper's own ear: both ends travel with it
const HOSE_R = 3.4;
const HOSE = G.fillet(
  [
    G.pointOf(BANJO_F, 0, 0, 0),
    G.pointOf(BANJO_F, 16, 0, 0),
    G.pointOf(AXLE_F, -46, 122, CA - rad(10)),
    G.pointOf(AXLE_F, -CALIPER.half + 0.06, 122, CA - rad(10)),
  ],
  12,
  9,
  { P, tube: HOSE_R },
);
// The banjo bolt covers the first stretch, so the hose is not drawn (or measured) there: it
// leaves the bolt's far face, which is the mount its end rim sits on.
const HOSE_GAPS = [[0, 19]];
const hoseShapes = R.route('caliper.hose', HOSE, HOSE_R, {
  piece: 'caliper',
  ride: 'caliper',
  move: CALIPER_MOVE,
  gaps: HOSE_GAPS,
  touch: ['caliper.inner', 'caliper.banjo'],
});
put(
  'caliper',
  'caliper.hose',
  S(G.disc(6, 13, 8.4, BANJO_F, P, { bevel: 0.5 }), { tone: 'hi' }) +
    S(G.disc(13, 19, 5, BANJO_F, P), { tone: 'mid' }) +
    tubePieces(HOSE, HOSE_R, P, { maxLength: 400, gaps: HOSE_GAPS })
      .map((part) => tubeSvg(part, { tone: 'mid' }))
      .join(''),
  [
    R.solid(A.disc(BANJO_F, 0, 19, 8.4, { name: 'caliper.banjo', owner: 'caliper.hose' })),
    ...hoseShapes,
  ],
  { at: HOSE[Math.floor(HOSE.length / 2)], bias: 0.4 },
);

// ---------------------------------------------------------------- order, audit, output
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P);

const origin = at([0, 0, 0]);
const screen = (move) => {
  if (!move) return [0, 0];
  const p = at(move);
  return [Math.round((p[0] - origin[0]) * 100) / 100, Math.round((p[1] - origin[1]) * 100) / 100];
};
const art = {
  W,
  H,
  halo,
  items: R.items.map((item) => ({
    piece: item.piece,
    name: item.name ?? '',
    svg: item.svg,
    move: screen(item.move),
  })),
  data: { parts: PARTS, stagger: STAGGER, spring: SPRING },
};
writeFileSync(join(HERE, 'art.generated.json'), JSON.stringify(art));
console.log(
  `wrote art.generated.json · ${(JSON.stringify(art).length / 1024).toFixed(0)} KB · ${R.items.length} items`,
);
