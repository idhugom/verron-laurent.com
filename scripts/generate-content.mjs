// Régénère ENTIÈREMENT le contenu de chaque article via gpt-5.6-terra.
// Conserve le titre + le slug à l'identique ; réutilise ou génère l'image à la une.
// Resumable (saute ce qui existe), concurrent, avec post-traitement (ancres, TOC).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { generateStructured } from './lib/openai.mjs';
import { ensureHeroImage } from './lib/images.mjs';
import { pLimit, readingMinutes } from './lib/util.mjs';

const MANIFEST = path.resolve('scripts/lib/posts.manifest.json');
const OUT_DIR = path.resolve('src/data/posts');

/* ----------------------------------------------------------- CLI options */
function parseArgs() {
  const a = process.argv.slice(2);
  const get = (name) => {
    const i = a.indexOf(name);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    all: a.includes('--all'),
    force: a.includes('--force'),
    limit: parseInt(get('--limit') || '30', 10),
    concurrency: parseInt(get('--concurrency') || '3', 10),
    slugs: (get('--slugs') || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/* ------------------------------------------------------- Instructions IA */
const INSTRUCTIONS = `Tu es rédacteur web expert francophone pour "Verron-laurent.com", un site de conseils pratiques (slogan : « Mes conseils »). Ta mission : produire un article de référence, complet et à forte valeur ajoutée, qui répond à TOUTE l'intention de recherche derrière le titre fourni.

EXIGENCES DE FOND
- Contenu 100% original, concret, actionnable, précis et honnête. Apporte de vraies informations utiles : critères de choix, méthodes, étapes, ordres de grandeur réalistes, pièges à éviter, cas d'usage.
- Réponds aux questions que se pose réellement le lecteur (intention informationnelle ET décisionnelle).
- Reste factuel et prudent : ne fabrique PAS de chiffres précis, de prix exacts, de dates ou de statistiques invérifiables. Utilise des fourchettes et formulations générales ("généralement", "en moyenne", "comptez souvent").
- Français impeccable, ton clair, chaleureux et expert, phrases variées, zéro remplissage.
- Longueur : viser 1500 à 2400 mots dans bodyHtml.

STRUCTURE (bodyHtml = HTML sémantique, SANS <h1>, SANS <html>/<body>)
- Commence par 1 à 2 paragraphes d'introduction (sans titre) qui posent le sujet et l'enjeu.
- 5 à 8 sections <h2>, avec des <h3> si utile.
- Paragraphes <p>, listes <ul>/<ol>, <strong> pour les points clés.
- INCLURE OBLIGATOIREMENT au moins un tableau comparatif ou récapitulatif :
  <div class="table-wrap"><table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table></div>
- INCLURE au moins un encadré de mise en avant (choisis les variantes pertinentes) :
  <div class="callout callout--tip"><span class="callout__title">Bon à savoir</span><p>…</p></div>
  (variantes disponibles : callout--tip [conseil], callout--important [attention], callout--note [à noter], callout--key [essentiel])
- QUAND LE SUJET S'Y PRÊTE (choix entre 2 options, avantages/inconvénients), inclure une comparaison en 2 colonnes :
  <div class="compare"><div class="compare__col compare__col--a"><h3>Option A</h3><ul><li>…</li></ul></div><div class="compare__col compare__col--b"><h3>Option B</h3><ul><li>…</li></ul></div></div>
  et/ou un bloc avantages/inconvénients :
  <div class="pros-cons"><div class="pros"><h4>Avantages</h4><ul><li>…</li></ul></div><div class="cons"><h4>Inconvénients</h4><ul><li>…</li></ul></div></div>
- Tu PEUX ajouter des chiffres clés visuels si pertinent :
  <div class="stat-grid"><div class="stat"><span class="stat__num">3 à 5</span><span class="stat__label">…</span></div></div>
- N'inclus NI la FAQ NI les points clés dans bodyHtml : ils sont fournis séparément.
- Pas de liens externes inventés, pas d'images dans le HTML.

CHAMPS À RENVOYER
- metaTitle : titre SEO accrocheur (max ~62 caractères).
- metaDescription : 150-160 caractères, incitative, avec le bénéfice principal.
- excerpt : résumé d'accroche de 150-200 caractères.
- topics : 3 à 5 thématiques courtes (1-2 mots, minuscule) pour le classement.
- keyTakeaways : 4 à 6 points essentiels (phrases courtes et concrètes).
- faq : 5 à 7 questions/réponses réellement utiles, réponses de 2-4 phrases.
- heroAlt : texte alternatif descriptif pour l'image à la une (sans "image de").`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
    excerpt: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
    keyTakeaways: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
    bodyHtml: { type: 'string' },
    faq: {
      type: 'array',
      minItems: 4,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer'],
      },
    },
    heroAlt: { type: 'string' },
  },
  required: ['metaTitle', 'metaDescription', 'excerpt', 'topics', 'keyTakeaways', 'bodyHtml', 'faq', 'heroAlt'],
};

/* --------------------------------------------------------- Post-traitement */
function slugifyId(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Injecte des id sur les <h2> et construit la table des matières. */
function injectAnchors(html) {
  const toc = [];
  const used = new Set();
  const out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    const label = inner.replace(/<[^>]*>/g, '').trim();
    if (/\bid=/.test(attrs)) {
      const id = attrs.match(/id=["']([^"']+)["']/)?.[1] || slugifyId(label);
      toc.push({ id, label });
      return m;
    }
    let id = slugifyId(label) || `section-${toc.length + 1}`;
    let n = 2;
    while (used.has(id)) id = `${slugifyId(label)}-${n++}`;
    used.add(id);
    toc.push({ id, label });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

/* ------------------------------------------------------------ Sélection */
function selectPosts(manifest, opts) {
  if (opts.slugs.length) {
    const set = new Set(opts.slugs);
    return manifest.filter((p) => set.has(p.slug) || set.has(p.routeSlug));
  }
  if (opts.all) return manifest;
  // lot de validation : réparti uniformément pour la diversité thématique
  const n = Math.min(opts.limit, manifest.length);
  const step = manifest.length / n;
  const picks = [];
  for (let i = 0; i < n; i++) picks.push(manifest[Math.floor(i * step)]);
  return picks;
}

/* ---------------------------------------------------------------- Main */
async function processPost(post, opts) {
  const routeSlug = post.routeSlug || post.slug;
  const outFile = path.join(OUT_DIR, `${routeSlug}.json`);
  if (!opts.force) {
    try {
      await fs.access(outFile);
      return { slug: routeSlug, status: 'skip' };
    } catch {}
  }

  // 1) contenu
  const userInput = `Titre exact de l'article (à conserver tel quel comme sujet) : "${post.title}"
${post.excerpt ? `Contexte / angle d'origine : ${post.excerpt}` : ''}
Rédige l'article de référence complet correspondant à ce titre.`;

  const { data } = await generateStructured({
    instructions: INSTRUCTIONS,
    input: userInput,
    schema: SCHEMA,
    schemaName: 'article',
    label: post.slug,
  });

  // 2) image à la une (existante ou générée)
  const hero = await ensureHeroImage(post);

  // 3) post-traitement
  const { html, toc } = injectAnchors(data.bodyHtml);

  const record = {
    slug: routeSlug, // chemin d'URL identique au permalien WordPress /{id}-{slug}/
    wpSlug: post.slug,
    title: post.title, // conservé à l'identique
    originalTitle: post.title,
    date: post.date,
    updated: post.modified,
    excerpt: data.excerpt,
    metaDescription: data.metaDescription,
    readingMinutes: readingMinutes(html),
    heroImage: hero.heroImage,
    heroAlt: data.heroAlt || hero.heroAlt,
    topics: data.topics,
    toc,
    keyTakeaways: data.keyTakeaways,
    bodyHtml: html,
    faq: data.faq.map((f) => ({ q: f.question, a: f.answer })),
    generatedBy: 'gpt-5.6-terra',
    generatedAt: new Date().toISOString(),
    metaTitle: data.metaTitle,
    heroSource: hero.heroSource,
  };

  await fs.writeFile(outFile, JSON.stringify(record, null, 2));
  return { slug: routeSlug, status: 'ok', heroSource: hero.heroSource };
}

async function main() {
  const opts = parseArgs();
  await fs.mkdir(OUT_DIR, { recursive: true });
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  const selected = selectPosts(manifest, opts);

  console.log(`→ ${selected.length} articles à traiter (concurrence ${opts.concurrency}, force=${opts.force}).`);
  const limit = pLimit(opts.concurrency);
  let done = 0;
  const results = await Promise.all(
    selected.map((post) =>
      limit(async () => {
        try {
          const r = await processPost(post, opts);
          done++;
          const tag = r.status === 'skip' ? '⏭️ ' : r.heroSource === 'generated' ? '🖼️ ' : '✅';
          console.log(`  ${tag} [${done}/${selected.length}] ${post.routeSlug || post.slug}`);
          return r;
        } catch (err) {
          done++;
          console.error(`  ❌ [${done}/${selected.length}] ${post.routeSlug || post.slug} — ${err.message}`);
          return { slug: post.slug, status: 'error', error: err.message };
        }
      })
    )
  );

  const ok = results.filter((r) => r.status === 'ok').length;
  const skip = results.filter((r) => r.status === 'skip').length;
  const err = results.filter((r) => r.status === 'error').length;
  const gen = results.filter((r) => r.heroSource === 'generated').length;
  console.log(`\n✅ Terminé : ${ok} générés · ${skip} ignorés · ${err} erreurs · ${gen} images créées.`);
  if (err) process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌ generate-content a échoué :', err);
  process.exit(1);
});
