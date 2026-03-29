// Compatibility shim: @keystatic/astro v5 reads context.locals.runtime.env,
// but Astro v6 + @astrojs/cloudflare v13 replaced that with a throwing getter.
// Fix: redefine `env` directly on the runtime object before Keystatic reads it.
export const prerender = false;

import { makeHandler } from '@keystatic/astro/api';
// @ts-ignore — Vite virtual module provided by the Keystatic integration
import baseConfig from 'virtual:keystatic-config';

export const ALL = async (context: any) => {
  try {
    const { env } = await import('cloudflare:workers');

    // locals.runtime is a non-replaceable data property (non-configurable,
    // non-writable). But locals.runtime.env is a *separate* getter on the
    // runtime object itself. If that getter is configurable we can redefine it
    // with the real Cloudflare env — Keystatic then reads it normally.
    const runtime = context.locals.runtime;
    Object.defineProperty(runtime, 'env', {
      value: env,
      writable: true,
      configurable: true,
    });
  } catch {
    // Not in a Worker (local dev) or env is non-configurable — fall through.
  }

  return makeHandler({ config: baseConfig })(context);
};
