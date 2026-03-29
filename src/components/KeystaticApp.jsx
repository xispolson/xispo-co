// Intermediate module so Astro can resolve the client:only import statically.
// client:only requires a direct named/default import, not a frontmatter variable.
import { makePage } from '@keystatic/astro/ui';
// @ts-ignore — virtual module provided by the Keystatic Vite plugin
import config from 'virtual:keystatic-config';

export const KeystaticApp = makePage(config);
