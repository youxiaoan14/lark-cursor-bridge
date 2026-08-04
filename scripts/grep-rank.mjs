import fs from 'node:fs';

const s = fs.readFileSync('.tmp-main.js', 'utf8');
const paths = [...new Set([...s.matchAll(/['"](\/v1\/[a-zA-Z0-9_/-]{2,100})['"]/g)].map((m) => m[1]))]
  .filter((p) => /rank|board|report|metric|spend|consume|top|overview|plan|material/i.test(p))
  .sort();
console.log(paths.join('\n'));

for (const kw of ['cyphb', 'Rank', 'rank', '消耗', 'spend', 'materialRank', 'creativeRank']) {
  let idx = 0, n = 0;
  while ((idx = s.indexOf(kw, idx)) !== -1 && n < 3) {
    console.log('\n---', kw, '---');
    console.log(s.slice(Math.max(0, idx - 60), Math.min(s.length, idx + 200)));
    idx += kw.length; n++;
  }
}
