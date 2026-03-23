// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://xispo.co',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    react(),
    sitemap(),
    keystatic(),
  ],
});
