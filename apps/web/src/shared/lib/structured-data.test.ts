import { describe, expect, it } from 'vitest';

import { localBusinessJsonLd, serializeJsonLd } from './structured-data';

const input = {
  siteUrl: 'https://example.test',
  name: 'Mundo Motos',
  description: 'Refaccionaria y taller',
  phoneNumber: '525500000000',
  facebookUrl: 'https://www.facebook.com/example',
  logoUrl: 'https://example.test/logo.webp',
  imageUrl: 'https://example.test/fachada.webp',
  address: {
    street: 'Calle 1',
    locality: 'Pueblo',
    region: 'Estado de México',
    postalCode: '00000',
    country: 'MX',
  },
  geo: { latitude: 19.02, longitude: -98.81 },
  mapsUrl: 'https://maps.example/x',
  openingHours: [{ days: ['Monday', 'Tuesday'], opens: '09:00', closes: '19:00' }],
  serviceArea: ['Pueblo', 'Vecino'],
};

describe('localBusinessJsonLd', () => {
  const data = localBusinessJsonLd(input);

  it('describes a parts store that is also a repair shop', () => {
    expect(data['@type']).toEqual(['AutoPartsStore', 'AutoRepair']);
  });

  it('uses an international phone number and full postal address', () => {
    expect(data.telephone).toBe('+525500000000');
    expect(data.address).toMatchObject({
      addressLocality: 'Pueblo',
      postalCode: '00000',
      addressCountry: 'MX',
    });
  });

  it('maps opening hours to schema.org day URIs', () => {
    expect(data.openingHoursSpecification[0]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['https://schema.org/Monday', 'https://schema.org/Tuesday'],
      opens: '09:00',
      closes: '19:00',
    });
  });

  it('lists served towns and profiles', () => {
    expect(data.areaServed).toEqual([
      { '@type': 'City', name: 'Pueblo' },
      { '@type': 'City', name: 'Vecino' },
    ]);
    expect(data.sameAs).toEqual(['https://www.facebook.com/example', 'https://maps.example/x']);
  });
});

describe('serializeJsonLd', () => {
  it('cannot be used to close the script tag', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
