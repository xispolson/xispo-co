import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const podcast = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/podcast' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    episodeNumber: z.number().optional(),
    season: z.number().optional(),
    audioUrl: z.string(),
    duration: z.string().optional(),
    fileSize: z.number().optional(),
    description: z.string(),
    artwork: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal, podcast };
