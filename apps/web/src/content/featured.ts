import accessoriesSmall from '@/assets/featured/generated/accessories-480.webp';
import accessoriesLarge from '@/assets/featured/generated/accessories-960.webp';
import brakePadsSmall from '@/assets/featured/generated/brake-pads-480.webp';
import brakePadsLarge from '@/assets/featured/generated/brake-pads-960.webp';
import lightingSmall from '@/assets/featured/generated/lighting-480.webp';
import lightingLarge from '@/assets/featured/generated/lighting-960.webp';
import protectionSmall from '@/assets/featured/generated/protection-480.webp';
import protectionLarge from '@/assets/featured/generated/protection-960.webp';
import rimsSmall from '@/assets/featured/generated/rims-480.webp';
import rimsLarge from '@/assets/featured/generated/rims-960.webp';
import tiresSmall from '@/assets/featured/generated/tires-480.webp';
import tiresLarge from '@/assets/featured/generated/tires-960.webp';
import tubesSmall from '@/assets/featured/generated/tubes-480.webp';
import tubesLarge from '@/assets/featured/generated/tubes-960.webp';

import type { StaticImageData } from 'next/image';

/**
 * Featured products, grouped into the category cards on the landing page. Copy lives in messages
 * under `featured.items.<id>` and `featured.categories.<category>`; the photos are decorative,
 * since the category name sits on top of each one. Lighting leads: it has the most items, and its
 * card spans both columns.
 */
export const FEATURED = [
  {
    category: 'lighting',
    photo: { small: lightingSmall, large: lightingLarge },
    items: ['h4Bulb', 'halfTurnBulb', 'brakeLights', 'turnSignals', 'auxLights', 'ledStrips'],
  },
  {
    category: 'accessories',
    photo: { small: accessoriesSmall, large: accessoriesLarge },
    items: ['grips', 'levers', 'sliders', 'spokeCovers'],
  },
  {
    category: 'protection',
    photo: { small: protectionSmall, large: protectionLarge },
    items: ['helmets', 'visors', 'goggles', 'gloves'],
  },
  { category: 'tires', photo: { small: tiresSmall, large: tiresLarge }, items: ['tires'] },
  { category: 'tubes', photo: { small: tubesSmall, large: tubesLarge }, items: ['tubes'] },
  { category: 'rims', photo: { small: rimsSmall, large: rimsLarge }, items: ['rims'] },
  {
    category: 'brakePads',
    photo: { small: brakePadsSmall, large: brakePadsLarge },
    items: ['brakePads'],
  },
] as const satisfies readonly {
  category: string;
  photo: { small: StaticImageData; large: StaticImageData };
  items: readonly string[];
}[];

export type FeaturedCategory = (typeof FEATURED)[number]['category'];
export type FeaturedItem = (typeof FEATURED)[number]['items'][number];
