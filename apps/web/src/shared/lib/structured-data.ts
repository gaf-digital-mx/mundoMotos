type Input = {
  siteUrl: string;
  name: string;
  description: string;
  phoneNumber: string;
  facebookUrl: string;
  logoUrl: string;
  imageUrl: string;
  address: {
    street: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
  };
  geo: { latitude: number; longitude: number };
  mapsUrl: string;
  openingHours: readonly { days: readonly string[]; opens: string; closes: string }[];
  serviceArea: readonly string[];
};

/**
 * schema.org JSON-LD for local SEO: the business is both a parts store and a repair shop.
 * Built only from validated config and business facts (single source of truth).
 */
export const localBusinessJsonLd = (input: Input) => ({
  '@context': 'https://schema.org',
  '@type': ['AutoPartsStore', 'AutoRepair'],
  '@id': `${input.siteUrl}/#business`,
  name: input.name,
  description: input.description,
  url: `${input.siteUrl}/`,
  logo: input.logoUrl,
  image: input.imageUrl,
  telephone: `+${input.phoneNumber}`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: input.address.street,
    addressLocality: input.address.locality,
    addressRegion: input.address.region,
    postalCode: input.address.postalCode,
    addressCountry: input.address.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: input.geo.latitude, longitude: input.geo.longitude },
  hasMap: input.mapsUrl,
  openingHoursSpecification: input.openingHours.map(({ days, opens, closes }) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: days.map((day) => `https://schema.org/${day}`),
    opens,
    closes,
  })),
  areaServed: input.serviceArea.map((name) => ({ '@type': 'City', name })),
  priceRange: '$',
  // Identity profiles only (the Maps link is already in hasMap).
  sameAs: [input.facebookUrl],
});

/** Serializes JSON-LD for a <script> tag, escaping `<` so content can't close the tag. */
export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');
