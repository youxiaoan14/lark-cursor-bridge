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

// Any rank data at all?
const wide = await api('/v1/material/rankList', {
  page: 1,
  pageSize: 5,
  filtering: { time: { beginTime: '2025-01-01', endTime: '2026-07-31' } },
});
console.log('wide range rank', JSON.stringify(wide).slice(0, 500));

const top = await api('/v1/publicAd/topCampaigns', {
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
});
console.log('\ntopCampaigns PH', JSON.stringify(top.content).slice(0, 800));

const sugg = await api('/v1/publicAd/suggestedCampaigns', {
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\nsuggestedCampaigns', JSON.stringify(sugg.content).slice(0, 800));

// Workbench suggested campaigns
const wb = await api('/v1/publicAd/myAdPlansOverview', {
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\nmyAdPlansOverview', JSON.stringify(wb.content).slice(0, 800));

// Check enabled PH materials with sync
const mats = await api('/v1/material/materialList', {
  page: 1,
  pageSize: 100,
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  type: 2,
});
const withSync = (mats.content?.list ?? []).filter(m => m.syncFBList?.length || m.enabled);
console.log('\nPH videos with sync/enabled:', withSync.length);
for (const m of withSync.slice(0, 5)) {
  console.log('-', m.name, 'enabled', m.enabled, 'sync', m.syncFBList?.length);
}

// Try rankList response structure when code 200 empty - maybe data in another field
const r = await api('/v1/material/rankList', {
  page: 1,
  pageSize: 50,
  filtering: {
    time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
  },
});
console.log('\nfull rank response keys', Object.keys(r));
console.log('full content', JSON.stringify(r.content));
console.log('message', r.message);
