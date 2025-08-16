// server.js
const http = require('http');
const url = require('url');
const config = require('./config');
const { configureForm } = require('./templates/html');
const { 
  handleConfigureGet, 
  handleConfigurePost, 
  handleUserConfigureGet, 
  handleUserConfigurePost 
} = require('./routes/configure');
const { handleTestFtp, handleUserTestFtp } = require('./routes/ftp-test');
const {
  handleRootManifest,
  handleUserManifest,
  handleUserSubtitles,
  handleUserFileProxy
} = require('./routes/addon');
const { handleConnectDrive, handleConnectCallback } = require('./routes/gdrive');

/**
 * Create and configure the HTTP server
 * @returns {object} - HTTP server instance
 */
function createServer() {
  const server = http.createServer(async (req, res) => {
    // Global CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Debug logging (enable when needed)
    console.log(new Date().toISOString(), req.method, req.url);

    try {
      const u = url.parse(req.url, true);

      // ---- Configuration routes ----
      if (u.pathname === '/' || (u.pathname === '/configure' && req.method === 'GET')) {
        return handleConfigureGet(req, res);
      }
      
      if (u.pathname === '/configure' && req.method === 'POST') {
        return handleConfigurePost(req, res);
      }

      // Root-level: test FTP connection (for new configuration page)
      if (u.pathname === '/test-ftp' && req.method === 'POST') {
        return handleTestFtp(req, res);
      }

      // ---- User-specific instance routes: /u/<key>/... ----
      const m = u.pathname.match(/^\/u\/([a-f0-9]{16})(\/.*|$)/i);
      if (m) {
        const key = m[1].toLowerCase();

        // User-specific: configuration page (GET/POST)
        if (u.pathname === `/u/${key}/configure` && req.method === 'GET') {
          return handleUserConfigureGet(key, req, res);
        }
        
        if (u.pathname === `/u/${key}/configure` && req.method === 'POST') {
          return handleUserConfigurePost(key, req, res);
        }

        // User-specific: test FTP connection
        if (u.pathname === `/u/${key}/test-ftp` && req.method === 'POST') {
          return handleUserTestFtp(key, req, res);
        }

        if (u.pathname === `/u/${key}/connect-drive` && req.method === 'GET') {
          return handleConnectDrive(key, req, res, u.query);
        }

        if (u.pathname === `/u/${key}/google-callback` && req.method === 'GET') {
          return handleConnectCallback(key, req, res, u.query);
        }

        // a) FTP file proxy
        if (u.pathname.startsWith(`/u/${key}/file`)) {
          return handleUserFileProxy(key, u, req, res);
        }

        // b) manifest
        if (u.pathname === `/u/${key}/manifest.json`) {
          return handleUserManifest(key, req, res);
        }

        // c) subtitles
        if (u.pathname.includes(`/u/${key}/subtitles/`)) {
          return handleUserSubtitles(key, u, req, res);
        }

        // No match for this key's other paths
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      // ---- Root manifest (unconfigured guide) ----
      if (u.pathname === '/manifest.json') {
        return handleRootManifest(req, res);
      }

      // Other routes
      res.statusCode = 404;
      res.end('Not found');
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end('Internal error');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
