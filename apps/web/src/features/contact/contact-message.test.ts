import { describe, expect, it } from 'vitest';

import { buildContactMessage, LIMITS, validateContact } from './contact-message';

describe('validateContact', () => {
  it('accepts a valid inquiry', () => {
    expect(validateContact({ name: 'Ana', query: '¿Tienen balatas?' })).toEqual({});
  });

  it('requires both fields, ignoring surrounding whitespace', () => {
    expect(validateContact({ name: '   ', query: '  hi ' })).toEqual({
      name: 'required',
      query: 'required',
    });
  });

  it('rejects overly long values', () => {
    expect(
      validateContact({
        name: 'a'.repeat(LIMITS.name.max + 1),
        query: 'b'.repeat(LIMITS.query.max + 1),
      }),
    ).toEqual({ name: 'tooLong', query: 'tooLong' });
  });
});

describe('buildContactMessage', () => {
  it('fills the template with a normalized name and trimmed query', () => {
    expect(
      buildContactMessage('Hola. Soy {name}. {query}', {
        name: '  Ana   María ',
        query: ' ¿Tienen\nbalatas? ',
      }),
    ).toBe('Hola. Soy Ana María. ¿Tienen\nbalatas?');
  });

  it('does not interpret replacement patterns typed by the visitor', () => {
    expect(buildContactMessage('{name}: {query}', { name: 'Ana', query: 'precio $& $1' })).toBe(
      'Ana: precio $& $1',
    );
  });
});
