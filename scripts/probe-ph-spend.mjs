import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'miao-ads', 'config.json'), 'utf8'));
const ADS_BASE = 'https://dashboard-api.micoplatform.com/proxy/ads_svr';

async function api(method, urlPath, body) {
  const res = await fetch(`${ADS_BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'custom-header-appid': 'ads',
      authtoken: CONFIG.authtoken,
      app: CONFIG.app,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Try ranking / metrics endpoints
const probes = [
  ['POST', '/v1/material/materialList', { page: 1, pageSize: 5, sort: 'desc', sortBy: 'spend' }],
  ['POST', '/v1/material/materialList', { page: 1, pageSize: 5, regionCountries: [{ region: 'PH', countries: ['PH'] }] }],
  ['POST', '/v1/material/materialList', { page: 1, pageSize: 5, region: 'PH' }],
  ['POST', '/v1/publicAd/topCampaigns', {}],
  ['POST', '/v1/material/campaignMetrics', { mid: 1036622 }],
];

for (const [method, p, body] of probes) {
  const data = await api(method, p, body);
  console.log('\n===', p, JSON.stringify(body), '===');
  console.log(JSON.stringify(data, null, 2).slice(0, 3000));
}
