import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { makeDeduper, normalizeReports } from './normalize';
import { log } from '../../shared/http/logger';

import type { AppEnv } from '../../shared/http/types';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_LOGGED_PER_REQUEST = 3;
const REPORT_TYPES = /^application\/(csp-report|reports\+json|json)\b/i;
const firstSeen = makeDeduper(10 * 60_000, 500, () => Date.now());

/**
 * Collects Content-Security-Policy violation reports into Workers Logs, to tune the policy before
 * it is enforced. Always answers 204: browsers don't retry, and senders learn nothing. Bounded on
 * every axis (body size, violations per request, duplicates per isolate) so it can't flood logs.
 */
export const cspReportRoutes = new Hono<AppEnv>().post(
  '/',
  bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.body(null, 204) }),
  async (c) => {
    if (!REPORT_TYPES.test(c.req.header('content-type') ?? '')) return c.body(null, 204);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.body(null, 204);
    }
    const fresh = normalizeReports(payload)
      .filter((v) => firstSeen(`${v.directive}|${v.blocked}|${v.document}`))
      .slice(0, MAX_LOGGED_PER_REQUEST);
    for (const violation of fresh) {
      log('warn', 'csp violation', { requestId: c.var.requestId, ...violation });
    }
    return c.body(null, 204);
  },
);
