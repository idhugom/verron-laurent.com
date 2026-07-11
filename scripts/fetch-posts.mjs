// Récupère les métadonnées de tous les posts de verron-laurent.com
// (titre, slug 100% identique, image à la une existante) et écrit un manifest.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fetchAllPosts, fetchMediaMap } from './lib/wp.mjs';

const MANIFEST = path.resolve('scripts/lib/posts.manifest.json');

async function main() {
  console.log('→ Récupération des posts depuis www.verron-laurent.com …');
  const posts = await fetchAllPosts();
  console.log(`  ${posts.length} posts récupérés.`);

  const mediaIds = posts.map((p) => p.featuredMediaId).filter(Boolean);
  console.log(`→ Récupération de ${new Set(mediaIds).size} médias à la une …`);
  const media = await fetchMediaMap(mediaIds);

  const manifest = posts.map((p) => {
    const m = p.featuredMediaId ? media.get(p.featuredMediaId) : null;
    return {
      id: p.id,
      slug: p.slug,
      // Le permalien WordPress est /{id}-{slug}/ : on préserve ce chemin à l'identique.
      routeSlug: `${p.id}-${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
      date: p.date,
      modified: p.modified,
      link: p.link,
      featuredMediaId: p.featuredMediaId,
      remoteImageUrl: m?.url || null,
      heroAlt: m?.alt || '',
      hasImage: Boolean(m?.url),
    };
  });

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  const withImg = manifest.filter((p) => p.hasImage).length;
  console.log(`✅ Manifest écrit (${manifest.length} posts) → ${path.relative(process.cwd(), MANIFEST)}`);
  console.log(`   avec image existante : ${withImg} · sans image (à générer) : ${manifest.length - withImg}`);
}

main().catch((err) => {
  console.error('❌ fetch-posts a échoué :', err);
  process.exit(1);
});
