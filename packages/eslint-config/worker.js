import { defineConfig } from 'eslint/config';

import { base } from './base.js';

/** Cloudflare Workers (workerd runtime). Runtime types come from `wrangler types`. */
export const worker = defineConfig(base);
