import { describe, expect, it } from 'vitest';

import { destinationFor } from './destination';

const config = {
  whatsappNumber: '525500000000',
  facebookUrl: 'https://www.facebook.com/example',
};

describe('destinationFor', () => {
  it('sends WhatsApp clicks to the configured number with the prefilled text', () => {
    expect(destinationFor('whatsapp', { src: 'hero', text: 'Hola, ¿tienen?' }, config)).toBe(
      'https://wa.me/525500000000?text=Hola%2C%20%C2%BFtienen%3F',
    );
    expect(destinationFor('whatsapp', { src: 'hero' }, config)).toBe('https://wa.me/525500000000');
  });

  it('builds Google Maps directions to the given place, never another host', () => {
    const url = new URL(
      destinationFor('directions', { src: 'hero', to: 'https://evil.test' }, config) ?? '',
    );
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('destination')).toBe('https://evil.test');
  });

  it('cannot build directions without a place', () => {
    expect(destinationFor('directions', { src: 'hero' }, config)).toBeNull();
  });

  it('never throws on a lone surrogate', () => {
    expect(destinationFor('whatsapp', { src: 'hero', text: 'a\uD800' }, config)).toBe(
      'https://wa.me/525500000000?text=a%EF%BF%BD',
    );
  });

  it('uses the configured Facebook page', () => {
    expect(destinationFor('facebook', { src: 'footer' }, config)).toBe(
      'https://www.facebook.com/example',
    );
  });
});
