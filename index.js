// index.js
/* eslint-disable no-console */
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const querystring = require('querystring');
const FTP = require('basic-ftp');

// Initialize storage with error handling
let storage;
try {
  console.log('🔐 Initializing secure storage...');
  storage = require('./src/utils/storage');
  console.log('✅ Storage initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize storage:', error.message);
  console.error('💡 Please check your ENCRYPTION_KEY environment variable');
  console.error('📖 See ENCRYPTION_SETUP.md for detailed setup instructions');
  process.exit(1);
}

// Import HTML templates
const { page, configureForm, configuredOkPage } = require('./src/templates/html');

// ====== 环境配置 ======
const PORT = Number(process.env.PORT) || 7777;
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;

// ====== 运行时存储（重启后重建）======
const RUNTIMES = new Map();   // key -> { manifest, getSubtitles, cfg }

// Cleanup cache every 5 minutes
setInterval(() => storage.cleanup(), 5 * 60 * 1000);

// ====== 常量与工具 ======
const SUB_EXTS = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
const CACHE_TTL_MS = 60 * 1000;           // 目录缓存 60 秒
const FTP_TIMEOUT_MS = 3500;              // 目录遍历超时 3.5 秒
const MAX_DEPTH = 2;                      // 最多递归 2 层
const CINEMETA_TIMEOUT_MS = 1500;         // Cinemeta 1.5s
const SUBTITLES_TOTAL_TIMEOUT_MS = 2500;  // subtitles 总超时 2.5s

const extnameLower = (name) => {
  const m = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : '';
};

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');

const detectLangFromFilename = (name) => {
  const n = String(name).toLowerCase();
  if (/\b(zh|chs|sc|chi|zho|cn|chinese)\b/.test(n)) return 'zh';
  if (/\b(zht|cht|tc)\b/.test(n)) return 'zh';
  if (/\b(en|eng|english)\b/.test(n)) return 'en';
  if (/\b(es|spa|spanish)\b/.test(n)) return 'es';
  if (/\b(fr|fre|fra|french)\b/.test(n)) return 'fr';
  if (/\b(de|ger|deu|german)\b/.test(n)) return 'de';
  if (/\b(pt|por|portuguese|pt-br)\b/.test(n)) return 'pt';
  if (/\b(ru|rus|russian)\b/.test(n)) return 'ru';
  return 'en';
};

// 带超时的 Cinemeta
async function getCinemeta(type, id) {
  const baseId = String(id).split(':')[0];
  const metaUrl = `https://v3-cinemeta.strem.io/meta/${type}/${baseId}.json`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CINEMETA_TIMEOUT_MS);

  try {
    const r = await fetch(metaUrl, {
      headers: { 'user-agent': 'ftp-subs-addon' },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.meta ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function buildMatchSignals(type, id, meta) {
  const s = {};
  if (meta?.name) s.titleSlug = slugify(meta.name);
  if (meta?.year) s.year = String(meta.year);
  if (type === 'series') {
    const parts = String(id).split(':');
    if (parts.length >= 3) {
      const S = String(parts[1]).padStart(2, '0');
      const E = String(parts[2]).padStart(2, '0');
      s.seTag = `s${S}e${E}`;
    }
  }
  return s;
}

function scoreByFilename(name, sig) {
  const n = slugify(name);
  let score = 0;
  if (sig.titleSlug && n.includes(sig.titleSlug)) score += 5;
  if (sig.year && n.includes(sig.year)) score += 2;
  if (sig.seTag && n.includes(sig.seTag)) score += 5;
  if (/\b(sub|subs|subtitle|chs|cht|eng|vost|繁|简)\b/.test(n)) score += 1;
  return score;
}

// —— FTP 连接测试工具函数 —— 
async function testFtpConnection({ ftpHost, ftpUser, ftpPass, ftpSecure, ftpBase }) {
  const client = new FTP.Client();
  client.ftp.verbose = false;

  const started = Date.now();
  const TIMEOUT_MS = 3000;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { client.close(); } catch (_) {} }, TIMEOUT_MS);

  try {
    await client.access({
      host: String(ftpHost || '').trim(),
      user: String(ftpUser || 'anonymous'),
      password: String(ftpPass || ''),
      secure: !!ftpSecure,
    });
    const base = String(ftpBase || '/').trim() || '/';
    const list = await client.list(base);
    const sample = list.slice(0, 5).map(e => ({ name: e.name, dir: !!e.isDirectory }));
    return { ok: true, elapsedMs: Date.now() - started, base, count: list.length, sample };
  } catch (e) {
    return { ok: false, elapsedMs: Date.now() - started, error: timedOut ? 'timeout' : String(e.message || e) };
  } finally {
    clearTimeout(timer);
    try { client.close(); } catch (_) {}
  }
}


// ====== 为某个 key 构建运行时（manifest + handler）======
function createAddonRuntimeForKey(key) {
  const cfg = storage.getConfig(key);
  if (!cfg) throw new Error('Config missing');

  const manifest = {
    id: `org.example.ftp-subs.${key}`,
    version: '1.3.3',
    name: 'FTP Subtitles',
    description: '从你配置的 FTP 目录自动匹配字幕',
    resources: ['subtitles'],
    types: ['movie', 'series', 'other'], // 支持本地/其它来源
    // 不设置 idPrefixes，接受所有 id
    catalogs: [],
    behaviorHints: { configurable: true, configurationRequired: false },
  };

  async function listFtpSubtitleFiles() {
    // 缓存命中
    const cached = storage.getCache(key);
    if (cached && cached.files) return cached.files;

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

    storage.setCache(key, { files: results });
    return results;
  }

  async function getSubtitles(type, id /*, extras */) {
    const work = (async () => {
      let meta = null;
      try { meta = await getCinemeta(type, id); } catch (_) {}
      const sig = buildMatchSignals(type, id, meta);
      const files = await listFtpSubtitleFiles();

      // 评分并兜底
      const scored = files.map((f) => ({ ...f, score: scoreByFilename(f.name, sig) }));
      let picked = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
      if (picked.length === 0) picked = scored.slice(0, 12); // 无匹配时，兜底给前 12 个

      const subtitles = picked.map((f) => {
        const idHash = crypto.createHash('md5').update(f.path).digest('hex');
        const ext = extnameLower(f.name);
        const urlToFile = `${PUBLIC_URL}/u/${key}/file?path=${encodeURIComponent(
          f.path
        )}&ext=${encodeURIComponent(ext)}&name=${encodeURIComponent(f.name)}`;
        const lang = detectLangFromFilename(f.name);
        const subtitleName = `${f.name} [${lang.toUpperCase()}]`;
        return {
          id: idHash,
          url: urlToFile,
          lang: lang,
          title: subtitleName,
          name: subtitleName,
        };
      });

      return { subtitles, cacheMaxAge: 3600 };
    })();

    // 总体 2.5 秒兜底
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ subtitles: [], cacheMaxAge: 30 }), SUBTITLES_TOTAL_TIMEOUT_MS)
    );

    try {
      return await Promise.race([work, timeout]);
    } catch (e) {
      console.error('[getSubtitles]', e.message || e);
      return { subtitles: [], cacheMaxAge: 30 };
    }
  }

  return { manifest, getSubtitles, cfg };
}

// ====== HTTP 服务器 ======
const server = http.createServer(async (req, res) => {
  // 全局 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 调试：需要时打开
  console.log(new Date().toISOString(), req.method, req.url);

  try {
    const u = url.parse(req.url, true);

    // ---- 配置页 ----
    if (u.pathname === '/' || (u.pathname === '/configure' && req.method === 'GET')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(configureForm());
      return;
    }
    if (u.pathname === '/configure' && req.method === 'POST') {
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
        storage.setConfig(key, cfg);
        if (!RUNTIMES.has(key)) RUNTIMES.set(key, createAddonRuntimeForKey(key));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(configuredOkPage(key));
      });
      return;
    }

    // 根级：测试 FTP 连接（新建配置页使用）
    if (u.pathname === '/test-ftp' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => body += c);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const out = await testFtpConnection(data);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(out));
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
        }
      });
      return;
    }

    // ---- 个性化实例：/u/<key>/... ----
    const m = u.pathname.match(/^\/u\/([a-f0-9]{16})(\/.*|$)/i);
    if (m) {
      const key = m[1].toLowerCase();
      const rt = RUNTIMES.get(key) || RUNTIMES.set(key, createAddonRuntimeForKey(key)).get(key);

      // 用户专属：配置页（GET/POST）
      if (u.pathname === `/u/${key}/configure` && req.method === 'GET') {
        const prefill = storage.getConfig(key) || {};
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(configureForm(prefill, `/u/${key}/configure`));
        return;
      }
      if (u.pathname === `/u/${key}/configure` && req.method === 'POST') {
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
          storage.setConfig(key, cfg);
          // 重新构建该 key 的运行时（使新配置立即生效）
          RUNTIMES.set(key, createAddonRuntimeForKey(key));

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(configuredOkPage(key));
        });
        return;
      }

      // 用户专属：测试 FTP 连接
      if (u.pathname === `/u/${key}/test-ftp` && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => body += c);
        req.on('end', async () => {
          let data = {};
          try { data = JSON.parse(body || '{}'); } catch (_) {}
          const cfg = storage.getConfig(key) || {};
          const payload = {
            ftpHost: data.ftpHost ?? cfg.ftpHost,
            ftpUser: data.ftpUser ?? cfg.ftpUser,
            ftpPass: data.ftpPass ?? cfg.ftpPass,
            ftpSecure: data.ftpSecure ?? cfg.ftpSecure,
            ftpBase: data.ftpBase ?? cfg.ftpBase,
          };
          const out = await testFtpConnection(payload);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(out));
        });
        return;
      }

      // a) 代理 FTP 文件
      if (u.pathname.startsWith(`/u/${key}/file`)) {
        const filePath = u.query.path;
        const ext = String(u.query.ext || '').toLowerCase();
        const name = String(u.query.name || 'subtitle').replace(/[/\\]/g, '');

        if (!filePath || String(filePath).includes('..')) {
          res.statusCode = 400;
          res.end('Bad path');
          return;
        }

        // Content-Type（尽量可内联预览）
        if (ext === '.vtt') res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        else res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        // Content-Disposition：显式文件名 + RFC5987，避免浏览器保存为 "file"
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (req.method === 'HEAD') {
          res.statusCode = 200;
          res.end();
          return;
        }

        const client = new FTP.Client();
        client.ftp.verbose = false;
        try {
          await client.access({
            host: rt.cfg.ftpHost,
            user: rt.cfg.ftpUser,
            password: rt.cfg.ftpPass,
            secure: !!rt.cfg.ftpSecure,
          });
          await client.downloadTo(res, String(filePath));
        } catch (e) {
          console.error('FTP proxy error:', e.message || e);
          if (!res.headersSent) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.statusCode = 502;
          res.end('FTP proxy error');
        } finally {
          try { client.close(); } catch (_) {}
        }
        return;
      }

      // b) manifest
      if (u.pathname === `/u/${key}/manifest.json`) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(rt.manifest));
        return;
      }

      // c) subtitles：支持 带/不带 .json、尾随斜杠、以及 id 后跟 /<extras>
      // 例：/subtitles/movie/tt8367814/videoHash=...&videoSize=....json
      // 捕获 (type), (id + 可选 /extras)
      const sm =
        u.pathname.match(new RegExp(`^/u/${key}/subtitles/(movie|series|other)/(.+?)\\.json/?$`)) ||
        u.pathname.match(new RegExp(`^/u/${key}/subtitles/(movie|series|other)/(.+?)/?$`));

      if (sm) {
        const type = sm[1];
        const idAndExtras = sm[2]; // 形如 "tt8367814" 或 "tt8367814/videoHash=...&videoSize=..."
        const [rawId, ...rest] = idAndExtras.split('/');
        const id = decodeURIComponent(rawId);
        const extrasStr = rest.join('/'); // 通常是一个段
        const extras = extrasStr ? querystring.parse(extrasStr) : {};

        const payload = await rt.getSubtitles(type, id, extras);

        if (req.method === 'HEAD') {
          res.statusCode = 200;
          res.end();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
        return;
      }

      // 未命中该 key 的其它路径
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    // ---- 根 manifest（未配置引导）----
    if (u.pathname === '/manifest.json') {
      const manifest = {
        id: 'org.example.ftp-subs',
        version: '1.3.3',
        name: 'FTP Subtitles (未配置)',
        description: '请先打开 /configure 填写你的 FTP 参数并安装专属链接',
        resources: ['subtitles'],
        types: ['movie', 'series', 'other'],
        catalogs: [],
        behaviorHints: { configurable: true, configurationRequired: true },
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(manifest));
      return;
    }

    // 其它
    res.statusCode = 404;
    res.end('Not found');
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end('Internal error');
  }
});

server.listen(PORT, () => {
  console.log(`Server on ${PUBLIC_URL}`);
  console.log(`Configure at ${PUBLIC_URL}/configure`);
});
