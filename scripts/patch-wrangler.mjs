/**
 * Post-build script: patch the generated dist/server/wrangler.json to add
 * settings that the Astro Cloudflare adapter doesn't include by default.
 *
 * - nodejs_compat: required for Cloudflare Worker to run Astro SSR routes
 * - vars.KEYSTATIC_GITHUB_CLIENT_ID: non-secret Keystatic OAuth client ID
 *
 * Secrets (KEYSTATIC_GITHUB_CLIENT_SECRET, KEYSTATIC_SECRET) are set via
 * the Cloudflare dashboard as encrypted Secrets — they survive deploys
 * independently of wrangler.json.
 */

import { readFileSync, writeFileSync } from 'fs';

const path = 'dist/server/wrangler.json';
const config = JSON.parse(readFileSync(path, 'utf8'));

config.compatibility_flags = ['nodejs_compat'];

config.vars = {
  ...config.vars,
  KEYSTATIC_GITHUB_CLIENT_ID: 'Ov23libqflIVbsnRIctS',
};

writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
console.log('[patch-wrangler] nodejs_compat + KEYSTATIC_GITHUB_CLIENT_ID applied.');
