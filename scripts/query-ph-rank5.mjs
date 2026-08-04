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

const time = { beginTime: '2026-07-01', endTime: '2026-07-31' };
const base = {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time,
};

const sortTries = [
  { metricSort: 37, metricSortBy: { value: 2, label: '降序' } },
  { metricSort: 37, metricSortBy: { value: 1, label: '升序' } },
  { metricSort: '37', metricSortBy: { value: 2, label: '降序' } },
  { metricSort: { id: 37, value: 'spend', label: '消耗' }, metricSortBy: { value: 2, label: '降序' } },
];

for (const sort of sortTries) {
  const r = await api('/v1/material/rankList', {
    page: 1,
    pageSize: 20,
    filtering: { ...base, ...sort },
  });
  console.log('try', JSON.stringify(sort), '=>', r.code, (r.message || '').slice(0, 80));
  if (r.code === 200) {
    const list = r.content?.list ?? [];
    console.log('total', r.content?.total, 'returned', list.length);
    for (const item of list.slice(0, 10)) {
      const metrics = {};
      for (const k of ['spend', 'installs', 'ctr', 'cpi', 'impressions', 'clicks']) {
        if (item[k] != null) metrics[k] = item[k];
      }
      console.log(`- ${item.materialName ?? item.name}`);
      console.log(`  mid=${item.mid} theme=${item.theme ?? ''} metrics=${JSON.stringify(metrics)}`);
    }
    break;
  }
}

// If sort fails, fetch unsorted and sort client-side
const plain = await api('/v1/material/rankList', {
  page: 1,
  pageSize: 50,
  filtering: base,
});
if (plain.code === 200) {
  const list = plain.content?.list ?? [];
  console.log('\n=== unsorted, client sort by spend ===');
  console.log('total', plain.content?.total, 'returned', list.length);
  console.log('first item keys:', list[0] ? Object.keys(list[0]).join(',') : 'none');
  if (list[0]) console.log(JSON.stringify(list[0], null, 2).slice(0, 1200));
  const sorted = [...list].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
  for (const item of sorted.slice(0, 10)) {
    console.log(`- spend=${item.spend} | ${item.materialName ?? item.name} | mid=${item.mid}`);
  }
}
