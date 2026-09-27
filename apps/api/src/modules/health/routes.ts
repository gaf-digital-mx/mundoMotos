import { Hono } from 'hono';

import type { AppEnv } from '../../shared/http/types';
import type { HealthResponse } from '@mundomotos/contracts';

export const healthRoutes = new Hono<AppEnv>().get('/', (c) => {
  const body: HealthResponse = {
    status: 'ok',
    version: c.var.config.version,
    time: c.var.clock.now().toISOString(),
  };
  return c.json(body, 200, { 'Cache-Control': 'no-store' });
});
