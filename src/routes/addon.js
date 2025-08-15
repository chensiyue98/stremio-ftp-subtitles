// routes/addon.js
const url = require('url');
const querystring = require('querystring');
const config = require('../config');
const { getRuntime, setRuntime } = require('../utils/storage');
const { createAddonRuntimeForKey } = require('../services/addon');
const { createFtpFileDownloader } = require('../services/ftp');

/**
 * Handle GET /manifest.json (root manifest)
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleRootManifest(req, res) {
  const manifest = {
    id: config.ADDON_ID_PREFIX,
    version: config.ADDON_VERSION,
    name: `${config.ADDON_NAME} (未配置)`,
    description: '请先打开 /configure 填写你的 FTP 参数并安装专属链接',
    resources: ['subtitles'],
    types: ['movie', 'series', 'other'],
    catalogs: [],
    behaviorHints: { configurable: true, configurationRequired: true },
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(manifest));
}

/**
 * Handle user-specific GET /u/{key}/manifest.json
 * @param {string} key - Configuration key
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleUserManifest(key, req, res) {
  const rt = getRuntime(key) || setRuntime(key, createAddonRuntimeForKey(key)).get?.(key) || getRuntime(key);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(rt.manifest));
}

/**
 * Handle user-specific subtitles requests
 * @param {string} key - Configuration key
 * @param {object} parsedUrl - Parsed URL object
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
async function handleUserSubtitles(key, parsedUrl, req, res) {
  const rt = getRuntime(key) || setRuntime(key, createAddonRuntimeForKey(key)).get?.(key) || getRuntime(key);
  
  // Match subtitles pattern: /subtitles/(type)/(id + optional /extras)
  const sm =
    parsedUrl.pathname.match(new RegExp(`^/u/${key}/subtitles/(movie|series|other)/(.+?)\\.json/?$`)) ||
    parsedUrl.pathname.match(new RegExp(`^/u/${key}/subtitles/(movie|series|other)/(.+?)/?$`));

  if (!sm) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const type = sm[1];
  const idAndExtras = sm[2]; // e.g., "tt8367814" or "tt8367814/videoHash=...&videoSize=..."
  const [rawId, ...rest] = idAndExtras.split('/');
  const id = decodeURIComponent(rawId);
  const extrasStr = rest.join('/');
  const extras = extrasStr ? querystring.parse(extrasStr) : {};

  const payload = await rt.getSubtitles(type, id, extras);

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/**
 * Handle user-specific file proxy requests
 * @param {string} key - Configuration key
 * @param {object} parsedUrl - Parsed URL object
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
async function handleUserFileProxy(key, parsedUrl, req, res) {
  const rt = getRuntime(key) || setRuntime(key, createAddonRuntimeForKey(key)).get?.(key) || getRuntime(key);
  
  const filePath = parsedUrl.query.path;
  const ext = String(parsedUrl.query.ext || '').toLowerCase();
  const name = String(parsedUrl.query.name || 'subtitle').replace(/[/\\]/g, '');

  if (!filePath || String(filePath).includes('..')) {
    res.statusCode = 400;
    res.end('Bad path');
    return;
  }

  // Content-Type (try to enable inline preview)
  if (ext === '.vtt') {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }

  // Content-Disposition: explicit filename + RFC5987, avoid browser saving as "file"
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const downloadFile = createFtpFileDownloader(rt.cfg);
  try {
    await downloadFile(filePath, res);
  } catch (e) {
    console.error('FTP proxy error:', e.message || e);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.statusCode = 502;
    res.end('FTP proxy error');
  }
}

module.exports = {
  handleRootManifest,
  handleUserManifest,
  handleUserSubtitles,
  handleUserFileProxy,
};
