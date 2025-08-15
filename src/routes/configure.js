// routes/configure.js
const crypto = require('crypto');
const querystring = require('querystring');
const { setConfig, setRuntime, hasRuntime } = require('../utils/storage');
const { configureForm, configuredOkPage } = require('../templates/html');
const { createAddonRuntimeForKey } = require('../services/addon');

/**
 * Handle GET /configure
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleConfigureGet(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(configureForm());
}

/**
 * Handle POST /configure
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleConfigurePost(req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const data = querystring.parse(body);
    const key = crypto.randomBytes(8).toString('hex');
    const cfg = {
      ftpHost: String(data.ftpHost || '').trim(),
      ftpUser: String(data.ftpUser || '').trim(),
      ftpPass: String(data.ftpPass || ''),
      ftpSecure: !!data.ftpSecure,
      ftpBase: String(data.ftpBase || '/subtitles').trim() || '/subtitles',
    };
    setConfig(key, cfg);
    if (!hasRuntime(key)) {
      setRuntime(key, createAddonRuntimeForKey(key));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(configuredOkPage(key));
  });
}

/**
 * Handle user-specific GET /u/{key}/configure
 * @param {string} key - Configuration key
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleUserConfigureGet(key, req, res) {
  const { getConfig } = require('../utils/storage');
  const prefill = getConfig(key) || {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(configureForm(prefill, `/u/${key}/configure`));
}

/**
 * Handle user-specific POST /u/{key}/configure
 * @param {string} key - Configuration key
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
function handleUserConfigurePost(key, req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const data = querystring.parse(body);
    const cfg = {
      ftpHost: String(data.ftpHost || '').trim(),
      ftpUser: String(data.ftpUser || '').trim(),
      ftpPass: String(data.ftpPass || ''),
      ftpSecure: !!data.ftpSecure,
      ftpBase: String(data.ftpBase || '/subtitles').trim() || '/subtitles',
    };
    setConfig(key, cfg);
    // Rebuild runtime for this key (to apply new config immediately)
    setRuntime(key, createAddonRuntimeForKey(key));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(configuredOkPage(key));
  });
}

module.exports = {
  handleConfigureGet,
  handleConfigurePost,
  handleUserConfigureGet,
  handleUserConfigurePost,
};
