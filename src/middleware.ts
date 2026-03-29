import { defineMiddleware } from 'astro:middleware';

// Placeholder middleware — Keystatic credential injection was moved to
// src/pages/api/keystatic/[...params].ts to avoid the Astro v6
// locals.runtime.env removal issue.
export const onRequest = defineMiddleware((_context, next) => next());
