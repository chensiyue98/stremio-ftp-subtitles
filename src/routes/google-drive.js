// routes/google-drive.js
const { getRuntime, setRuntime, getConfig, setConfig } = require('../utils/storage');
const { createAddonRuntimeForKey } = require('../services/addon');
const { generateAuthUrl, getTokens, createDriveFileDownloader } = require('../services/googleDrive');

function handleDriveConnect(key, req, res) {
  try {
    const authUrl = generateAuthUrl(key);
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (e) {
    res.statusCode = 500;
    res.end('Google Drive auth not configured');
  }
}

async function handleDriveCallback(key, req, res, parsedUrl) {
  const code = parsedUrl.query.code;
  if (!code) {
    res.statusCode = 400;
    res.end('Missing code');
    return;
  }
  try {
    const tokens = await getTokens(key, code);
    const cfg = getConfig(key) || {};
    cfg.driveTokens = tokens;
    setConfig(key, cfg);
    res.writeHead(302, { Location: `/u/${key}/configure` });
    res.end();
  } catch (e) {
    console.error('Drive auth error:', e.message || e);
    res.statusCode = 500;
    res.end('Drive auth error');
  }
}

async function handleUserDriveFileProxy(key, parsedUrl, req, res) {
  const rt = getRuntime(key) || setRuntime(key, createAddonRuntimeForKey(key)).get?.(key) || getRuntime(key);
  const fileId = parsedUrl.query.id;
  const ext = String(parsedUrl.query.ext || '').toLowerCase();
  const name = String(parsedUrl.query.name || 'subtitle').replace(/[\/\\]/g, '');
  if (!fileId) {
    res.statusCode = 400;
    res.end('Missing id');
    return;
  }
  if (ext === '.vtt') res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
  else res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }
  const downloadFile = createDriveFileDownloader(key, rt.cfg);
  try {
    await downloadFile(fileId, res);
  } catch (e) {
    console.error('Drive proxy error:', e.message || e);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.statusCode = 502;
    res.end('Drive proxy error');
  }
}

module.exports = {
  handleDriveConnect,
  handleDriveCallback,
  handleUserDriveFileProxy,
};
