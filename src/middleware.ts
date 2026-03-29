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
    // @ts-ignore — locals.runtime was removed in Astro v6 but Keystatic still needs it
    context.locals.runtime = { env };
  }
  return next();
});
