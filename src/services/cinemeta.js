// services/cinemeta.js
const { CINEMETA_TIMEOUT_MS } = require('../config');

/**
 * Fetch metadata from Cinemeta with timeout
 * @param {string} type - Content type (movie, series, other)
 * @param {string} id - Content ID
 * @returns {Promise<object|null>} - Metadata object or null
 */
async function getCinemeta(type, id) {
  const baseId = String(id).split(':')[0];
  const metaUrl = `https://v3-cinemeta.strem.io/meta/${type}/${baseId}.json`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CINEMETA_TIMEOUT_MS);

  try {
    const r = await fetch(metaUrl, {
      headers: { 'user-agent': 'gdrive-subs-addon' },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.meta ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  getCinemeta,
};
