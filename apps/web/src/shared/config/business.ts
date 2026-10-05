import 'server-only';

import { parseSiteConfig } from '@mundomotos/contracts';
import { z } from 'zod';

/**
 * The only place the web app reads environment variables (ADR-0016). Evaluated at build time
 * (static export), so an invalid value fails the build, never a visitor. Server-only: client
 * islands receive the values they need as props.
 */
export const siteConfig = parseSiteConfig(process.env);

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const daySchema = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

const businessSchema = z.object({
  name: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    locality: z.string().min(1),
    region: z.string().min(1),
    postalCode: z.string().regex(/^\d{5}$/),
    country: z.literal('MX'),
  }),
  geo: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  /** Public Google Maps profile of the business. */
  mapsUrl: z.url(),
  /** Google Maps place id (CID): the embed shows and links to the business listing, not a bare point. */
  mapsCid: z.string().regex(/^\d{1,20}$/),
  /** Days are schema.org day names; times are 24h local time (America/Mexico_City). */
  openingHours: z
    .array(
      z.object({
        id: z.enum(['weekdays', 'weekend']),
        days: z.array(daySchema).min(1),
        opens: timeSchema,
        closes: timeSchema,
      }),
    )
    .min(1),
  /** Towns served, used for local SEO (JSON-LD `areaServed`). */
  serviceArea: z.array(z.string().min(1)).min(1),
});

export type Business = z.infer<typeof businessSchema>;

/** Stable, public business facts (content-as-code, ADR-0006). Validated at build time. */
export const business: Business = businessSchema.parse({
  name: 'Mundo Motos',
  address: {
    street: 'Av. 20 de Noviembre 159',
    locality: 'Tepetlixpa',
    region: 'Estado de México',
    postalCode: '56880',
    country: 'MX',
  },
  geo: { latitude: 19.0253912, longitude: -98.8175927 },
  mapsUrl: 'https://maps.app.goo.gl/Vx3T3uqbo64gMqsB6',
  mapsCid: '9641817742291399204',
  openingHours: [
    {
      id: 'weekdays',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
    { id: 'weekend', days: ['Saturday', 'Sunday'], opens: '10:00', closes: '18:30' },
  ],
  serviceArea: [
    'Tepetlixpa',
    'San Esteban Cuecuecuautitla',
    'Nepantla',
    'Ozumba',
    'Cuijingo',
    'Tlacotitlan',
    'Tlalamac',
  ],
});
