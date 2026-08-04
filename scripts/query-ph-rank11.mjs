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

const timeTypes = [1, 2, 3, 4, 5, 6, 7, 8, 'last_7_days', 'last_30_days', 'yesterday', 'this_month'];
for (const tt of timeTypes) {
  const filtering = {
    timeType: tt,
    regionCountries: [{ region: 'PH', countries: ['PH'] }],
  };
  const r = await api('/v1/material/rankList', { page: 1, pageSize: 10, filtering });
  const n = r.content?.list?.length ?? 0;
  if (r.code !== 200) {
    console.log('timeType', tt, '=>', r.code, r.message?.slice?.(0, 60));
  } else if (n > 0) {
    console.log('HIT timeType', tt, 'count', n);
    console.log(JSON.stringify(r.content.list[0], null, 2).slice(0, 800));
    break;
  } else {
    console.log('timeType', tt, '=> empty', JSON.stringify(r.content));
  }
}

// getUserSetting
for (const from of [0, 3, 8]) {
  const s = await api('/v1/filtering/getUserSetting', { from });
  console.log('\ngetUserSetting from', from, s.code, JSON.stringify(s.content).slice(0, 500));
}

// insight themes
const themes = await api('/v1/material/insightThemes', {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
});
console.log('\ninsightThemes', themes.code, JSON.stringify(themes.content).slice(0, 1000));

const insight = await api('/v1/material/insight', {
  regionCountries: [{ region: 'PH', countries: ['PH'] }],
  time: { beginTime: '2026-07-01', endTime: '2026-07-31' },
  metric: 'spend',
  order: 'desc',
  limit: 10,
});
console.log('\ninsight', insight.code, JSON.stringify(insight.content).slice(0, 1500));
