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

const saved = await api('/v1/filtering/myRankList', { from: 0 });
console.log('saved rank filters:', JSON.stringify(saved.content?.list?.map(x => ({ name: x.name, filtering: x.filtering })), null, 2).slice(0, 2000));

const accounts = await api('/v1/account/listAll', {});
console.log('\naccounts count', accounts.content?.list?.length);
const phAccounts = (accounts.content?.list ?? []).filter(a => /PH|菲律宾|HeeSay|heesay/i.test(JSON.stringify(a)));
console.log('ph/heesay accounts sample:', JSON.stringify(phAccounts.slice(0, 3), null, 2));

// If saved filter exists, use first one
const firstFilter = saved.content?.list?.[0];
if (firstFilter?.filtering) {
  const r = await api('/v1/material/rankList', {
    page: 1,
    pageSize: 20,
    filtering: firstFilter.filtering,
  });
  console.log('\nusing saved filter', firstFilter.name, '=> count', r.content?.list?.length);
  if (r.content?.list?.length) {
    const sorted = [...r.content.list].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    for (const item of sorted.slice(0, 10)) {
      console.log(`spend=${item.spend} | ${item.materialName} | mid=${item.mid}`);
    }
  } else {
    console.log('response', JSON.stringify(r.content));
  }
}

// adsTrends
const trends = await api('/v1/publicAd/adsTrends', {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\nadsTrends', trends.code, JSON.stringify(trends.content, null, 2).slice(0, 1000));

// account overview
const ov = await api('/v1/publicAd/accountOverview', {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\naccountOverview', ov.code, JSON.stringify(ov.content, null, 2).slice(0, 1000));

// Try rank with account ids if available
if (phAccounts.length) {
  const ids = phAccounts.slice(0, 5).map(a => a.accountId ?? a.id);
  const r = await api('/v1/material/rankList', {
    page: 1,
    pageSize: 20,
    filtering: {
      time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
      regionCountries: [{ region: 'PH', countries: ['PH'] }],
      accountIds: ids,
    },
  });
  console.log('\nwith accountIds count', r.content?.list?.length, JSON.stringify(r.content).slice(0, 500));
}
