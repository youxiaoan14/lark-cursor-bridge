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

const tries = [
  { putStatus: 1 },
  { putStatus: 2 },
  { putStatus: [1] },
  { dataStatus: 2 },
  { adsStatus: 1 },
  { status: 1 },
  { enabled: true },
  { isPut: 1 },
];

for (const extra of tries) {
  const r = await api('/v1/material/materialList', {
    page: 1,
    pageSize: 10,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    type: 2,
    ...extra,
  });
  console.log(JSON.stringify(extra), '=> total', r.content?.total, 'code', r.code, r.message?.slice?.(0, 40));
  if (r.content?.list?.[0]) {
    const item = r.content.list[0];
    const spendKeys = Object.keys(item).filter(k => /spend|cost|消耗|metric|data|install|ctr/i.test(k));
    console.log('  extra keys', spendKeys.join(','));
    if (spendKeys.length) console.log(' ', spendKeys.map(k => [k, item[k]]));
  }
}

// materialList all apps - check if spend in response with different endpoint variant
const r2 = await api('/v1/material/materialList', {
  page: 1,
  pageSize: 3,
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  folderId: 78788,
});
console.log('\nfolder 78788 sample keys', Object.keys(r2.content?.list?.[0] || {}));

// Try effectInsight with full body from rank page
const ei = await api('/v1/material/effectInsight', {
  mid: 1036622,
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
});
console.log('\neffectInsight', ei.code, JSON.stringify(ei.content ?? ei).slice(0, 800));
