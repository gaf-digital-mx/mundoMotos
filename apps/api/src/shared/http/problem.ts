import type { AppEnv } from './types';
import type { ProblemDetails } from '@mundomotos/contracts';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type ProblemInput = {
  status: ContentfulStatusCode;
  /** Stable slug; becomes `${SITE_URL}/problems/${code}`. */
  code: string;
  title: string;
  detail?: string;
};

/** Responds with RFC 9457 problem details. */
export const problem = (c: Context<AppEnv>, input: ProblemInput): Response => {
  const body: ProblemDetails = {
    type: `${c.var.config.siteUrl}/problems/${input.code}`,
    title: input.title,
    status: input.status,
    instance: c.req.path,
    requestId: c.var.requestId,
    ...(input.detail === undefined ? {} : { detail: input.detail }),
  };
  return c.json(body, input.status, { 'Content-Type': 'application/problem+json' });
};
