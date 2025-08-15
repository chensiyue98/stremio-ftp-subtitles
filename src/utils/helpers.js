// utils/helpers.js

/**
 * Get lowercase file extension from filename
 * @param {string} name - Filename
 * @returns {string} - File extension with dot, or empty string
 */
const extnameLower = (name) => {
  const m = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : '';
};

/**
 * Convert string to URL-friendly slug
 * @param {string} s - Input string
 * @returns {string} - Slugified string
 */
const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');

/**
 * Detect language from filename
 * @param {string} name - Filename
 * @returns {string} - Language code
 */
const detectLangFromFilename = (name) => {
  const n = String(name).toLowerCase();
  if (/\b(zh|chs|sc|chi|zho|cn|chinese)\b/.test(n)) return 'zh';
  if (/\b(zht|cht|tc)\b/.test(n)) return 'zh';
  if (/\b(en|eng|english)\b/.test(n)) return 'en';
  if (/\b(es|spa|spanish)\b/.test(n)) return 'es';
  if (/\b(fr|fre|fra|french)\b/.test(n)) return 'fr';
  if (/\b(de|ger|deu|german)\b/.test(n)) return 'de';
  if (/\b(pt|por|portuguese|pt-br)\b/.test(n)) return 'pt';
  if (/\b(ru|rus|russian)\b/.test(n)) return 'ru';
  return 'en';
};

/**
 * Build matching signals from metadata
 * @param {string} type - Content type (movie, series, other)
 * @param {string} id - Content ID
 * @param {object} meta - Metadata object
 * @returns {object} - Matching signals
 */
function buildMatchSignals(type, id, meta) {
  const s = {};
  if (meta?.name) s.titleSlug = slugify(meta.name);
  if (meta?.year) s.year = String(meta.year);
  if (type === 'series') {
    const parts = String(id).split(':');
    if (parts.length >= 3) {
      const S = String(parts[1]).padStart(2, '0');
      const E = String(parts[2]).padStart(2, '0');
      s.seTag = `s${S}e${E}`;
    }
  }
  return s;
}

/**
 * Score filename based on matching signals
 * @param {string} name - Filename
 * @param {object} sig - Matching signals
 * @returns {number} - Score
 */
function scoreByFilename(name, sig) {
  const n = slugify(name);
  let score = 0;
  if (sig.titleSlug && n.includes(sig.titleSlug)) score += 5;
  if (sig.year && n.includes(sig.year)) score += 2;
  if (sig.seTag && n.includes(sig.seTag)) score += 5;
  if (/\b(sub|subs|subtitle|chs|cht|eng|vost|繁|简)\b/.test(n)) score += 1;
  return score;
}

module.exports = {
  extnameLower,
  slugify,
  detectLangFromFilename,
  buildMatchSignals,
  scoreByFilename,
};
