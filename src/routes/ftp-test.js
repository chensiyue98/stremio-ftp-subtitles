// routes/ftp-test.js
const { testFtpConnection } = require('../services/ftp');
const { getConfig } = require('../utils/storage');

/**
 * Handle POST /test-ftp
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleTestFtp(req, res) {
  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');
      const result = await testFtpConnection(data);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result));
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
    }
  });
}

/**
 * Handle user-specific POST /u/{key}/test-ftp
 * @param {string} key - Configuration key
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleUserTestFtp(key, req, res) {
  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', async () => {
    let data = {};
    try { 
      data = JSON.parse(body || '{}'); 
    } catch (_) {}
    
    const cfg = getConfig(key) || {};
    const payload = {
      ftpHost: data.ftpHost ?? cfg.ftpHost,
      ftpUser: data.ftpUser ?? cfg.ftpUser,
      ftpPass: data.ftpPass ?? cfg.ftpPass,
      ftpSecure: data.ftpSecure ?? cfg.ftpSecure,
      ftpBase: data.ftpBase ?? cfg.ftpBase,
    };
    
    const result = await testFtpConnection(payload);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
  });
}

module.exports = {
  handleTestFtp,
  handleUserTestFtp,
};
