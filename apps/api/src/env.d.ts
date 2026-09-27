/**
 * Variables injected per environment at deploy time (`wrangler deploy --var`) and locally from
 * `.dev.vars`. Declared here, not in wrangler.jsonc, so a missing value fails validation instead
 * of silently falling back to a default (ADR-0016). Merged into the `Env` from `wrangler types`.
 */
interface Env {
  SITE_URL: string;
  SITE_INDEXABLE: string;
  BUSINESS_WHATSAPP_NUMBER: string;
  BUSINESS_PHONE_NUMBER?: string;
  BUSINESS_FACEBOOK_URL: string;
  APP_VERSION?: string;
}
