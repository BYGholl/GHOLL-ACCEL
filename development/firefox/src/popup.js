const $ = (id) => document.getElementById(id);

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function send(type) {
  const tab = await activeTab();
  if (!tab || !tab.id || !/^https?:\/\/(www\.)?youtube\.com|^https?:\/\/.*\.youtube\.com|^https?:\/\/(www\.)?youtube-nocookie\.com/.test(tab.url || '')) {
    return { ok: false, error: 'YouTube sekmesi değil' };
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { app: 'GHOLL_ACCEL', type });
  } catch (error) {
    return { ok: false, error: 'Content script hazır değil. Sayfayı yenile.' };
  }
}

async function refresh() {
  const res = await send('status');
  $('status').textContent = res.ok ? res.status : res.error;
  $('speed').textContent = res.ok ? `${Number(res.speed || 1).toFixed(3)}x` : '-';
  $('target').textContent = res.ok ? `${Number(res.target || 1).toFixed(3)}x` : '-';
}

$('toggleActive').addEventListener('click', async () => { await send('toggle-active'); refresh(); });
$('togglePanel').addEventListener('click', async () => { await send('toggle-panel'); refresh(); });
$('resetRamp').addEventListener('click', async () => { await send('reset-ramp'); refresh(); });
$('panic').addEventListener('click', async () => { await send('panic'); refresh(); });

document.addEventListener('DOMContentLoaded', refresh);
setInterval(refresh, 900);
