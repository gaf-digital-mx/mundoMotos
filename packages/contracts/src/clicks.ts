import { z } from 'zod';

/**
 * Cookie-less click events (ADR-0013). CTAs link to `/api/go/:target?src=<section>`; the Worker
 * records the event and redirects. The destination host always comes from the Worker's config
 * (WhatsApp number, Google Maps, Facebook page), so it is not an open redirect; the prefilled
 * text and the directions place come from the query (accepted risk: a crafted link can only
 * open a chat with the business or directions to some place). Links that must not depend on a
 * redirect (`tel:`, and the contact form, whose message may hold personal data) report through
 * `/api/track` instead, with no message content.
 */
export const CLICK_TARGETS = ['whatsapp', 'directions', 'phone', 'facebook'] as const;
export const clickTargetSchema = z.enum(CLICK_TARGETS);
export type ClickTarget = z.infer<typeof clickTargetSchema>;

/** Targets reachable through the redirect (`tel:` is reported with `<a ping>` instead). */
export const GO_TARGETS = ['whatsapp', 'directions', 'facebook'] as const;
export const goTargetSchema = z.enum(GO_TARGETS);
export type GoTarget = z.infer<typeof goTargetSchema>;

/** Page section the click came from. */
export const CLICK_SOURCES = [
  'header',
  'hero',
  'services',
  'featured',
  'location',
  'contact-form',
  'final-cta',
  'floating',
  'footer',
] as const;
export const clickSourceSchema = z.enum(CLICK_SOURCES);
export type ClickSource = z.infer<typeof clickSourceSchema>;

/** Prefilled WhatsApp text and directions destination come from site copy, never from visitors. */
export const MAX_TEXT_LENGTH = 1000;
export const MAX_DESTINATION_LENGTH = 200;

/**
 * Query of `GET /api/go/:target`. Lenient on purpose: a CTA on a stale cached page must still
 * reach its destination, so an unknown source is recorded as `unknown` and an invalid text is
 * dropped instead of failing the redirect.
 */
export const goQuerySchema = z.object({
  src: clickSourceSchema.or(z.literal('unknown')).catch('unknown'),
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH).optional().catch(undefined),
  to: z.string().trim().min(1).max(MAX_DESTINATION_LENGTH).optional().catch(undefined),
});
export type GoQuery = z.infer<typeof goQuerySchema>;

/** Query of `POST /api/track` (`navigator.sendBeacon` or `<a ping>`; the body is ignored). */
export const trackQuerySchema = z.object({ target: clickTargetSchema, src: clickSourceSchema });
export type TrackQuery = z.infer<typeof trackQuerySchema>;

type GoParams = { src: ClickSource; text?: string; to?: string };

/**
 * Path of a tracked redirect, e.g. `/api/go/whatsapp?src=hero&text=Hola`. Called at build time:
 * copy over the limits throws (failing the build) instead of a CTA silently losing its message.
 */
export const goPath = (target: GoTarget, { src, text, to }: GoParams): string => {
  if ((text?.length ?? 0) > MAX_TEXT_LENGTH || (to?.length ?? 0) > MAX_DESTINATION_LENGTH) {
    throw new Error(`goPath(${target}, ${src}): text or destination exceeds its length limit`);
  }
  const params = new URLSearchParams({ src });
  if (text) params.set('text', text);
  if (to) params.set('to', to);
  return `/api/go/${target}?${params.toString()}`;
};

/** Path of a click report without redirect (beacon / ping). */
export const trackPath = (target: ClickTarget, src: ClickSource): string =>
  `/api/track?${new URLSearchParams({ target, src }).toString()}`;
