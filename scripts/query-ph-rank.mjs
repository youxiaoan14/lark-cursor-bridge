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

// 1. Get available metrics
const metrics = await api('/v1/metrics/myList', { from: 0 });
console.log('=== Metrics (from:0) ===');
for (const m of metrics.content?.metrics ?? []) {
  if (/spend|cost|消耗|install|cpi|ctr/i.test(m.label + m.value + m.name)) {
    console.log(JSON.stringify({ id: m.id, label: m.label, value: m.value, name: m.name }));
  }
}

// 2. Try rankList with PH filter, sorted by spend
const spendMetric = (metrics.content?.metrics ?? []).find(
  (m) => m.value === 'spend' || m.label?.includes('消耗') || m.name === 'spend',
);

const rankBody = {
  page: 1,
  pageSize: 20,
  filtering: {
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
    timeType: 7,
    metricSort: spendMetric?.value ?? 'spend',
    metricSortBy: 2,
    materialType: [2],
  },
};

console.log('\n=== rankList request ===');
console.log(JSON.stringify(rankBody, null, 2));

const rank = await api('/v1/material/rankList', rankBody);
console.log('\n=== rankList response code ===', rank.code, rank.message);

if (rank.code === 200) {
  const list = rank.content?.list ?? [];
  console.log('total:', rank.content?.total);
  for (const item of list.slice(0, 15)) {
    const spend = item.spend ?? item.metrics?.spend ?? item['消耗'] ?? Object.entries(item).find(([k]) => /spend|消耗|cost/i.test(k))?.[1];
    console.log('---');
    console.log('name:', item.materialName ?? item.name);
    console.log('mid:', item.mid ?? item.materialId);
    console.log('theme:', item.theme ?? item.materialTheme);
    console.log('spend/raw:', spend ?? JSON.stringify(item).slice(0, 300));
  }
} else {
  console.log(JSON.stringify(rank, null, 2).slice(0, 2000));
}
