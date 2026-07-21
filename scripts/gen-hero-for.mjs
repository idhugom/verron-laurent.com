// Génère l'image hero pour des slugs donnés (posts hors manifest WordPress),
// en lisant directement leur JSON dans src/data/posts/.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ensureHeroImage } from './lib/images.mjs';

async function main() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) {
    console.error('Usage: node scripts/gen-hero-for.mjs <slug1> [slug2...]');
    process.exit(1);
  }
  for (const slug of slugs) {
    const file = path.resolve('src/data/posts', `${slug}.json`);
    const post = JSON.parse(await fs.readFile(file, 'utf8'));
    const hero = await ensureHeroImage({
      routeSlug: post.slug,
      title: post.title,
      heroAlt: post.heroAlt,
    });
    console.log(`🖼️  ${slug} → ${hero.heroImage} (${hero.heroSource})`);
  }
}

main().catch((err) => {
  console.error('❌ échec génération image :', err);
  process.exit(1);
});
