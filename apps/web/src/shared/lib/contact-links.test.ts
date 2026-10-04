import { describe, expect, it } from 'vitest';

import { directionsPlace, formatPhoneMx, telUrl, whatsappUrl } from './contact-links';

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
    expect(url.search).toContain('%20');
    expect(url.search).not.toContain('+');
  });

  it('survives a lone surrogate (emoji split by maxLength)', () => {
    const url = new URL(whatsappUrl('525500000000', 'Hola \uD83D'));
    expect(url.searchParams.get('text')).toBe('Hola \uFFFD');
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

describe('directionsPlace', () => {
  it('labels the destination with the store name and address', () => {
    expect(
      directionsPlace({
        name: 'Mundo Motos',
        street: 'Av. Siempre Viva 1',
        locality: 'Pueblo',
        postalCode: '00000',
      }),
    ).toBe('Mundo Motos, Av. Siempre Viva 1, 00000 Pueblo');
  });
});
