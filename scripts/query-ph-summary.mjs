import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'miao-ads', 'config.json'), 'utf8'));
const ADS_BASE = 'https://dashboard-api.micoplatform.com/proxy/ads_svr';

async function api(urlPath, body) {
  const res = await fetch(`${ADS_BASE}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'custom-header-appid': 'ads',
      authtoken: CONFIG.authtoken,
      app: CONFIG.app,
    },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

// Running creatives globally
for (const ps of [1, 2, 3, 4, 5]) {
  const r = await api('/v1/material/materialList', { page: 1, pageSize: 5, putStatus: ps, type: 2 });
  console.log('putStatus', ps, 'total', r.content?.total);
}

// Rank without region - all running?
const rank = await api('/v1/material/rankList', {
  page: 1,
  pageSize: 20,
  filtering: {
    time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
    creativeSetting: { materialTypesFilter: ['2'] },
  },
});
console.log('\nrank all videos', JSON.stringify(rank.content).slice(0, 300));

// Search material by PH in name across all
let phNamed = [];
for (let page = 1; page <= 10; page++) {
  const r = await api('/v1/material/materialList', { page, pageSize: 100, type: 2 });
  const batch = (r.content?.list ?? []).filter(m => /-PH-|#PH-|菲律宾/i.test(m.name));
  phNamed.push(...batch);
  if (!r.content?.list?.length) break;
}
console.log('\nPH-named videos total scan:', phNamed.length);

// Group by theme
const byTheme = {};
for (const m of phNamed) {
  const t = m.theme || 'unknown';
  byTheme[t] = (byTheme[t] || 0) + 1;
}
console.log('themes', Object.entries(byTheme).sort((a,b)=>b[1]-a[1]).slice(0, 15));

// Recent uploads
phNamed.sort((a,b) => b.createTime - a.createTime);
console.log('\nRecent PH videos (library, no spend API):');
for (const m of phNamed.slice(0, 8)) {
  console.log(`- ${m.name}`);
  console.log(`  theme=${m.theme} id=${m.id} folder=${m.folderName}`);
}
