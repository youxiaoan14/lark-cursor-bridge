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

const ranges = [
  { beginTime: '2026-07-24', endTime: '2026-07-31' },
  { beginTime: '2026-07-01', endTime: '2026-07-31' },
  { beginTime: '2026-06-01', endTime: '2026-07-31' },
  { beginTime: '2025-07-01', endTime: '2026-07-31' },
];

for (const time of ranges) {
  const r = await api('/v1/material/rankList', {
    page: 1,
    pageSize: 20,
    filtering: {
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
      time,
    },
  });
  const n = r.content?.list?.length ?? 0;
  console.log(`${time.beginTime}~${time.endTime} => code=${r.code} count=${n} total=${r.content?.total}`);
  if (n > 0) {
    const sorted = [...r.content.list].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    for (const item of sorted.slice(0, 8)) {
      console.log(`  spend=${item.spend} installs=${item.installs} ctr=${item.ctr} | ${item.materialName}`);
    }
    break;
  }
}

// try without region filter
const r2 = await api('/v1/material/rankList', {
  page: 1,
  pageSize: 5,
  filtering: { time: { beginTime: '2026-07-01', endTime: '2026-07-31' } },
});
console.log('\nno region filter count=', r2.content?.list?.length);

// filtering config
const cfg = await api('/v1/filtering/config', { from: 0 });
console.log('\nfilter config time options:', JSON.stringify(cfg.content?.timeType ?? cfg.content?.list?.slice?.(0,3), null, 2).slice(0, 800));
