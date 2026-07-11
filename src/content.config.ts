import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/data/posts' }),
  schema: z.object({
    slug: z.string(),
    wpSlug: z.string().optional(),
    metaTitle: z.string().optional(),
    heroSource: z.string().optional(),
    title: z.string(),
    originalTitle: z.string().optional(),
    date: z.string(),
    updated: z.string().optional(),
    excerpt: z.string(),
    metaDescription: z.string(),
    readingMinutes: z.number().default(6),
    heroImage: z.string(),
    heroAlt: z.string().default(''),
    heroCredit: z.string().optional(),
    topics: z.array(z.string()).default([]),
    toc: z
      .array(z.object({ id: z.string(), label: z.string() }))
      .default([]),
    keyTakeaways: z.array(z.string()).default([]),
    bodyHtml: z.string(),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
    generatedBy: z.string().optional(),
    generatedAt: z.string().optional(),
  }),
});

export const collections = { posts };
