// Génère les images à la une manquantes (posts sans image WordPress) via gpt-image-2.
// Utilitaire autonome : la génération est aussi effectuée à la volée par generate-content.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ensureHeroImage } from './lib/images.mjs';
import { pLimit } from './lib/util.mjs';

const MANIFEST = path.resolve('scripts/lib/posts.manifest.json');

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (n) => {
    const i = a.indexOf(n);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    concurrency: parseInt(get('--concurrency') || '2', 10),
    slugs: (get('--slugs') || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

async function main() {
  const opts = parseArgs();
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  let targets = manifest.filter((p) => !p.hasImage);
  if (opts.slugs.length) {
    const set = new Set(opts.slugs);
    targets = manifest.filter((p) => set.has(p.slug) || set.has(p.routeSlug));
  }
  console.log(`→ ${targets.length} images à générer (concurrence ${opts.concurrency}).`);

  const limit = pLimit(opts.concurrency);
  let done = 0;
  await Promise.all(
    targets.map((post) =>
      limit(async () => {
        try {
          const hero = await ensureHeroImage(post);
          done++;
          console.log(`  🖼️  [${done}/${targets.length}] ${post.routeSlug} (${hero.heroSource})`);
        } catch (err) {
          done++;
          console.error(`  ❌ [${done}/${targets.length}] ${post.routeSlug} — ${err.message}`);
        }
      })
    )
  );
  console.log('✅ Génération d\'images terminée.');
}

main().catch((err) => {
  console.error('❌ generate-images a échoué :', err);
  process.exit(1);
});
