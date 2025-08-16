const { google } = require('googleapis');
const { getConfig, setConfig } = require('../utils/storage');
const { page } = require('../templates/html');
const addonConfig = require('../config');

function createOAuthClient(key) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${addonConfig.PUBLIC_URL}/u/${key}/google-callback`
  );
}

function handleConnectDrive(key, req, res, query) {
  const cfg = getConfig(key);
  if (!cfg) {
    res.statusCode = 404;
    res.end('Config not found');
    return;
  }
  const client = createOAuthClient(key);
  const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: query.folderId || cfg.gdriveFolderId || ''
  });
  res.writeHead(302, { Location: url });
  res.end();
}

async function handleConnectCallback(key, req, res, query) {
  const client = createOAuthClient(key);
  const code = query.code;
  if (!code) {
    res.statusCode = 400;
    res.end('Missing code');
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    const cfg = getConfig(key) || {};
    cfg.gdriveTokens = tokens;
    if (query.state) cfg.gdriveFolderId = query.state;
    setConfig(key, cfg);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(page('<h1>Google Drive connected</h1><p>You can close this page.</p>'));
  } catch (e) {
    res.statusCode = 500;
    res.end('Auth failed');
  }
}

module.exports = { handleConnectDrive, handleConnectCallback };
