// services/addon.js
const crypto = require('crypto');
const config = require('../config');
const { buildMatchSignals, scoreByFilename, detectLangFromFilename, extnameLower } = require('../utils/helpers');
const { getConfig } = require('../utils/storage');
const { getCinemeta } = require('./cinemeta');
const { createFtpFileLister } = require('./ftp');

/**
 * Create addon runtime for a specific key
 * @param {string} key - Configuration key
 * @returns {object} - Runtime object with manifest and getSubtitles function
 */
function createAddonRuntimeForKey(key) {
  const cfg = getConfig(key);
  if (!cfg) throw new Error('Config missing');

  const manifest = {
    id: `${config.ADDON_ID_PREFIX}.${key}`,
    version: config.ADDON_VERSION,
    name: config.ADDON_NAME,
    description: config.ADDON_DESCRIPTION,
    resources: ['subtitles'],
    types: ['movie', 'series', 'other'],
    catalogs: [],
    behaviorHints: { configurable: true, configurationRequired: false },
  };

  const listFtpSubtitleFiles = createFtpFileLister(key, cfg);

  async function getSubtitles(type, id /*, extras */) {
    const work = (async () => {
      let meta = null;
      try { 
        meta = await getCinemeta(type, id); 
      } catch (_) {}
      
      const sig = buildMatchSignals(type, id, meta);
      const files = await listFtpSubtitleFiles();

      // Score and fallback
      const scored = files.map((f) => ({ 
        ...f, 
        score: scoreByFilename(f.name, sig) 
      }));
      
      let picked = scored
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
      
      if (picked.length === 0) {
        picked = scored.slice(0, 12); // Fallback to first 12 if no matches
      }

      const subtitles = picked.map((f) => {
        const idHash = crypto.createHash('md5').update(f.path).digest('hex');
        const ext = extnameLower(f.name);
        const urlToFile = `${config.PUBLIC_URL}/u/${key}/file?path=${encodeURIComponent(
          f.path
        )}&ext=${encodeURIComponent(ext)}&name=${encodeURIComponent(f.name)}`;
        
        return {
          id: idHash,
          url: urlToFile,
          lang: detectLangFromFilename(f.name),
          title: `FTP · ${f.name}`,
          name: `FTP · ${f.name}`,
        };
      });

      return { subtitles, cacheMaxAge: 3600 };
    })();

    // Overall 2.5 second fallback
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ subtitles: [], cacheMaxAge: 30 }), config.SUBTITLES_TOTAL_TIMEOUT_MS)
    );

    try {
      return await Promise.race([work, timeout]);
    } catch (e) {
      console.error('[getSubtitles]', e.message || e);
      return { subtitles: [], cacheMaxAge: 30 };
    }
  }

  return { manifest, getSubtitles, cfg };
}

module.exports = {
  createAddonRuntimeForKey,
};
