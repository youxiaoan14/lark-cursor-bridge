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

const accounts = await api('/v1/account/listAll', {});
const phAcc = (accounts.content?.list ?? []).filter(a => /PH|菲律宾|Philippines/i.test(a.name));
console.log('PH accounts:', phAcc.length);
for (const a of phAcc.slice(0, 15)) console.log('-', a.id, a.name);

const fl = await api('/v1/filtering/rankList', { from: 0 });
console.log('\nrankList filter options sample:', JSON.stringify(fl.content?.list?.slice?.(0, 2), null, 2).slice(0, 1500));

// Try rank with PH account ids
if (phAcc.length) {
  const ids = phAcc.map(a => a.id);
  for (const time of [
    { beginTime: '2026-07-01', endTime: '2026-07-31' },
    { beginTime: '2026-06-01', endTime: '2026-07-31' },
  ]) {
    const r = await api('/v1/material/rankList', {
      page: 1,
      pageSize: 30,
      filtering: {
        time,
        accountIds: ids.slice(0, 20),
        regionCountries: [{ region: 'PH', countries: ['PH'] }],
      },
    });
    console.log(`\nPH accounts ${time.beginTime} count`, r.content?.list?.length ?? 0, 'content keys', Object.keys(r.content || {}));
    if (r.content?.list?.length) {
      const sorted = [...r.content.list].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
      for (const item of sorted.slice(0, 10)) {
        console.log(`spend=${item.spend} installs=${item.installs} ctr=${item.ctr} | ${item.materialName}`);
      }
      break;
    }
  }
}

// effectInsight on a known PH creative
const mats = await api('/v1/material/materialList', {
  page: 1,
  pageSize: 20,
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  type: 2,
});
console.log('\nmaterialList PH videos', mats.content?.total);
const ids = (mats.content?.list ?? []).map(m => m.id).slice(0, 5);
for (const mid of ids) {
  const ei = await api('/v1/material/effectInsight', { mid });
  console.log(`effectInsight mid=${mid} code=${ei.code}`, JSON.stringify(ei.content).slice(0, 300));
}
