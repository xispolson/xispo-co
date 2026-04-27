/**
 * Post-build script: patch the generated dist/server/wrangler.json to add
 * settings that the Astro Cloudflare adapter doesn't include by default.
 *
 * - nodejs_compat: required for Cloudflare Worker to run Astro SSR routes
 * - BOBIUM_DB: D1 database binding for /bobium ratings + tags
 *
 * Set D1_BOBIUM_DATABASE_ID as a Cloudflare build env var (or in .env locally).
 * OAuth secrets are set via `wrangler secret put` and survive deploys independently.
 */

import { readFileSync, writeFileSync } from 'fs';

const path = 'dist/server/wrangler.json';
const config = JSON.parse(readFileSync(path, 'utf8'));

config.compatibility_flags = ['nodejs_compat'];

const d1Id = process.env.D1_BOBIUM_DATABASE_ID;
if (d1Id) {
  config.d1_databases = [{
    binding: 'BOBIUM_DB',
    database_name: 'bobium-ratings',
    database_id: d1Id,
  }];
  console.log('[patch-wrangler] BOBIUM_DB D1 binding added.');
} else {
  console.warn('[patch-wrangler] D1_BOBIUM_DATABASE_ID not set — /bobium database will not be connected in this deploy.');
}

writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
console.log('[patch-wrangler] nodejs_compat applied.');
