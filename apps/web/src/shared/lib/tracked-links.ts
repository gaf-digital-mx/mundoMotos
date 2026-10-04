import 'server-only';

import { goPath, trackPath, type ClickSource } from '@mundomotos/contracts';

import { business } from '@/shared/config/business';

import { directionsPlace } from './contact-links';

/**
 * CTA hrefs through the Worker's tracked redirect (ADR-0013): it counts the click anonymously and
 * sends the visitor on to WhatsApp, Google Maps or Facebook. Server-only, so the contracts
 * package (and Zod) never reaches client bundles; islands receive ready-made strings.
 */
export const whatsappHref = (src: ClickSource, message: string): string =>
  goPath('whatsapp', { src, text: message });

export const directionsHref = (src: ClickSource): string =>
  goPath('directions', { src, to: directionsPlace({ name: business.name, ...business.address }) });

export const facebookHref = (src: ClickSource): string => goPath('facebook', { src });

/** For links that must not depend on a redirect (`<a ping>`, `sendBeacon`). */
export { trackPath };

/** Tracked links are counted, not followed: crawlers shouldn't spend requests on them. */
export const TRACKED_REL = 'nofollow noopener noreferrer';
