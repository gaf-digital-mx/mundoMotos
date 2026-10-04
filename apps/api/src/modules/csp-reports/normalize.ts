import { z } from 'zod';

/** A violation reduced to what's useful for tuning the policy, with no query strings (PII). */
export type CspViolation = {
  directive: string;
  blocked: string;
  document: string;
  source?: string;
  line?: number;
  disposition: string;
};

const MAX_FIELD = 256;
// Browser extensions inject scripts on every page view: noise we can't act on.
const EXTENSION_SCHEMES = new Set([
  'chrome-extension',
  'moz-extension',
  'safari-extension',
  'safari-web-extension',
]);

// Browsers send null for unknown fields (Chromium: `sourceFile: null`) and extra keys we ignore.
const text = z.string().nullish();
const line = z.coerce.number().int().nonnegative().nullish().catch(undefined);

// Legacy `report-uri` body (application/csp-report): Firefox and Safari.
const legacySchema = z.object({
  'csp-report': z.object({
    'document-uri': text,
    'effective-directive': text,
    'violated-directive': text,
    'blocked-uri': text,
    'source-file': text,
    'line-number': line,
    disposition: text,
  }),
});

// One Reporting API item (application/reports+json): Chromium sends arrays of these.
const reportingItemSchema = z.object({
  type: z.literal('csp-violation'),
  body: z.object({
    documentURL: text,
    effectiveDirective: text,
    blockedURL: text,
    sourceFile: text,
    lineNumber: line,
    disposition: text,
  }),
});

/**
 * Keywords (`inline`, `eval`, …) stay as-is; http(s) URLs keep origin and path only; any other
 * scheme (`data:`, `blob:`, extensions) is reduced to its scheme so no page content is logged.
 */
export const stripUrl = (value: string | null | undefined): string => {
  if (!value) return 'unknown';
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.origin}${url.pathname}`.slice(0, MAX_FIELD);
    }
    return url.protocol.slice(0, -1).slice(0, 32);
  } catch {
    return value.slice(0, 32);
  }
};

const pathOf = (value: string | null | undefined): string => {
  try {
    return new URL(value ?? '').pathname.slice(0, MAX_FIELD);
  } catch {
    return 'unknown';
  }
};

const fromExtension = (value: string): boolean => EXTENSION_SCHEMES.has(value);

type RawViolation = {
  directive: string | null | undefined;
  blocked: string | null | undefined;
  document: string | null | undefined;
  source: string | null | undefined;
  line: number | null | undefined;
  disposition: string | null | undefined;
};

const violation = (input: RawViolation): CspViolation | null => {
  const blocked = stripUrl(input.blocked);
  const source = input.source ? stripUrl(input.source) : undefined;
  if (fromExtension(blocked) || (source !== undefined && fromExtension(source))) return null;
  return {
    directive: (input.directive ?? 'unknown').slice(0, 64),
    blocked,
    document: pathOf(input.document),
    ...(source === undefined ? {} : { source }),
    ...(input.line == null ? {} : { line: input.line }),
    disposition: (input.disposition ?? 'report').slice(0, 16),
  };
};

/** Parses either report format item by item (one odd item never discards the rest). */
export const normalizeReports = (payload: unknown): CspViolation[] => {
  const legacy = legacySchema.safeParse(payload);
  if (legacy.success) {
    const r = legacy.data['csp-report'];
    const parsed = violation({
      directive: r['effective-directive'] ?? r['violated-directive'],
      blocked: r['blocked-uri'],
      document: r['document-uri'],
      source: r['source-file'],
      line: r['line-number'],
      disposition: r.disposition,
    });
    return parsed ? [parsed] : [];
  }
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item: unknown) => {
    const report = reportingItemSchema.safeParse(item);
    if (!report.success) return [];
    const { body } = report.data;
    const parsed = violation({
      directive: body.effectiveDirective,
      blocked: body.blockedURL,
      document: body.documentURL,
      source: body.sourceFile,
      line: body.lineNumber,
      disposition: body.disposition,
    });
    return parsed ? [parsed] : [];
  });
};

/**
 * Per-isolate dedupe: the same violation on every page view would otherwise flood Workers Logs
 * (free-plan event cap). Returns true the first time a key is seen within `ttlMs`.
 */
export const makeDeduper = (ttlMs: number, maxKeys: number, now: () => number) => {
  const seen = new Map<string, number>();
  return (key: string): boolean => {
    const at = now();
    const last = seen.get(key);
    if (last !== undefined && at - last < ttlMs) return false;
    if (seen.size >= maxKeys) seen.clear();
    seen.set(key, at);
    return true;
  };
};
