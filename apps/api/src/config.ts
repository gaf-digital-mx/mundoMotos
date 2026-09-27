import { parseSiteConfig, type SiteConfig } from '@mundomotos/contracts';

export type AppConfig = SiteConfig & { version: string };

const cache = new WeakMap<Env, AppConfig>();

/**
 * The only place the API reads environment variables (ADR-0016). Parsed once per isolate and
 * env object; invalid configuration throws, which surfaces as a 500 and fails the smoke tests.
 */
export const getConfig = (env: Env): AppConfig => {
  let config = cache.get(env);
  if (!config) {
    config = { ...parseSiteConfig({ ...env }), version: env.APP_VERSION ?? 'dev' };
    cache.set(env, config);
  }
  return config;
};
