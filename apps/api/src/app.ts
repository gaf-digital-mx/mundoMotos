import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

import { serveSite } from './edge/site';
import { clickRoutes } from './modules/clicks';
import { healthRoutes } from './modules/health';
import { log } from './shared/http/logger';
import { context, requestLog, robotsGuard } from './shared/http/middleware';
import { problem } from './shared/http/problem';

import type { AppEnv } from './shared/http/types';

/** Composition root: wires middleware, API modules and the static site (ADR-0003, ADR-0005). */
export const createApp = () => {
  const app = new Hono<AppEnv>();

  app.use('*', context, robotsGuard, secureHeaders({ crossOriginEmbedderPolicy: false }));

  const api = new Hono<AppEnv>();
  api.use('*', requestLog);
  api.route('/health', healthRoutes);
  api.route('/', clickRoutes);
  api.all('*', (c) => problem(c, { status: 404, code: 'not-found', title: 'Resource not found' }));
  app.route('/api', api);

  app.on(['GET', 'HEAD'], '*', serveSite);

  app.onError((error, c) => {
    log('error', 'unhandled error', {
      requestId: c.get('requestId'),
      path: c.req.path,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ type: 'about:blank', title: 'Internal Server Error', status: 500 }, 500, {
      'Content-Type': 'application/problem+json',
    });
  });

  return app;
};
