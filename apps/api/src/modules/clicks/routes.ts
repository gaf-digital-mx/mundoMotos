import { goQuerySchema, goTargetSchema, trackQuerySchema } from '@mundomotos/contracts';
import { Hono } from 'hono';

import { destinationFor } from './destination';
import { analyticsEngineRecorder, isAutomated, type ClickEvent } from './recorder';
import { resolveLocale } from '../../edge/locale-routing';
import { problem } from '../../shared/http/problem';

import type { AppEnv } from '../../shared/http/types';
import type { Context } from 'hono';

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

const record = (c: Context<AppEnv>, event: Pick<ClickEvent, 'target' | 'source'>) => {
  const automated = isAutomated({
    userAgent: c.req.header('user-agent'),
    purpose: c.req.header('sec-purpose') ?? c.req.header('purpose'),
  });
  if (automated || c.req.method === 'HEAD') return;
  const cf = c.req.raw.cf as { country?: unknown } | undefined;
  analyticsEngineRecorder(c.env.CLICKS).record({
    ...event,
    locale: resolveLocale(c.req.header('cookie')),
    country: typeof cf?.country === 'string' ? cf.country : 'XX',
  });
};

/** Tracked CTA redirects and redirect-less click reports (ADR-0013). */
export const clickRoutes = new Hono<AppEnv>()
  .get('/go/:target', (c) => {
    const target = goTargetSchema.safeParse(c.req.param('target'));
    if (!target.success) {
      return problem(c, { status: 404, code: 'not-found', title: 'Resource not found' });
    }
    const query = goQuerySchema.parse(c.req.query());
    const destination = destinationFor(target.data, query, c.var.config);
    if (!destination) {
      return problem(c, {
        status: 400,
        code: 'invalid-destination',
        title: 'Missing destination',
        detail: 'Directions need a `to` place.',
      });
    }
    // Count only top-level navigations: an <img> or fetch() embedding the URL elsewhere isn't a click.
    const mode = c.req.header('sec-fetch-mode');
    const dest = c.req.header('sec-fetch-dest');
    if (
      (mode === undefined || mode === 'navigate') &&
      (dest === undefined || dest === 'document')
    ) {
      record(c, { target: target.data, source: query.src });
    }
    return c.body(null, 302, {
      ...NO_STORE,
      Location: destination,
      // The destination doesn't need to know which page the visitor came from.
      'Referrer-Policy': 'no-referrer',
    });
  })
  .post('/track', (c) => {
    // sendBeacon and <a ping> send their own bodies; only the query is read.
    const query = trackQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return problem(c, { status: 400, code: 'invalid-click', title: 'Invalid click report' });
    }
    // Only count reports sent by our own pages (browsers set this header on beacons and pings).
    const site = c.req.header('sec-fetch-site');
    if (site === undefined || site === 'same-origin') {
      record(c, { target: query.data.target, source: query.data.src });
    }
    return c.body(null, 204, NO_STORE);
  });
