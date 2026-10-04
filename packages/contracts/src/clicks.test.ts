import { describe, expect, it } from 'vitest';

import { goPath, goQuerySchema, trackPath, trackQuerySchema } from './clicks';

describe('goPath', () => {
  it('builds a tracked redirect with encoded copy', () => {
    const path = goPath('whatsapp', { src: 'hero', text: 'Hola, ¿tienen balatas?' });
    const url = new URL(path, 'https://example.test');
    expect(url.pathname).toBe('/api/go/whatsapp');
    expect(url.searchParams.get('src')).toBe('hero');
    expect(url.searchParams.get('text')).toBe('Hola, ¿tienen balatas?');
  });

  it('fails the build when copy exceeds the limits', () => {
    expect(() => goPath('whatsapp', { src: 'hero', text: 'x'.repeat(1001) })).toThrow(/limit/);
    expect(() => goPath('directions', { src: 'hero', to: 'x'.repeat(201) })).toThrow(/limit/);
  });

  it('omits empty params', () => {
    expect(goPath('facebook', { src: 'footer' })).toBe('/api/go/facebook?src=footer');
  });

  it('round-trips through the query schema', () => {
    const path = goPath('directions', { src: 'location', to: 'Mundo Motos, Tepetlixpa' });
    const query = Object.fromEntries(new URL(path, 'https://example.test').searchParams);
    expect(goQuerySchema.parse(query)).toEqual({
      src: 'location',
      to: 'Mundo Motos, Tepetlixpa',
    });
  });
});

describe('goQuerySchema', () => {
  it('records an unknown source instead of failing the redirect', () => {
    expect(goQuerySchema.parse({ src: 'old-section' }).src).toBe('unknown');
    expect(goQuerySchema.parse({}).src).toBe('unknown');
  });

  it('drops text that is blank or too long', () => {
    expect(goQuerySchema.parse({ src: 'hero', text: '   ' }).text).toBeUndefined();
    expect(goQuerySchema.parse({ src: 'hero', text: 'x'.repeat(1001) }).text).toBeUndefined();
  });
});

describe('trackQuerySchema', () => {
  it('is strict: reports without a valid target and source are rejected', () => {
    expect(trackQuerySchema.safeParse({ target: 'whatsapp', src: 'contact-form' }).success).toBe(
      true,
    );
    expect(trackQuerySchema.safeParse({ target: 'email', src: 'hero' }).success).toBe(false);
    expect(trackQuerySchema.safeParse({ target: 'phone' }).success).toBe(false);
  });

  it('matches trackPath', () => {
    const query = Object.fromEntries(
      new URL(trackPath('phone', 'footer'), 'https://example.test').searchParams,
    );
    expect(trackQuerySchema.parse(query)).toEqual({ target: 'phone', src: 'footer' });
  });
});
