// Helpers OpenAI : génération de contenu (gpt-5.6-terra via Responses API)
// et génération d'images ultra-réalistes (gpt-image-2).
import { withRetry } from './util.mjs';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('❌ OPENAI_API_KEY manquant dans l\'environnement.');
  process.exit(1);
}

const AUTH = {
  Authorization: `Bearer ${OPENAI_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Appelle gpt-5.6-terra (Responses API) et renvoie un objet JSON validé par schéma.
 * Params demandés : reasoning high / mode standard / verbosity high.
 */
export async function generateStructured({
  instructions,
  input,
  schema,
  schemaName = 'article',
  maxOutputTokens = 22000,
  label = '',
}) {
  return withRetry(
    async () => {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          instructions,
          input,
          reasoning: { effort: 'high', mode: 'standard' },
          text: {
            verbosity: 'high',
            format: {
              type: 'json_schema',
              name: schemaName,
              strict: true,
              schema,
            },
          },
          max_output_tokens: maxOutputTokens,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const e = new Error(`OpenAI ${res.status} — ${body.slice(0, 300)}`);
        e.status = res.status;
        throw e;
      }

      const data = await res.json();

      if (data.status === 'incomplete') {
        const reason = data.incomplete_details?.reason || 'inconnu';
        const e = new Error(`réponse incomplète (${reason})`);
        e.status = 500; // force retry
        throw e;
      }

      const text = extractOutputText(data);
      if (!text) throw Object.assign(new Error('sortie vide'), { status: 500 });

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        throw Object.assign(new Error(`JSON invalide: ${err.message}`), { status: 500 });
      }
      return { data: parsed, usage: data.usage };
    },
    { tries: 5, base: 2000, label }
  );
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
      }
    }
  }
  return parts.join('').trim();
}

/**
 * Génère une image ultra-réaliste avec gpt-image-2 et renvoie un Buffer PNG/JPEG.
 * Paramètres imposés : size 1536x1024, quality medium.
 */
export async function generateImage({ prompt, label = '' }) {
  return withRetry(
    async () => {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt,
          size: '1536x1024',
          quality: 'medium',
          n: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const e = new Error(`OpenAI image ${res.status} — ${body.slice(0, 300)}`);
        e.status = res.status;
        throw e;
      }
      const data = await res.json();
      const item = data.data?.[0];
      if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
      if (item?.url) {
        const img = await fetch(item.url);
        return Buffer.from(await img.arrayBuffer());
      }
      throw Object.assign(new Error('aucune image renvoyée'), { status: 500 });
    },
    { tries: 4, base: 3000, label }
  );
}
