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

const my = await api('/v1/metrics/myList', { from: 0 });
function walk(items, depth = 0) {
  for (const x of items ?? []) {
    const line = `${' '.repeat(depth)}${x.label ?? x.name} | value=${x.value} | id=${x.id}`;
    if (/消耗|spend|cost|install|cpi|ctr|展示|点击/i.test(line)) console.log(line);
    if (x.children?.length) walk(x.children, depth + 1);
  }
}
console.log('=== myList from:0 ===');
walk(my.content?.metrics);

const my3 = await api('/v1/metrics/myList', { from: 3 });
console.log('\n=== spend-related in from:3 ===');
walk(my3.content?.metrics);

// simpler rankList without sort
const tries = [
  { filtering: { regionCountries: [{ region: 'PH', countries: ['PH'] }] } },
  { filtering: { regionCountriesChinese: [{ region: '菲律宾区', countries: ['菲律宾'] }] } },
  { filtering: { regionCountries: [{ region: 'PH', countries: ['PH'] }], time: { beginTime: '2026-07-01', endTime: '2026-07-31' } } },
  { filtering: { regionCountries: [{ region: 'PH', countries: ['PH'] }], timeType: '7' } },
];

for (const t of tries) {
  const r = await api('/v1/material/rankList', { page: 1, pageSize: 10, ...t });
  console.log('\ntry', JSON.stringify(t.filtering).slice(0, 120), '=>', r.code, (r.message || '').slice(0, 60));
  if (r.code === 200) {
    console.log('total', r.content?.total);
    const item = r.content?.list?.[0];
    if (item) console.log('keys', Object.keys(item).join(','));
    break;
  }
}
