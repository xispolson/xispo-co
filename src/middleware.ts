import { defineMiddleware } from 'astro:middleware';

// @keystatic/astro reads context.locals.runtime.env (Astro v5 pattern).
// Astro v6 + @astrojs/cloudflare v13 removed locals.runtime.env and throws
// if anything accesses it. Keystatic's GitHub OAuth handler hits this on every
// /api/keystatic/* request. Re-populate it from cloudflare:workers so Keystatic
// can read KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET, and
// KEYSTATIC_SECRET at runtime.
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/keystatic')) {
    const { env } = await import('cloudflare:workers');
    // locals.runtime is a read-only throwing getter in Astro v6 — override the
    // property descriptor so Keystatic can read its env vars from locals.runtime.env
    Object.defineProperty(context.locals, 'runtime', {
      value: { env },
      writable: true,
      configurable: true,
    });
  }
  return next();
});
