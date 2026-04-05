// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://xispo.co',
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    sitemap(),
  ],
  env: {
    schema: {
      FLICKR_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      FLICKR_USER_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      FLICKR_ALBUM_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
