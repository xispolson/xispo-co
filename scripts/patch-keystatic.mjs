/**
 * Patches @keystatic/astro to work with Astro v6 + @astrojs/cloudflare v13.
 *
 * Astro v6 removed `locals.runtime.env` (replaced with `cloudflare:workers`).
 * @keystatic/astro v5 still reads `context.locals.runtime.env` — even optional
 * chaining triggers the throwing getter Astro v6 installed for migration help.
 *
 * Fix: replace that single line with a try/await import('cloudflare:workers').
 * The handler is already async so await is fine.
 *
 * Run automatically via `postinstall` in package.json.
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'node_modules/@keystatic/astro/dist/keystatic-astro-api.js';

const OLD = `const envVarsForCf = (_context$locals = context.locals) === null || _context$locals === void 0 || (_context$locals = _context$locals.runtime) === null || _context$locals === void 0 ? void 0 : _context$locals.env;`;

const NEW = `let envVarsForCf;
    try {
      const { env: _cfEnv } = await import('cloudflare:workers');
      envVarsForCf = _cfEnv;
    } catch {
      try { envVarsForCf = context.locals?.runtime?.env; } catch { envVarsForCf = undefined; }
    }`;

let src;
try {
  src = readFileSync(FILE, 'utf8');
} catch {
  console.error(`[patch-keystatic] Could not read ${FILE} — skipping.`);
  process.exit(0);
}

if (!src.includes(OLD)) {
  console.log('[patch-keystatic] Already patched or line changed — skipping.');
  process.exit(0);
}

writeFileSync(FILE, src.replace(OLD, NEW), 'utf8');
console.log('[patch-keystatic] Patched @keystatic/astro for Astro v6 + Cloudflare Workers.');
