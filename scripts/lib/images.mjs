// Gestion des images à la une : réutilise l'existante (WordPress) ou en génère
// une ultra-réaliste via gpt-image-2. Compression via sharp.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { generateImage } from './openai.mjs';
import { withRetry } from './util.mjs';

const OUT_DIR = path.resolve('public/images/posts');

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

export function localHeroPath(slug) {
  return `/images/posts/${slug}.jpg`;
}
function localHeroFile(slug) {
  return path.join(OUT_DIR, `${slug}.jpg`);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Compresse/redimensionne un buffer et l'écrit en JPEG. */
async function saveJpeg(buffer, slug, maxWidth = 1600) {
  await ensureDir();
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(localHeroFile(slug), out);
  return localHeroPath(slug);
}

/** Construit un prompt photo ultra-réaliste à partir du sujet de l'article. */
export function buildImagePrompt(post) {
  return [
    `Photographie éditoriale ultra réaliste illustrant le sujet : "${post.title}".`,
    'Style : photo professionnelle haut de gamme, lumière naturelle douce, mise au point nette,',
    'profondeur de champ réaliste, couleurs naturelles, rendu authentique type reportage magazine.',
    'Cadrage horizontal soigné, composition aérée laissant de la place pour un titre.',
    'Aucun texte, aucun logo, aucune typographie, aucun filigrane dans l’image.',
    'Scène crédible et concrète, sujets réels, matières et textures détaillées.',
  ].join(' ');
}

/**
 * Garantit une image à la une locale pour un post.
 * Ordre : fichier local existant → image WordPress existante → génération gpt-image-2.
 * @returns {Promise<{heroImage:string, heroAlt:string, heroSource:string}>}
 */
export async function ensureHeroImage(post, { allowGenerate = true } = {}) {
  const slug = post.routeSlug || post.slug;

  // 1) déjà présente localement
  if (await fileExists(localHeroFile(slug))) {
    return { heroImage: localHeroPath(slug), heroAlt: post.heroAlt || post.title, heroSource: 'cache' };
  }

  // 2) image WordPress existante
  if (post.remoteImageUrl) {
    try {
      const buf = await withRetry(
        async () => {
          const r = await fetch(post.remoteImageUrl);
          if (!r.ok) throw Object.assign(new Error(`img ${r.status}`), { status: r.status });
          return Buffer.from(await r.arrayBuffer());
        },
        { tries: 4, base: 1500, label: `dl ${slug}` }
      );
      const heroImage = await saveJpeg(buf, slug);
      return { heroImage, heroAlt: post.heroAlt || post.title, heroSource: 'wordpress' };
    } catch (err) {
      console.warn(`  ⚠️  téléchargement image échoué (${slug}) : ${err.message}`);
      // on tombe sur la génération si autorisée
    }
  }

  // 3) génération ultra-réaliste
  if (allowGenerate) {
    const buf = await generateImage({ prompt: buildImagePrompt(post), label: `img:${slug}` });
    const heroImage = await saveJpeg(buf, slug);
    return { heroImage, heroAlt: post.heroAlt || post.title, heroSource: 'generated' };
  }

  return { heroImage: '', heroAlt: post.title, heroSource: 'none' };
}
