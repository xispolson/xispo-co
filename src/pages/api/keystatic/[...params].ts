// Overrides the @keystatic/astro injected route to work with Astro v6.
//
// @keystatic/astro v5 reads credentials from context.locals.runtime.env,
// but Astro v6 + @astrojs/cloudflare v13 replaced that with
// `import { env } from "cloudflare:workers"` and made locals.runtime.env
// a throwing getter. Even optional chaining triggers it before config.clientId
// can short-circuit the lookup.
//
// Fix: wrap context in a Proxy that intercepts locals.runtime access and
// returns the real Cloudflare env, then also pass credentials explicitly
// via config so Keystatic finds them on the first try.

export const prerender = false;

import { makeHandler } from '@keystatic/astro/api';
// @ts-ignore — Vite virtual module provided by the Keystatic integration
import baseConfig from 'virtual:keystatic-config';

export const ALL = async (context: any) => {
  let config = baseConfig;
  let proxiedContext = context;

  try {
    const { env } = await import('cloudflare:workers');

    // Proxy locals so that accessing .runtime returns { env } instead of
    // triggering Astro v6's intentional throwing getter.
    const proxiedLocals = new Proxy(context.locals, {
      get(target: any, prop: string | symbol) {
        if (prop === 'runtime') return { env };
        return Reflect.get(target, prop);
      },
    });

    proxiedContext = new Proxy(context, {
      get(target: any, prop: string | symbol) {
        if (prop === 'locals') return proxiedLocals;
        return Reflect.get(target, prop);
      },
    });

    // Pass credentials explicitly too (belt-and-suspenders: config.clientId
    // is checked before envVarsForCf in Keystatic's handler).
    config = {
      ...baseConfig,
      clientId: (env as any).KEYSTATIC_GITHUB_CLIENT_ID ?? baseConfig.clientId,
      clientSecret: (env as any).KEYSTATIC_GITHUB_CLIENT_SECRET ?? baseConfig.clientSecret,
      secret: (env as any).KEYSTATIC_SECRET ?? baseConfig.secret,
    };
  } catch {
    // Not running in a Worker (local dev) — fall back to config as-is.
  }

  return makeHandler({ config })(proxiedContext);
};
