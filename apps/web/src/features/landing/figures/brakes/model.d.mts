/** Hand-written to match model.mjs: this project runs TypeScript with `allowJs: false`. */

export declare const DISC: {
  r: number;
  track: number;
  carrier: number;
  half: number;
  holes: number;
  holeAt: number;
  holeR: number;
};

export declare const HUB: { r: number; half: number; bolts: number; boltAt: number; boltR: number };

export declare const PAD: {
  rIn: number;
  rOut: number;
  span: number;
  friction: number;
  backing: number;
  gap: number;
};

export declare const CALIPER: { angle: number; piston: number; pistons: number; half: number };

export declare const AXLE: { z: number; r: number };

export declare const LIFT: { caliper: number; padsOut: number; padsSide: number; disc: number };

export declare const STAGGER: readonly string[];

export declare const SPRING: {
  stagger: number;
  stiffness: number;
  damping: number;
  substeps: number;
};

export declare const PARTS: readonly { id: string; name: string; note: string }[];

export declare const READOUT: { rest: string; apart: string };
