// Utilitaires partagés (aucune dépendance externe).

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Limiteur de concurrence minimaliste. */
export function pLimit(concurrency) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ocirc: 'ô',
  euro: '€',
  deg: '°',
  times: '×',
  middot: '·',
  bull: '•',
  copy: '©',
};

/** Décode les entités HTML (numériques + nommées courantes). */
export function decodeEntities(str = '') {
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => (name in NAMED ? NAMED[name] : m));
}

/** Retire les balises HTML puis décode. */
export function stripHtml(html = '') {
  return decodeEntities(
    String(html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Estime le temps de lecture (200 mots/min). */
export function readingMinutes(html = '') {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 200));
}

/** Retry avec backoff exponentiel. */
export async function withRetry(fn, { tries = 5, base = 1500, label = '' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = base * Math.pow(2, i) + Math.floor(Math.random() * 400);
      const status = err?.status ? ` [${err.status}]` : '';
      console.warn(`  ↻ retry ${i + 1}/${tries}${status} ${label} — ${err.message} (attente ${wait}ms)`);
      // 4xx non-429 : inutile de réessayer
      if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 429) throw err;
      await sleep(wait);
    }
  }
  throw lastErr;
}

/** fetch JSON avec gestion d'erreur explicite. */
export async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const e = new Error(`HTTP ${res.status} sur ${url} — ${body.slice(0, 180)}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}
