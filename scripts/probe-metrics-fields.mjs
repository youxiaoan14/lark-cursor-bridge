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
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 200) }; }
}

const tries = [
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], needMetrics: true }],
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], withMetrics: true }],
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], showData: true }],
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], dataStatus: 1 }],
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], sortBy: 1, sort: 2 }],
  ['/v1/material/materialList', { page: 1, pageSize: 3, regionCountries: [{ region: 'PH', countries: ['PH'] }], type: 2 }],
  ['/v1/filtering/getUserSetting', {}],
  ['/v1/filtering/favorites', {}],
];

for (const [p, body] of tries) {
  const data = await api(p, body);
  const item = data.content?.list?.[0];
  const keys = item ? Object.keys(item) : [];
  console.log('\n', p, body, '=>', data.code, keys.join(','));
  if (item?.spend || item?.cost || item?.metrics || item?.data) {
    console.log('METRICS FOUND', JSON.stringify(item, null, 2).slice(0, 1000));
  }
}

// campaignMetrics with adsStatus variants
for (const st of [0, 1, 2, 3, 'active', 'running']) {
  const r = await api('/v1/material/campaignMetrics', { mid: 1036622, adsStatus: st });
  console.log('metrics adsStatus', st, '=>', r.code, r.content?.list?.length ?? r.content);
}
