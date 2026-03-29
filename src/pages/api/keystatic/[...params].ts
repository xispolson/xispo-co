// Overrides the @keystatic/astro injected route.
// The actual Astro v6 / Cloudflare Workers compatibility fix is in
// scripts/patch-keystatic.mjs (applied via postinstall).
export const prerender = false;

import { makeHandler } from '@keystatic/astro/api';
// @ts-ignore — Vite virtual module provided by the Keystatic integration
import config from 'virtual:keystatic-config';

export const ALL = makeHandler({ config });
