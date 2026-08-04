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

for (const from of [0, 3, 8]) {
  const m = await api('/v1/metrics/list', { from });
  console.log(`\nfrom=${from} count=`, m.content?.list?.length ?? m.content?.metrics?.length);
  const items = m.content?.list ?? m.content?.metrics ?? [];
  for (const x of items.slice(0, 5)) console.log(' ', x.label ?? x.name, x.value ?? x.id);
  for (const x of items) {
    if (/消耗|spend|cost/i.test((x.label ?? '') + (x.value ?? '') + (x.name ?? ''))) {
      console.log(' SPEND METRIC:', JSON.stringify(x));
    }
  }
}

const tries = [
  { metricSortBy: 'desc' },
  { metricSortBy: 'asc' },
  { metricSortBy: { value: 2 } },
  { metricSortBy: { label: '降序', value: 2 } },
  {},
];

for (const extra of tries) {
  const body = {
    page: 1,
    pageSize: 10,
    filtering: {
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
      timeType: 7,
      metricSort: 'spend',
      ...extra,
    },
  };
  const r = await api('/v1/material/rankList', body);
  console.log('\ntry metricSortBy=', extra.metricSortBy, '=>', r.code, r.message?.slice?.(0, 80));
  if (r.code === 200) {
    console.log('SUCCESS total', r.content?.total);
    console.log(JSON.stringify(r.content?.list?.[0], null, 2).slice(0, 800));
    break;
  }
}
