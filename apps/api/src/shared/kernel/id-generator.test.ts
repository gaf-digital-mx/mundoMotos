import { describe, expect, it } from 'vitest';

import { cryptoIdGenerator } from './id-generator';

describe('cryptoIdGenerator', () => {
  it('generates unique RFC 4122 v4 identifiers', () => {
    const ids = Array.from({ length: 100 }, () => cryptoIdGenerator.next());

    expect(new Set(ids).size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
