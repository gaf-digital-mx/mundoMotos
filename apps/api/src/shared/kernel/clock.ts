/** Port: time is injected so rules like coupon expiry are deterministic in tests. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export const fixedClock = (at: Date): Clock => ({ now: () => new Date(at) });
