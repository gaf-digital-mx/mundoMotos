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
 * One line of a service's detail table. `id` keys the label under
 * `services.items.<service>.detail.items.<id>`; `scooter` is whether a scooter gets that work,
 * which is the one thing the table says that the labels don't (a scooter has no exposed chain).
 */
type ServiceWork = { id: string; scooter: boolean };

type Service = {
  id: string;
  small: StaticImageData;
  large: StaticImageData;
  /** Services whose dialog has a detail table. Without it the dialog shows the body alone. */
  works?: readonly ServiceWork[];
};

export const TUNE_UP_WORKS = [
  { id: 'oil', scooter: true },
  { id: 'plug', scooter: true },
  { id: 'airFilter', scooter: true },
  { id: 'carburetor', scooter: true },
  { id: 'chain', scooter: false },
  { id: 'cables', scooter: true },
  { id: 'brakes', scooter: true },
  { id: 'wash', scooter: true },
] as const satisfies readonly ServiceWork[];

/**
 * Workshop services shown on the landing page, in display order. Copy lives in messages under
 * `services.items.<id>`; the photos are decorative (the name sits right below them).
 */
export const SERVICES = [
  { id: 'tuneUp', small: tuneUpSmall, large: tuneUpLarge, works: TUNE_UP_WORKS },
  { id: 'brakes', small: brakesSmall, large: brakesLarge },
  { id: 'tires', small: tiresSmall, large: tiresLarge },
  { id: 'valves', small: valvesSmall, large: valvesLarge },
  { id: 'lighting', small: lightingSmall, large: lightingLarge },
  { id: 'adjustments', small: adjustmentsSmall, large: adjustmentsLarge },
] as const satisfies readonly Service[];

export type ServiceId = (typeof SERVICES)[number]['id'];
