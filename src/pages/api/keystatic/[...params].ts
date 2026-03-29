// Overrides the @keystatic/astro injected route so we can supply credentials
// via `cloudflare:workers` env (Astro v6 removed locals.runtime.env).
export const prerender = false;

import { makeHandler } from '@keystatic/astro/api';
// @ts-ignore — Vite virtual module provided by the Keystatic integration
import baseConfig from 'virtual:keystatic-config';

export const ALL = async (context: any) => {
  let config = baseConfig;

  try {
    // cloudflare:workers is external at build time; resolved in the Worker at runtime
    const { env } = await import('cloudflare:workers');
    config = {
      ...baseConfig,
      clientId: (env as any).KEYSTATIC_GITHUB_CLIENT_ID ?? baseConfig.clientId,
      clientSecret: (env as any).KEYSTATIC_GITHUB_CLIENT_SECRET ?? baseConfig.clientSecret,
      secret: (env as any).KEYSTATIC_SECRET ?? baseConfig.secret,
    };
  } catch {
    // Not running in a Worker (local dev) — fall back to config as-is,
    // which will pick up credentials from import.meta.env if set.
  }

  return makeHandler({ config })(context);
};
