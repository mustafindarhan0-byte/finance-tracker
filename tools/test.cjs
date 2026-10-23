#!/usr/bin/env node
// Runs every test file and prints one summary line per file: node tools/test.cjs
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const files = [
  ...['run.cjs', 'csv.cjs', 'misc.cjs'].map(f => 'tests/statements/' + f),
  ...fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.cjs')).sort().map(f => 'tests/' + f)
].filter(f => fs.existsSync(path.join(ROOT, f)));
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [f], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim().split('\n');
  const ok = r.status === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f}  ${out[out.length - 1] || ''}`);
  if (!ok) console.log(out.filter(l => /FAIL|Error/.test(l)).slice(0, 10).map(l => '     ' + l).join('\n'));
}
console.log(bad ? `${bad} файл(ов) с ошибками` : `все ${files.length} файлов зелёные`);
process.exitCode = bad ? 1 : 0;
