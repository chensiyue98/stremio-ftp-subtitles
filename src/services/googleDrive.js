// services/googleDrive.js
const { google } = require('googleapis');
const config = require('../config');
const { extnameLower } = require('../utils/helpers');
const { getCachedFileList, setCachedFileList } = require('../utils/storage');

function getOAuthClient(key) {
  const redirectUri = `${config.PUBLIC_URL}/u/${key}/drive/callback`;
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function generateAuthUrl(key) {
  const client = getOAuthClient(key);
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent',
  });
}

async function getTokens(key, code) {
  const client = getOAuthClient(key);
  const { tokens } = await client.getToken(code);
  return tokens;
}

function createDriveFileLister(key, cfg) {
  return async function listDriveSubtitleFiles() {
    const cacheKey = `${key}:drive`;
    const cached = getCachedFileList(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < config.CACHE_TTL_MS) {
      return cached.files;
    }

    const client = getOAuthClient(key);
    client.setCredentials(cfg.driveTokens);
    const drive = google.drive({ version: 'v3', auth: client });
    const results = [];

    async function walk(folderId, depth) {
      if (depth > config.MAX_DEPTH) return;
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType)',
        pageSize: 1000,
      });
      for (const f of res.data.files || []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          await walk(f.id, depth + 1);
        } else if (config.SUB_EXTS.includes(extnameLower(f.name))) {
          results.push({ id: f.id, name: f.name });
        }
      }
    }

    try {
      await walk(cfg.driveFolderId || 'root', 0);
    } catch (e) {
      console.error('[listDriveSubtitleFiles]', e.message || e);
    }

    setCachedFileList(cacheKey, { ts: now, files: results });
    return results;
  };
}

function createDriveFileDownloader(key, cfg) {
  return async function downloadFile(fileId, response) {
    const client = getOAuthClient(key);
    client.setCredentials(cfg.driveTokens);
    const drive = google.drive({ version: 'v3', auth: client });
    const r = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
      r.data.pipe(response).on('end', resolve).on('error', reject);
    });
  };
}

module.exports = {
  generateAuthUrl,
  getTokens,
  createDriveFileLister,
  createDriveFileDownloader,
};
