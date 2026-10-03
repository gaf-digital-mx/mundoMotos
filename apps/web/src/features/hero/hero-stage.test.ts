import { describe, expect, it } from 'vitest';

import { SEQUENCE_MS } from './hero-stage';

describe('hero sequence timing', () => {
  it('keeps auto-playing motion under 5 seconds (WCAG 2.2.2, no pause control needed)', () => {
    expect(SEQUENCE_MS).toBeLessThan(5000);
  });
});
