# CLAUDE.md — Guide de travail pour Verron-laurent.com

Ce fichier oriente toute session Claude Code sur ce dépôt. Il **complète** l'état
actuel du site : il décrit comment travailler, pas comment refaire l'existant. Sauf
demande explicite, ne modifie pas en masse les 657 articles déjà publiés — on
**ajoute** et on **améliore** au cas par cas.

---

## Règles d'intervention (prioritaires — à respecter à chaque session)

### Règle n°1 — TOUJOURS travailler sur `main`
Toute session (développement, rédaction, correction, amélioration…) se fait
**directement sur la branche `main`**. Ne **jamais** créer de branche, ne jamais
travailler sur une branche secondaire. `main` est aussi la branche de production
Cloudflare Pages : ce qui est poussé est mis en ligne.

### Règle n°2 — Toujours en qualité optimale
Se placer systématiquement dans le réglage le **plus intelligent / le plus
performant** du modèle pour chaque intervention (raisonnement maximal).
**Seule exception** : la génération de photos OpenAI reste en `quality: "medium"`
(voir §6).

### Règle n°3 — Clés API / tokens
Les clés et tokens (`OPENAI_API_KEY`, et le cas échéant `OPENAI_IMAGE_MODEL`,
clés Cloudflare, etc.) sont fournis par l'**environnement cloud** de Claude Code
via les variables d'environnement (`process.env`). Les **récupérer depuis
l'environnement**. Ne jamais les redemander, ne jamais les écrire en dur dans le
code, ne jamais les committer. Le `.gitignore` exclut déjà `.env`.

---

## 1. Le site en bref

- **Verron-laurent.com** — site de **conseils pratiques** francophone. Slogan :
  « Mes conseils ». On transforme des sujets parfois arides (assurance, contrats,
  équipement, maison, mode, voyage, loisirs, tech, cuisine…) en **guides clairs,
  honnêtes et actionnables**.
- **Stack** : [Astro 5](https://astro.build) en **génération statique** (`dist/`).
  Polices [Fontsource] Fredoka (titres) + Plus Jakarta Sans (texte). Sitemap + RSS
  intégrés.
- **Contenu** : un fichier **JSON par article** dans `src/data/posts/`, chargé via
  la content collection Astro (`src/content.config.ts`). ~657 articles publiés.
- **URL** : `/{id}-{slug}` (ex. `/966-comment-dessiner-un-dragon`). Le nom du
  fichier JSON = le `slug` = le chemin d'URL. `trailingSlash: 'ignore'`.
- **Déploiement** : Cloudflare Pages. Branche prod `main`, build `npm run build`,
  sortie `dist`. Le build est **100 % statique** : le contenu (`src/data/posts/*.json`)
  et les images (`public/images/posts/`) sont **versionnés**, aucun appel API au build.
- **Domaine canonique** : `https://www.verron-laurent.com` (l'apex redirige vers `www`).

### Design & palette (dérivée du logo — ne pas dévier)
Bleu électrique `#0054E4`, navy `#000C3C`, pêche `#FCA86C`, bleu ciel `#90B4FC`.
Design animé et joyeux. Un seul accent hors-logo est toléré : un vert `#0a8a55`
réservé à la sémantique « réussite / avantage » (callout `--tip`, colonne `pros`).

---

## 2. Identité & ton rédactionnel

- **Voix** : claire, chaleureuse, experte, **honnête**. On explique simplement,
  même les sujets techniques ; on s'adresse à tout le monde.
- **Promesse éditoriale** (cf. `/a-propos`) :
  - *Honnêteté d'abord* — on dit aussi ce qui ne va pas, pas seulement ce qui brille.
  - *Du concret* — critères, fourchettes, étapes, pièges. Zéro remplissage.
  - *Pour tout le monde* — langage simple.
  - *Toujours à jour* — on révise pour rester fiable.
- **Français impeccable**, phrases variées, pas de jargon gratuit, pas de superlatifs
  creux.
- **Prudence factuelle** : ne **jamais fabriquer** de chiffres précis, prix exacts,
  dates ou statistiques invérifiables. Préférer des fourchettes et des formulations
  générales (« généralement », « en moyenne », « comptez souvent »). Pas de liens
  externes inventés.

---

## 0. Règles d'or de la rédaction (prioritaires)

1. **Rédaction par Claude, pas par l'API.** Le corps des nouveaux articles est
   écrit par **toi, Claude**, directement en session, dans la qualité maximale du
   modèle (Règle n°2). Le pipeline texte historique (`gpt-5.6-terra` via
   `scripts/generate-content.mjs`) est **legacy** : il a servi à produire l'existant
   et reste dans le dépôt pour référence, mais **on ne l'utilise plus pour les
   nouveaux articles**. Seules les **images** passent encore par OpenAI (§6).
2. **Anti-cannibalisation.** Si le sujet est libre, **vérifier d'abord l'existant**
   (voir §3) : chaque nouvel article doit porter sur un **sujet distinct** de ceux
   déjà publiés, pour ne pas se cannibaliser en SEO.
3. **Qualité avant tout.** Chaque article doit apporter la **meilleure information
   disponible** sur son sujet : des détails en plus et, selon la pertinence, des
   éléments riches (tableau, comparaison, astuces, FAQ, chiffres, citation…). Ce
   sont des **exemples** — inutile de tout mettre à chaque fois (voir §4).
4. **Photo OpenAI obligatoire.** Ne **jamais** publier un article sans visuel.
   Toujours une **vraie photo à la une** générée par OpenAI, « photo généraliste sur
   le thème, ultra réaliste », **avant** publication (§6).
5. **Liens internes.** Ajouter **1 à 4 liens internes** par article vers d'autres
   pages du site (§5).

---

## 3. Avant d'écrire — anti-cannibalisation

Le site compte déjà ~657 articles. Avant de rédiger un nouveau sujet **libre** :

1. **Lister l'existant** par titre et par thème :
   ```bash
   # Titres déjà publiés (repérer les doublons de sujet)
   grep -h '"title"' src/data/posts/*.json | sort

   # Chercher un angle précis déjà couvert (ex. "assurance auto")
   grep -il "assurance auto" src/data/posts/*.json
   ```
   La page `/themes` (`src/pages/themes/index.astro`) regroupe aussi tout le contenu
   par `topics` : utile pour voir la densité d'un thème.
2. **Trancher** : si le sujet (ou une variante très proche) existe déjà, **changer
   d'angle** ou choisir un autre sujet. Deux articles ne doivent pas répondre à la
   même intention de recherche.
3. **Choisir le couple `id-slug`** : les slugs historiques suivent `/{id}-{slug}`
   (l'`id` vient de l'ancien WordPress). Pour un article **nouveau**, prends un `id`
   numérique **non utilisé** (vérifie qu'aucun fichier `src/data/posts/{id}-*.json`
   n'existe) et un `slug` descriptif en minuscules-tirets, sans accents.

---

## 4. Qualité rédactionnelle & structure d'un article

Le corps (`bodyHtml`) est du **HTML sémantique**, sans `<h1>`, sans `<html>/<body>`
(le `<h1>` est le titre de la page, rendu par `[slug].astro`). Longueur cible :
**1500 à 2400 mots**.

**Trame recommandée :**
- 1 à 2 paragraphes d'**introduction** (sans titre) qui posent le sujet et l'enjeu.
  Le **premier `<p>`** est stylé en chapô (plus grand) — soigne-le.
- **5 à 8 sections `<h2>`**, avec des `<h3>` si utile. Chaque `<h2>` **doit porter un
  `id`** (voir la règle de slug ci-dessous) car il alimente le sommaire (`toc`).
- Paragraphes `<p>`, listes `<ul>`/`<ol>`, `<strong>` pour les points clés.

**Éléments riches disponibles** (classes CSS déjà stylées dans
`src/styles/prose.css` — n'en invente pas d'autres) :

| Élément | Balisage | Quand l'utiliser |
|---|---|---|
| **Tableau** (recommandé, ≥1) | `<div class="table-wrap"><table><thead>…</thead><tbody>…</tbody></table></div>` | Comparer / récapituler |
| **Encadré** | `<div class="callout callout--tip"><span class="callout__title">Bon à savoir</span><p>…</p></div>` | Mettre en avant un point |
| **Comparaison 2 colonnes** | `<div class="compare"><div class="compare__col compare__col--a"><h3>A</h3><ul>…</ul></div><div class="compare__col compare__col--b"><h3>B</h3><ul>…</ul></div></div>` | Opposer 2 options |
| **Avantages / inconvénients** | `<div class="pros-cons"><div class="pros"><h4>Avantages</h4><ul>…</ul></div><div class="cons"><h4>Inconvénients</h4><ul>…</ul></div></div>` | Bilan d'un choix |
| **Chiffres clés** | `<div class="stat-grid"><div class="stat"><span class="stat__num">3</span><span class="stat__label">…</span></div></div>` | 2–4 repères visuels |
| **Citation** | `<blockquote>…</blockquote>` | Mise en exergue |

Variantes de callout : `callout--tip` (💡 conseil), `callout--important` (⚠️
attention), `callout--note` (📌 à noter), `callout--key` (🎯 essentiel).

**À NE PAS mettre dans `bodyHtml`** : ni la **FAQ**, ni les **points clés**
(`keyTakeaways`), ni d'**images** dans le corps (l'article n'a qu'une seule image :
la hero). Ces blocs sont des champs séparés (voir §7) et sont rendus à part par le
template.

**Règle de slug d'ancre `<h2 id="…">`** (identique au post-traitement historique) :
minuscules, accents retirés, tout caractère non `[a-z0-9]` → `-`, sans tirets en
bord, **tronqué à 60 caractères**. Chaque `id` d'ancre doit correspondre à une entrée
`toc`.

---

## 5. Liens internes (1 à 4 par article)

> **Constat actuel : aucun article n'a de lien interne.** C'est le principal levier
> d'amélioration SEO. Tout **nouvel** article (et tout article retravaillé) doit en
> comporter **1 à 4**.

- **Cible** : d'autres pages du site, en URL **racine-absolue** : `/{id}-{slug}`
  (ex. `<a href="/2312-assurance-auto-voiture-societe">notre guide de l'assurance
  auto pour société</a>`). Pas de barre finale nécessaire (`trailingSlash: 'ignore'`).
- **Où** : dans le corps `bodyHtml`, **en contexte**, avec une ancre descriptive
  (jamais « cliquez ici »). Le style `.prose a` (soulignement animé bleu) s'applique
  automatiquement.
- **Comment choisir les cibles** : privilégier des articles **thématiquement
  proches** (mêmes `topics`). Vérifier que la cible existe vraiment :
  ```bash
  ls src/data/posts/ | grep -i "assurance"
  ```
  Le template lie déjà automatiquement les 3 articles « À lire aussi » (parenté par
  `topics`) et les chips de thème ; les liens internes de §5 sont **en plus**, dans
  le texte.
- Ne pas sur-optimiser : des liens **utiles au lecteur**, pas du bourrage.

---

## 6. Photo — toujours une vraie photo OpenAI avant publication

**Règle absolue : jamais d'article sans visuel.** Une seule **photo de couverture
(hero)** par article, **ultra réaliste**, générée par OpenAI. Pas de galerie, pas
d'image dans le corps.

- **Modèle & paramètres imposés** (déjà câblés dans `scripts/lib/openai.mjs` et
  `scripts/lib/images.mjs`) :
  ```json
  { "model": "gpt-image-2", "size": "1536x1024", "quality": "medium", "n": 1 }
  ```
- **Prompt** : photo éditoriale généraliste **sur le thème** de l'article, ultra
  réaliste, lumière naturelle, sans **aucun texte / logo / filigrane**, cadrage
  horizontal aéré. Cf. `buildImagePrompt()` dans `scripts/lib/images.mjs`.
- **Sortie** : compressée par `sharp` (largeur max 1600, JPEG q84, mozjpeg) et écrite
  dans `public/images/posts/{slug}.jpg`. Dans le JSON, `heroImage =
  "/images/posts/{slug}.jpg"`.
- **Génération** :
  ```bash
  # Génère les images manquantes pour les articles présents
  npm run gen:images
  ```
  `ensureHeroImage()` réutilise une image locale existante avant d'en générer une —
  donc on ne régénère pas inutilement. Renseigne toujours un `heroAlt` descriptif
  (sans « image de »).
- `OPENAI_API_KEY` provient de l'environnement (Règle n°3).

---

## 7. Ajouter un nouvel article — checklist complète

Créer **un fichier** `src/data/posts/{id}-{slug}.json` respectant le schéma de
`src/content.config.ts`. Champs (⭑ = requis) :

| Champ | Type | Note |
|---|---|---|
| `slug` ⭑ | string | `{id}-{slug}`, = nom de fichier, = URL |
| `wpSlug` | string | slug sans l'id (optionnel pour un article neuf) |
| `title` ⭑ | string | titre H1, tel qu'affiché |
| `originalTitle` | string | recopie de `title` |
| `date` ⭑ | string | ISO (ex. `2026-07-13T10:00:00`) |
| `updated` | string | ISO, date de révision |
| `excerpt` ⭑ | string | accroche 150–200 caractères |
| `metaTitle` | string | titre SEO ≤ ~62 caractères |
| `metaDescription` ⭑ | string | 150–160 caractères, incitative |
| `readingMinutes` | number | ~200 mots/min (cf. `readingMinutes()` de `util.mjs`) |
| `heroImage` ⭑ | string | `/images/posts/{slug}.jpg` |
| `heroAlt` | string | alt descriptif |
| `heroSource` | string | `generated` / `wordpress` / `cache` |
| `topics` ⭑ | string[] | 3 à 5 thèmes courts, minuscules |
| `toc` | `{id,label}[]` | un item par `<h2>`, `id` = ancre du h2 |
| `keyTakeaways` | string[] | 4 à 6 points essentiels (hors `bodyHtml`) |
| `bodyHtml` ⭑ | string | corps HTML (§4) |
| `faq` | `{q,a}[]` | 5 à 7 Q/R utiles (hors `bodyHtml`) — **clés `q` et `a`** |
| `generatedBy` | string | pour un article rédigé en session : `"claude"` |
| `generatedAt` | string | ISO |

⚠️ **Attention au format `faq`** : dans les fichiers JSON, chaque entrée utilise les
clés **`q`** et **`a`** (le champ `question`/`answer` n'existe que dans l'ancien
schéma API, converti ensuite). La FAQ alimente un rich snippet `FAQPage`
(JSON-LD) — soigne-la.

**Étapes :**
1. **Anti-cannibalisation** (§3) : vérifier l'existant, choisir sujet + `id-slug`.
2. **Rédiger** `bodyHtml` en session (Claude), structure et éléments riches (§4).
3. **Ajouter 1–4 liens internes** vers des articles réels (§5).
4. Renseigner `toc` (une entrée par `<h2 id>`), `keyTakeaways`, `faq`, `topics`,
   `metaTitle`, `metaDescription`, `excerpt`, `heroAlt`, dates, `readingMinutes`.
5. **Générer la photo hero** OpenAI (§6) → `public/images/posts/{slug}.jpg`.
6. **Vérifier le build** avant de publier :
   ```bash
   npm install   # si besoin
   npm run build # échoue si le JSON ne respecte pas le schéma Zod
   ```
7. **Committer et pousser sur `main`** (Règle n°1) — message clair et descriptif.

---

## 8. Commandes utiles

```bash
npm run dev          # serveur local
npm run build        # build prod -> dist/ (valide le schéma de contenu)
npm run preview      # prévisualiser le build
npm run gen:images   # générer les images hero manquantes (gpt-image-2)
# Legacy (ne plus utiliser pour de nouveaux articles — texte désormais rédigé par Claude) :
npm run fetch:posts  # récupère métadonnées + images depuis WordPress (manifest)
npm run gen:content  # ancien pipeline texte gpt-5.6-terra
```

## 9. Repères de fichiers

- `src/content.config.ts` — schéma Zod du contenu (source de vérité des champs).
- `src/pages/[slug].astro` — rendu d'un article (hero, sommaire, prose, FAQ, JSON-LD,
  « À lire aussi »).
- `src/styles/prose.css` — **contrat de classes** des éléments riches du corps.
- `src/pages/themes/index.astro`, `src/pages/articles/index.astro` — index par thème
  et liste globale.
- `scripts/lib/images.mjs`, `scripts/lib/openai.mjs` — génération/optimisation des
  images (gpt-image-2 + sharp).
- `public/_redirects`, `public/_headers` — redirection www + cache/sécurité (Cloudflare).
