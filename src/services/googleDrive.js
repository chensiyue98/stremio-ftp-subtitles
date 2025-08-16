const { google } = require('googleapis');
const { SUB_EXTS } = require('../config');
const { extnameLower } = require('../utils/helpers');

function createClient(tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(tokens);
  return google.drive({ version: 'v3', auth: oauth2Client });
}

function createDriveFileLister(key, cfg) {
  return async function listDriveSubtitleFiles() {
    if (!cfg.gdriveTokens || !cfg.gdriveFolderId) return [];
    try {
      const drive = createClient(cfg.gdriveTokens);
      const res = await drive.files.list({
        q: `'${cfg.gdriveFolderId}' in parents and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 1000,
      });
      const files = res.data.files || [];
      return files
        .filter((f) => SUB_EXTS.includes(extnameLower(f.name)))
        .map((f) => ({ path: f.id, name: f.name, drive: true }));
    } catch (e) {
      console.error('Google Drive list error:', e.message || e);
      return [];
    }
  };
}

function createDriveFileDownloader(cfg) {
  return async function downloadDriveFile(fileId, response) {
    if (!cfg.gdriveTokens) throw new Error('No Google Drive tokens');
    const drive = createClient(cfg.gdriveTokens);
    const r = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
      r.data.on('end', resolve);
      r.data.on('error', reject);
      r.data.pipe(response);
    });
  };
}

module.exports = { createDriveFileLister, createDriveFileDownloader };
