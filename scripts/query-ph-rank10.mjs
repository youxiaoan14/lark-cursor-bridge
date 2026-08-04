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
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { code: -1, raw: text.slice(0, 200) }; }
}

const time = { beginTime: '2026-07-01', endTime: '2026-07-31' };

const filterTries = [
  {
    time,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    basicSetting: { channelsFilter: ['1'] },
  },
  {
    time,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    basicSetting: { channelsFilter: ['1', '3'] },
  },
  {
    time,
    basicSetting: { channelsFilter: ['1'] },
    inNameId: [{ type: 1, condition: 2, keyword: 'PH' }],
  },
  {
    time,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    creativeSetting: { materialTypesFilter: ['2'] },
  },
];

for (const filtering of filterTries) {
  const r = await api('/v1/material/rankList', { page: 1, pageSize: 30, filtering });
  const n = r.content?.list?.length ?? 0;
  console.log('filter', JSON.stringify(filtering).slice(0, 120), '=>', n, 'items');
  if (n) {
    const sorted = [...r.content.list].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    for (const item of sorted.slice(0, 10)) {
      console.log(`  spend=${item.spend} installs=${item.installs} ctr=${item.ctr} cpi=${item.cpi} | ${item.materialName}`);
    }
    break;
  }
}

// Paginate materialList PH videos and batch check names with PH
let all = [];
for (let page = 1; page <= 5; page++) {
  const r = await api('/v1/material/materialList', {
    page,
    pageSize: 100,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    type: 2,
  });
  all.push(...(r.content?.list ?? []));
  if (all.length >= r.content?.total || !(r.content?.list?.length)) break;
}
console.log(`\nPH videos in library: ${all.length}`);

// For each video try campaignMetrics with various adsStatus
const sample = all.slice(0, 15);
for (const m of sample) {
  for (const st of [undefined, 1, 2, '1', '2', 'ACTIVE', 'active']) {
    const body = { mid: String(m.id) };
    if (st !== undefined) body.adsStatus = st;
    const r = await api('/v1/material/campaignMetrics', body);
    if (r.content?.list?.length) {
      const totalSpend = r.content.list.reduce((s, x) => s + (Number(x.spend) || 0), 0);
      console.log(`mid=${m.id} adsStatus=${st} channels=${r.content.list.length} spend=${totalSpend} name=${m.name}`);
      break;
    }
  }
}
