import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts')).sort((a, b) =>
    b.data.date > a.data.date ? 1 : -1
  );
  return rss({
    title: 'Verron-laurent.com — Mes conseils',
    description:
      'Des conseils pratiques, guides et comparatifs pour faire les bons choix au quotidien.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: new Date(p.data.date),
      description: p.data.excerpt,
      link: `/${p.data.slug}/`,
      categories: p.data.topics,
    })),
    customData: `<language>fr-fr</language>`,
    stylesheet: false,
  });
}
