// services/ftp.js
const FTP = require('basic-ftp');
const { FTP_TIMEOUT_MS, MAX_DEPTH, SUB_EXTS } = require('../config');
const { extnameLower } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');
const { getCachedFileList, setCachedFileList } = require('../utils/storage');

/**
 * Test FTP connection
 * @param {object} config - FTP configuration
 * @returns {Promise<object>} - Test result
 */
async function testFtpConnection({ ftpHost, ftpUser, ftpPass, ftpSecure, ftpBase }) {
  const client = new FTP.Client();
  client.ftp.verbose = false;

  const started = Date.now();
  const TIMEOUT_MS = 3000;
  let timedOut = false;
  const timer = setTimeout(() => { 
    timedOut = true; 
    try { client.close(); } catch (_) {} 
  }, TIMEOUT_MS);

  try {
    await client.access({
      host: String(ftpHost || '').trim(),
      user: String(ftpUser || 'anonymous'),
      password: String(ftpPass || ''),
      secure: !!ftpSecure,
    });
    const base = String(ftpBase || '/').trim() || '/';
    const list = await client.list(base);
    const sample = list.slice(0, 5).map(e => ({ 
      name: e.name, 
      dir: !!e.isDirectory 
    }));
    return { 
      ok: true, 
      elapsedMs: Date.now() - started, 
      base, 
      count: list.length, 
      sample 
    };
  } catch (e) {
    return { 
      ok: false, 
      elapsedMs: Date.now() - started, 
      error: timedOut ? 'timeout' : String(e.message || e) 
    };
  } finally {
    clearTimeout(timer);
    try { client.close(); } catch (_) {}
  }
}

/**
 * Create FTP file listing function for a specific configuration
 * @param {string} key - Configuration key
 * @param {object} cfg - FTP configuration
 * @returns {Function} - Function to list subtitle files
 */
function createFtpFileLister(key, cfg) {
  return async function listFtpSubtitleFiles() {
    // Check cache
    const cached = getCachedFileList(key);
    const now = Date.now();
    if (cached && now - cached.ts < require('../config').CACHE_TTL_MS) {
      return cached.files;
    }

    const client = new FTP.Client();
    client.ftp.verbose = false;

    const results = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { client.close(); } catch (_) {}
    }, FTP_TIMEOUT_MS);

    async function walk(dir, depth) {
      if (timedOut) return;
      if (depth > MAX_DEPTH) return;
      const entries = await client.list(dir);
      for (const e of entries) {
        if (timedOut) return;
        const full = (dir === '/' ? '' : dir) + '/' + e.name;
        if (e.isDirectory) {
          await walk(full, depth + 1);
        } else if (SUB_EXTS.includes(extnameLower(e.name))) {
          results.push({ path: full, name: e.name });
        }
      }
    }

    try {
      await client.access({
        host: cfg.ftpHost,
        user: cfg.ftpUser,
        password: cfg.ftpPass,
        secure: !!cfg.ftpSecure,
      });
      await walk(cfg.ftpBase, 0);
    } catch (e) {
      console.error('[listFtpSubtitleFiles]', e.message || e);
    } finally {
      clearTimeout(timer);
      try { client.close(); } catch (_) {}
    }

    setCachedFileList(key, { ts: now, files: results });
    return results;
  };
}

/**
 * Create FTP file downloader for a specific configuration
 * @param {object} cfg - FTP configuration
 * @returns {Function} - Function to download files
 */
function createFtpFileDownloader(cfg) {
  return async function downloadFile(filePath, response) {
    const client = new FTP.Client();
    client.ftp.verbose = false;
    try {
      await client.access({
        host: cfg.ftpHost,
        user: cfg.ftpUser,
        password: cfg.ftpPass,
        secure: !!cfg.ftpSecure,
      });
      await client.downloadTo(response, String(filePath));
    } catch (e) {
      console.error('FTP download error:', e.message || e);
      throw e;
    } finally {
      try { client.close(); } catch (_) {}
    }
  };
}

module.exports = {
  testFtpConnection,
  createFtpFileLister,
  createFtpFileDownloader,
};
