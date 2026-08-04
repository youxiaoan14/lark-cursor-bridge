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

const sortTries = [
  { metricSort: 'spend', metricSortBy: { value: '2', label: '降序' } },
  { metricSort: 'spend', metricSortBy: { value: '1', label: '升序' } },
  { metricSort: 'spend', metricSortBy: { id: 37, value: 'spend', label: '消耗' } },
];

for (const sort of sortTries) {
  const r = await api('/v1/material/rankList', {
    page: 1,
    pageSize: 20,
    filtering: {
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
      time,
      ...sort,
    },
  });
  console.log('sort try', sort.metricSortBy?.value, '=>', r.code, r.message?.slice?.(0, 50));
  if (r.code === 200) {
    const list = r.content?.list ?? [];
    console.log('count', list.length, 'total', r.content?.total);
    console.log('sample keys', list[0] ? Object.keys(list[0]).join(',') : 'empty');
    for (const item of list.slice(0, 10)) {
      console.log('---');
      console.log('rank/name:', item.materialName ?? item.name);
      console.log('mid:', item.mid);
      console.log('theme:', item.theme ?? item.materialTheme);
      console.log('spend:', item.spend);
      console.log('installs:', item.installs);
      console.log('ctr:', item.ctr);
      console.log('cpi:', item.cpi);
    }
    break;
  }
}
