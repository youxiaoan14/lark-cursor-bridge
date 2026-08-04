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

const paths = [
  '/v1/material/materialRank',
  '/v1/material/rankList',
  '/v1/material/creativeRank',
  '/v1/material/spendRank',
  '/v1/material/materialRankList',
  '/v1/report/materialRank',
  '/v1/data/materialRank',
  '/v1/publicAd/materialRank',
  '/v1/publicAd/creativeRank',
  '/v1/publicAd/topMaterials',
  '/v1/publicAd/topCreatives',
  '/v1/material/boardList',
  '/v1/material/dataBoard',
];

for (const p of paths) {
  const data = await api(p, { region: 'PH', page: 1, pageSize: 10 });
  if (data.code !== 404 && !String(data.msg || data.message || '').includes('404')) {
    console.log(p, data.code, (data.message || data.msg || '').slice(0, 80));
    if (data.code === 200) console.log(JSON.stringify(data.content ?? data.data, null, 2).slice(0, 1500));
  }
}

// metrics list for field names
const metrics = await api('/v1/metrics/list', {});
console.log('\nmetrics sample keys:', JSON.stringify(metrics.content?.list?.slice?.(0, 5) ?? metrics.content, null, 2).slice(0, 2000));

// adsTrends with region
const trends = await api('/v1/publicAd/adsTrends', { region: 'PH' });
console.log('\nadsTrends:', JSON.stringify(trends, null, 2).slice(0, 2000));

// accountOverview
const overview = await api('/v1/publicAd/accountOverview', { region: 'PH' });
console.log('\naccountOverview:', JSON.stringify(overview, null, 2).slice(0, 2000));
