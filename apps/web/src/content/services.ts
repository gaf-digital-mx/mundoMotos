/** Workshop services shown on the landing page. Copy lives in messages under `services.items.<id>`. */
export const SERVICE_IDS = [
  'tuneUp',
  'brakes',
  'tires',
  'valves',
  'accessories',
  'adjustments',
  'lighting',
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];
