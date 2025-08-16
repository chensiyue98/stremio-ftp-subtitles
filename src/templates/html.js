// templates/html.js
const { PUBLIC_URL } = require('../config');

/**
 * Base HTML page template
 * @param {string} html - HTML content
 * @returns {string} - Complete HTML page
 */
function page(html) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FTP Subtitles 配置</title>
<style>
body{font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;max-width:780px}
input,button{font:inherit} .row{margin:8px 0} label{display:block;margin-bottom:4px}
input[type=text],input[type=password]{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px}
button{padding:10px 16px;border:0;border-radius:10px;background:#4f46e5;color:#fff;cursor:pointer}
.card{border:1px solid #eee;border-radius:12px;padding:16px;margin:16px 0}
code{background:#f5f5f5;border-radius:6px;padding:2px 6px}
a.button{display:inline-block;background:#10b981;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none}
.small{color:#666;font-size:13px}
.tooltip{position:relative;display:inline-block;cursor:help}
.tooltip .tooltiptext{visibility:hidden;width:300px;background-color:#333;color:#fff;text-align:left;border-radius:8px;padding:12px;position:absolute;z-index:1;bottom:125%;left:50%;margin-left:-150px;opacity:0;transition:opacity 0.3s;font-size:13px;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
.tooltip .tooltiptext::after{content:"";position:absolute;top:100%;left:50%;margin-left:-5px;border-width:5px;border-style:solid;border-color:#333 transparent transparent transparent}
.tooltip:hover .tooltiptext{visibility:visible;opacity:1}
</style>
${html}`;
}

/**
 * Configuration form template
 * @param {object} prefill - Prefill values
 * @param {string} action - Form action URL
 * @returns {string} - HTML form
 */
function configureForm(prefill = {}, action = '/configure') {
  const keyMatch = action.match(/\/u\/([a-f0-9]{16})\/configure/i);
  const key = keyMatch ? keyMatch[1] : null;
  return page(`
  <h1>FTP Subtitles · 配置
    <span class="tooltip">🔒
      <span class="tooltiptext">
        <strong>数据安全保护</strong><br>
        • FTP 凭据使用 AES-256-GCM 加密存储<br>
        • 每个用户的配置完全独立隔离<br>
        • 服务器不会记录或传输您的密码<br>
        • 所有敏感数据都经过加密持久化存储<br>
        • 支持 FTPS 安全连接协议
      </span>
    </span>
  </h1>
  <form method="POST" action="${action}">
    <div class="row"><label>FTP Host</label><input name="ftpHost" type="text" required value="${prefill.ftpHost ?? ''}"></div>
    <div class="row"><label>FTP User</label><input name="ftpUser" type="text" required value="${prefill.ftpUser ?? ''}"></div>
    <div class="row"><label>FTP Password</label><input name="ftpPass" type="password" value="${prefill.ftpPass ?? ''}"></div>
    <div class="row"><label><input type="checkbox" name="ftpSecure" ${prefill.ftpSecure ? 'checked' : ''}> 使用 FTPS（安全连接）</label></div>
    <div class="row"><label>字幕根目录（如 /subtitles）</label><input name="ftpBase" type="text" required value="${prefill.ftpBase ?? '/subtitles'}"></div>
    <div class="row"><label>Google Drive Folder ID</label><input name="gdriveFolderId" type="text" value="${prefill.gdriveFolderId ?? ''}"></div>
    ${key ? `<div class="row"><a class="button" style="background:#4285f4" href="/u/${key}/connect-drive?folderId=${prefill.gdriveFolderId ?? ''}">${prefill.gdriveTokens ? '重新连接 Google Drive' : 'Connect to Google Drive'}</a></div>` : ''}
    <div class="row">
      <button type="submit">保存</button>
      <button type="button" id="testBtn" style="margin-left:8px;background:#0ea5e9;color:#fff;border-radius:10px;padding:10px 16px;">测试连接</button>
    </div>
  </form>
  <div id="testBox" class="card small">点击"测试连接"验证 FTP 参数（3 秒超时）。</div>
  
  <div class="card" style="background:#f0fdf4;border:1px solid #22c55e;">
    <div style="color:#166534;font-weight:bold;margin-bottom:8px;">🔒 数据安全保护</div>
    <div class="small" style="color:#166534;">
      您的 FTP 凭据和配置信息都经过 <strong>AES-256-GCM 军用级加密</strong> 存储，确保最高级别的数据安全。
      每个用户的配置完全独立，服务器不会记录或传输您的密码信息。
    </div>
  </div>
  
  <div class="card small">
    保存后你可以在 Stremio 中使用：<br>
    <code>${PUBLIC_URL}/u/&lt;key&gt;/manifest.json</code>
  </div>
  
  <div class="card" style="background:#fff3cd;border:1px solid #ffd700;text-align:center;">
    <div style="margin-bottom:8px;">☕ 喜欢这个项目？</div>
    <a href="https://buymeacoffee.com/chensiyue98" target="_blank" rel="noopener" style="display:inline-block;background:#ffdd00;color:#000;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;box-shadow:0 2px 8px rgba(255,221,0,0.3);">
      💖 Buy me a coffee
    </a>
    <div class="small" style="margin-top:8px;color:#856404;">您的支持是我持续开发的动力！</div>
  </div>

  <script>
  (function(){
    const form = document.querySelector('form');
    const btn = document.getElementById('testBtn');
    const box = document.getElementById('testBox');

    function endpointFromAction(action) {
      return action && action.startsWith('/u/') ? action.replace('/configure','/test-ftp') : '/test-ftp';
    }

    btn.addEventListener('click', async () => {
      const payload = {
        ftpHost: form.ftpHost.value.trim(),
        ftpUser: form.ftpUser.value.trim(),
        ftpPass: form.ftpPass.value,
        ftpSecure: form.ftpSecure.checked,
        ftpBase: form.ftpBase.value.trim() || '/'
      };
      if (!payload.ftpHost) { box.textContent = '请输入 FTP Host'; return; }

      const ep = endpointFromAction(form.getAttribute('action') || '/configure');
      box.textContent = '测试中…';
      try {
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json();
        if (j.ok) {
          const names = (j.sample || []).map(x => x.dir ? (x.name + '/') : x.name).join(', ');
          box.innerHTML = '✅ 连接成功（' + j.elapsedMs + ' ms）。目录 <code>' + (j.base || '/') +
            '</code> 共 ' + j.count + ' 项；示例：' + (names || '—');
        } else {
          box.innerHTML = '❌ 连接失败：' + (j.error || 'unknown') + '（' + (j.elapsedMs ?? '-') + ' ms）';
        }
      } catch (e) {
        box.textContent = '❌ 请求失败：' + e;
      }
    });
  })();
  </script>
  `);
}

/**
 * Configuration success page template
 * @param {string} key - Configuration key
 * @returns {string} - HTML success page
 */
function configuredOkPage(key) {
  const manifestUrl = `${PUBLIC_URL}/u/${key}/manifest.json`;
  const stremioInstall = `stremio://${encodeURIComponent(manifestUrl)}`;
  return page(`
  <h1>配置完成 ✅</h1>
  <div class="card">
    <div class="row">专属安装地址：</div>
    <div class="row"><code>${manifestUrl}</code></div>
    <div class="row">
      <a class="button" href="${manifestUrl}" target="_blank" rel="noopener">打开 manifest.json</a>
      <a class="button" href="${stremioInstall}">用 Stremio 安装</a>
    </div>
    <p class="small"><a href="/u/${key}/configure">编辑此配置</a></p>
  </div>
  
  <div class="card" style="background:#f0f9ff;border:1px solid #0ea5e9;text-align:center;">
    <div style="margin-bottom:8px;">🎉 配置成功！喜欢这个项目吗？</div>
    <a href="https://buymeacoffee.com/chensiyue98" target="_blank" rel="noopener" style="display:inline-block;background:#ffdd00;color:#000;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;box-shadow:0 2px 8px rgba(255,221,0,0.3);">
      ☕ Buy me a coffee
    </a>
    <div class="small" style="margin-top:8px;color:#0369a1;">感谢您的支持，让开源项目更好！</div>
  </div>
  
  <p><a href="/configure">返回新建其它配置</a></p>
  `);
}

module.exports = {
  page,
  configureForm,
  configuredOkPage,
};
