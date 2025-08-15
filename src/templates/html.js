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
  return page(`
  <h1>FTP Subtitles · 配置</h1>
  <form method="POST" action="${action}">
    <div class="row"><label>FTP Host</label><input name="ftpHost" type="text" required value="${prefill.ftpHost ?? ''}"></div>
    <div class="row"><label>FTP User</label><input name="ftpUser" type="text" required value="${prefill.ftpUser ?? ''}"></div>
    <div class="row"><label>FTP Password</label><input name="ftpPass" type="password" value="${prefill.ftpPass ?? ''}"></div>
    <div class="row"><label><input type="checkbox" name="ftpSecure" ${prefill.ftpSecure ? 'checked' : ''}> 使用 FTPS（安全连接）</label></div>
    <div class="row"><label>字幕根目录（如 /subtitles）</label><input name="ftpBase" type="text" required value="${prefill.ftpBase ?? '/subtitles'}"></div>
    <div class="row">
      <button type="submit">保存</button>
      <button type="button" id="testBtn" style="margin-left:8px;background:#0ea5e9;color:#fff;border-radius:10px;padding:10px 16px;">测试连接</button>
    </div>
  </form>
  <div id="testBox" class="card small">点击"测试连接"验证 FTP 参数（3 秒超时）。</div>
  <div class="card small">
    保存后你可以在 Stremio 中使用：<br>
    <code>${PUBLIC_URL}/u/&lt;key&gt;/manifest.json</code>
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
  <p><a href="/configure">返回新建其它配置</a></p>
  `);
}

module.exports = {
  page,
  configureForm,
  configuredOkPage,
};
