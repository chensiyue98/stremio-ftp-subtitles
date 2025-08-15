// utils/storage.js

// In-memory storage (for demo purposes; production should use DB/Redis)
const CONFIGS = new Map();    // key -> { ftpHost, ftpUser, ftpPass, ftpSecure, ftpBase }
const RUNTIMES = new Map();   // key -> { manifest, getSubtitles, cfg }
const LIST_CACHE = new Map(); // key -> { ts, files } directory list cache

/**
 * Get configuration for a key
 * @param {string} key - Configuration key
 * @returns {object|undefined} - Configuration object
 */
function getConfig(key) {
  return CONFIGS.get(key);
}

/**
 * Set configuration for a key
 * @param {string} key - Configuration key
 * @param {object} config - Configuration object
 */
function setConfig(key, config) {
  CONFIGS.set(key, config);
}

/**
 * Get runtime for a key
 * @param {string} key - Runtime key
 * @returns {object|undefined} - Runtime object
 */
function getRuntime(key) {
  return RUNTIMES.get(key);
}

/**
 * Set runtime for a key
 * @param {string} key - Runtime key
 * @param {object} runtime - Runtime object
 */
function setRuntime(key, runtime) {
  RUNTIMES.set(key, runtime);
}

/**
 * Check if runtime exists for a key
 * @param {string} key - Runtime key
 * @returns {boolean} - Whether runtime exists
 */
function hasRuntime(key) {
  return RUNTIMES.has(key);
}

/**
 * Get cached file list for a key
 * @param {string} key - Cache key
 * @returns {object|undefined} - Cached data
 */
function getCachedFileList(key) {
  return LIST_CACHE.get(key);
}

/**
 * Set cached file list for a key
 * @param {string} key - Cache key
 * @param {object} data - Cache data
 */
function setCachedFileList(key, data) {
  LIST_CACHE.set(key, data);
}

module.exports = {
  getConfig,
  setConfig,
  getRuntime,
  setRuntime,
  hasRuntime,
  getCachedFileList,
  setCachedFileList,
};
