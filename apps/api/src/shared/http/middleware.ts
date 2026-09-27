import { createMiddleware } from 'hono/factory';

import { getConfig } from '../../config';
import { systemClock } from '../kernel';
import { log } from './logger';

import type { AppEnv } from './types';

/** Resolves validated config and request-scoped dependencies. Must run first. */
export const context = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', getConfig(c.env));
  c.set('clock', systemClock);
  c.set('requestId', c.req.header('cf-ray') ?? crypto.randomUUID());
  await next();
});

/** Keeps non-production hosts out of search engines while SITE_INDEXABLE=false (ADR-0016). */
export const robotsGuard = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  if (!c.var.config.indexable) {
    c.res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
});

export const requestLog = createMiddleware<AppEnv>(async (c, next) => {
  const started = Date.now();
  await next();
  log('info', 'request', {
    requestId: c.var.requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - started,
  });
});
