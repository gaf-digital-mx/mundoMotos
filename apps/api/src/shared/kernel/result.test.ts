import { describe, expect, it } from 'vitest';

import { err, map, ok } from './result';

describe('Result', () => {
  it('maps the value of a success', () => {
    expect(map(ok(2), (n) => n * 21)).toEqual(ok(42));
  });

  it('leaves a failure untouched when mapping', () => {
    const failure = err('boom');
    expect(map(failure, (n: number) => n * 2)).toBe(failure);
  });
});
