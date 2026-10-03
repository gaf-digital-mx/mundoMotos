/**
 * Featured products for the landing carousel, grouped by category. Copy lives in messages under
 * `featured.items.<id>` and `featured.categories.<category>`.
 * TODO(content): real product photos replace the category icons when the client provides them.
 */
export const FEATURED = [
  {
    category: 'lighting',
    items: ['h4Bulb', 'halfTurnBulb', 'brakeLights', 'turnSignals', 'auxLights', 'ledStrips'],
  },
  { category: 'accessories', items: ['grips', 'levers', 'sliders', 'spokeCovers'] },
  { category: 'protection', items: ['helmets', 'visors', 'goggles', 'gloves'] },
  { category: 'tires', items: ['tires'] },
  { category: 'tubes', items: ['tubes'] },
  { category: 'rims', items: ['rims'] },
  { category: 'brakePads', items: ['brakePads'] },
] as const;

export type FeaturedCategory = (typeof FEATURED)[number]['category'];
export type FeaturedItem = (typeof FEATURED)[number]['items'][number];

/** Flat list in display order. */
export const FEATURED_ITEMS = FEATURED.flatMap(({ category, items }) =>
  items.map((item) => ({ category, item })),
);
