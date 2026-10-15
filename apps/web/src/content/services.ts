import adjustmentsSmall from '@/assets/services/generated/adjustments-320.webp';
import adjustmentsLarge from '@/assets/services/generated/adjustments-512.webp';
import brakesSmall from '@/assets/services/generated/brakes-320.webp';
import brakesLarge from '@/assets/services/generated/brakes-512.webp';
import lightingSmall from '@/assets/services/generated/lighting-320.webp';
import lightingLarge from '@/assets/services/generated/lighting-512.webp';
import tiresSmall from '@/assets/services/generated/tires-320.webp';
import tiresLarge from '@/assets/services/generated/tires-512.webp';
import tuneUpSmall from '@/assets/services/generated/tune-up-320.webp';
import tuneUpLarge from '@/assets/services/generated/tune-up-512.webp';
import valvesSmall from '@/assets/services/generated/valves-320.webp';
import valvesLarge from '@/assets/services/generated/valves-512.webp';

import type { StaticImageData } from 'next/image';

/**
 * Workshop services shown on the landing page, in display order. Copy lives in messages under
 * `services.items.<id>`; the photos are decorative (the name sits right below them).
 */
export const SERVICES = [
  { id: 'tuneUp', small: tuneUpSmall, large: tuneUpLarge },
  { id: 'brakes', small: brakesSmall, large: brakesLarge },
  { id: 'tires', small: tiresSmall, large: tiresLarge },
  { id: 'valves', small: valvesSmall, large: valvesLarge },
  { id: 'lighting', small: lightingSmall, large: lightingLarge },
  { id: 'adjustments', small: adjustmentsSmall, large: adjustmentsLarge },
] as const satisfies readonly { id: string; small: StaticImageData; large: StaticImageData }[];

export type ServiceId = (typeof SERVICES)[number]['id'];
