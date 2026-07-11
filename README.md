# Verron-laurent.com — Refonte 2027

Site statique de conseils pratiques, construit avec [Astro](https://astro.build).
Design animé et joyeux, palette 100% dérivée du logo (bleu électrique `#0054E4`,
navy `#000C3C`, pêche `#FCA86C`, bleu ciel `#90B4FC`).

## Stack

- **Astro 5** — génération statique (`dist/`)
- **Fontsource** — Fredoka (titres) + Plus Jakarta Sans (texte)
- **Sitemap + RSS** intégrés
- Contenu stocké en JSON dans `src/data/posts/` (collection de contenu Astro)

## Développement

```bash
npm install
npm run dev        # serveur local
npm run build      # build de production -> dist/
npm run preview    # prévisualiser le build
```

## Pipeline de contenu

Le contenu est régénéré depuis l'API REST WordPress de `www.verron-laurent.com`.
Les titres et les URL (`/{id}-{slug}/`) sont conservés à l'identique ; le contenu
est réécrit intégralement via l'API OpenAI (`gpt-5.6-terra`), et les images à la
une sont réutilisées si elles existent, sinon générées (`gpt-image-2`, ultra-réaliste).

```bash
# 1) Récupérer les métadonnées + images (manifest)
npm run fetch:posts

# 2) Générer le contenu (resumable ; saute ce qui existe déjà)
npm run gen:content -- --limit 30          # lot de validation
npm run gen:content -- --all               # tous les articles
npm run gen:content -- --slugs 2312-assurance-auto-voiture-societe
npm run gen:content -- --all --force       # forcer la régénération

# 3) (optionnel) Générer uniquement les images manquantes
npm run gen:images
```

Variables d'environnement requises : `OPENAI_API_KEY`.

## Déploiement (Cloudflare Pages)

- Branche de production : `main`
- Commande de build : `npm run build`
- Dossier de sortie : `dist`
- Répertoire racine : vide
- Le fichier `public/_redirects` gère la redirection `www` → apex.
- Le fichier `public/_headers` gère le cache et les en-têtes de sécurité.

Le contenu généré (`src/data/posts/*.json`) et les images (`public/images/posts/`)
sont versionnés : le build Cloudflare est donc 100% statique, sans appel API.
