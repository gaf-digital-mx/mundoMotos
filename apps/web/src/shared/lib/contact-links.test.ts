import { describe, expect, it } from 'vitest';

import { directionsUrl, formatPhoneMx, telUrl, whatsappUrl } from './contact-links';

describe('whatsappUrl', () => {
  it('links to the number without a message', () => {
    expect(whatsappUrl('525500000000')).toBe('https://wa.me/525500000000');
  });

  it('encodes accents, line breaks and symbols in the prefilled message', () => {
    const url = new URL(
      whatsappUrl('525500000000', '  Hola, ¿tienen balatas?\nMoto: Italika & Co.  '),
    );
    expect(url.origin + url.pathname).toBe('https://wa.me/525500000000');
    expect(url.searchParams.get('text')).toBe('Hola, ¿tienen balatas?\nMoto: Italika & Co.');
  });

  it('omits an empty message', () => {
    expect(whatsappUrl('525500000000', '   ')).toBe('https://wa.me/525500000000');
  });
});

describe('telUrl / formatPhoneMx', () => {
  it('builds an international tel: link', () => {
    expect(telUrl('525500000000')).toBe('tel:+525500000000');
  });

  it('formats a Mexican number for display', () => {
    expect(formatPhoneMx('525512345678')).toBe('55 1234 5678');
  });

  it('returns unexpected formats untouched', () => {
    expect(formatPhoneMx('12345')).toBe('12345');
  });
});

describe('directionsUrl', () => {
  it('points Google Maps directions at the store by name and address', () => {
    const url = new URL(
      directionsUrl({
        name: 'Mundo Motos',
        street: 'Av. Siempre Viva 1',
        locality: 'Pueblo',
        postalCode: '00000',
      }),
    );
    expect(url.hostname).toBe('www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe(
      'Mundo Motos, Av. Siempre Viva 1, 00000 Pueblo',
    );
  });
});
