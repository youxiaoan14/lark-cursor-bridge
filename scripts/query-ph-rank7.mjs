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

const cfg = await api('/v1/filtering/config', { from: 0 });
console.log('config keys', Object.keys(cfg.content || {}));
console.log(JSON.stringify(cfg.content, null, 2).slice(0, 2500));

const regions = await api('/v1/system/payRegionList', {});
console.log('\nPH region:', JSON.stringify(regions.content?.list?.filter(r => /PH|菲律宾/i.test(JSON.stringify(r))).slice(0,3), null, 2));

const tries = [
  {
    filtering: {
      timeType: 7,
      time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
    },
  },
  {
    filtering: {
      time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
      basicSetting: { region: ['PH'] },
    },
  },
  {
    filtering: {
      time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
      channel: [1, 2, 3],
    },
  },
];

for (const t of tries) {
  const r = await api('/v1/material/rankList', { page: 1, pageSize: 10, ...t });
  console.log('\ntry', JSON.stringify(t.filtering).slice(0, 150));
  console.log('=>', r.code, 'count', r.content?.list?.length, 'keys', r.content ? Object.keys(r.content) : []);
  if (r.content?.list?.length) {
    console.log(JSON.stringify(r.content.list[0], null, 2).slice(0, 1000));
    break;
  }
}

// insight API
const ins = await api('/v1/material/insightMetrics', {});
console.log('\ninsightMetrics', JSON.stringify(ins.content, null, 2).slice(0, 500));

const ins2 = await api('/v1/material/insight', {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\ninsight', ins2.code, JSON.stringify(ins2.content, null, 2).slice(0, 800));
