import { z } from 'zod';

/** Digits only, country code included (E.164 without the leading `+`), e.g. `525500000000`. */
const phoneNumber = z
  .string()
  .regex(/^\d{10,15}$/, 'Expected digits only, including country code (E.164 without "+")');

/** GitHub Actions renders unset variables as empty strings: treat them as missing. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * Site identity and business contact data. Set once per environment (GitHub Environment
 * variables) and injected into both the web build and the Worker (ADR-0016).
 */
export const siteConfigSchema = z
  .object({
    SITE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
    SITE_INDEXABLE: booleanString,
    BUSINESS_WHATSAPP_NUMBER: phoneNumber,
    BUSINESS_PHONE_NUMBER: optional(phoneNumber),
    BUSINESS_FACEBOOK_URL: z.url(),
  })
  .transform((env) => ({
    siteUrl: env.SITE_URL,
    indexable: env.SITE_INDEXABLE,
    whatsappNumber: env.BUSINESS_WHATSAPP_NUMBER,
    phoneNumber: env.BUSINESS_PHONE_NUMBER ?? env.BUSINESS_WHATSAPP_NUMBER,
    facebookUrl: env.BUSINESS_FACEBOOK_URL,
  }));

export type SiteConfig = z.output<typeof siteConfigSchema>;

/** Parses raw env values, failing loudly with every invalid key listed. */
export const parseSiteConfig = (raw: Record<string, unknown>): SiteConfig => {
  const result = siteConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid site configuration: ${issues}`);
  }
  return result.data;
};
