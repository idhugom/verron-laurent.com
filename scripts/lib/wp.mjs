// Accès à l'API REST WordPress de verron-laurent.com (source des posts).
import { fetchJson, stripHtml, decodeEntities, withRetry } from './util.mjs';

export const WP_BASE = 'https://www.verron-laurent.com/wp-json/wp/v2';
const UA = { 'User-Agent': 'verron-laurent-static-migrator/1.0' };

/** Récupère tous les posts (métadonnées essentielles) en paginant. */
export async function fetchAllPosts() {
  const out = [];
  let page = 1;
  while (true) {
    const url = `${WP_BASE}/posts?per_page=100&page=${page}&_fields=id,slug,title,date,modified,featured_media,link,excerpt`;
    const data = await withRetry(() => fetchJson(url, { headers: UA }), { label: `posts p${page}` });
    if (!Array.isArray(data) || data.length === 0) break;
    for (const p of data) {
      out.push({
        id: p.id,
        slug: p.slug,
        title: stripHtml(p.title?.rendered || ''),
        date: p.date,
        modified: p.modified,
        link: p.link,
        excerpt: stripHtml(p.excerpt?.rendered || ''),
        featuredMediaId: p.featured_media || 0,
      });
    }
    if (data.length < 100) break;
    page++;
  }
  return out;
}

/** Récupère les URLs/alt des médias par lots d'IDs. */
export async function fetchMediaMap(ids) {
  const map = new Map();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const url = `${WP_BASE}/media?include=${batch.join(',')}&per_page=100&_fields=id,source_url,alt_text,mime_type,media_details`;
    const data = await withRetry(() => fetchJson(url, { headers: UA }), { label: `media ${i}` });
    for (const m of data) {
      map.set(m.id, {
        url: m.source_url,
        alt: decodeEntities(m.alt_text || ''),
        mime: m.mime_type,
      });
    }
  }
  return map;
}
