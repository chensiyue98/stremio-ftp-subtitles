// config.js
module.exports = {
  // Environment configuration
  PORT: Number(process.env.PORT) || 7777,
  PUBLIC_URL: process.env.PUBLIC_URL || `http://127.0.0.1:${Number(process.env.PORT) || 7777}`,

  // File extensions and cache settings
  SUB_EXTS: ['.srt', '.vtt', '.ass', '.ssa', '.sub'],
  CACHE_TTL_MS: 60 * 1000,           // Directory cache 60 seconds
  CINEMETA_TIMEOUT_MS: 1500,         // Cinemeta 1.5s
  SUBTITLES_TOTAL_TIMEOUT_MS: 2500,  // Subtitles total timeout 2.5s

  // Addon metadata
  ADDON_VERSION: '1.3.3',
  ADDON_ID_PREFIX: 'org.example.gdrive-subs',
  ADDON_NAME: 'Google Drive Subtitles',
  ADDON_DESCRIPTION: '从你配置的 Google Drive 文件夹自动匹配字幕',
};
