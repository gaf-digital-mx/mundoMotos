import { describe, expect, it } from 'vitest';

import es from './messages/es.json';

const flatten = (node: unknown, prefix = ''): [string, unknown][] =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        flatten(value, prefix ? `${prefix}.${key}` : key),
      )
    : [[prefix, node]];

describe('es message catalog', () => {
  it.each(flatten(es))('%s is a non-empty string', (_key, value) => {
    expect(typeof value).toBe('string');
    expect((value as string).trim()).not.toBe('');
  });

  it('keeps the brand name consistent', () => {
    expect(es.metadata.title).toContain('Mundo Motos');
  });
});
