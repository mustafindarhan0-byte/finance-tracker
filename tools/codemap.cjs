#!/usr/bin/env node
// Code graph for a single-file app: sections, functions (with index.html line numbers) and who-calls-whom.
//   node tools/codemap.cjs                 → regenerate CODEMAP.md (also run by the git pre-commit hook)
//   node tools/codemap.cjs who <name>      → where <name> is defined, what it calls, who calls it
//   node tools/codemap.cjs find <text>     → functions whose name contains <text>
//   node tools/codemap.cjs section <text>  → functions of the section(s) whose title contains <text>
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

function scan() {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  const defs = [], sections = [];
  let inScript = false, curSection = '(начало скрипта)';
  const defRe = [
    /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/,
    /^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
    /^window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\(|[A-Za-z_$][\w$]*\s*=>)/
  ];
  const constRe = /^(?:const|let)\s+([A-Z][A-Z0-9_]{2,})\s*=/; // config tables like CATS, SKILL_TREES
  lines.forEach((l, i) => {
    if (/^<script>\s*$/.test(l)) inScript = true;
    else if (/^<\/script>/.test(l)) inScript = false;
    if (!inScript) return;
    const s = l.match(/^\/\/ ── (.+?) ──/);
    if (s) { curSection = s[1].trim(); sections.push({ title: curSection, line: i + 1 }); return; }
    for (const re of defRe) { const m = l.match(re); if (m) { defs.push({ name: m[1], line: i + 1, section: curSection, kind: 'fn' }); return; } }
    const c = l.match(constRe); if (c) defs.push({ name: c[1], line: i + 1, section: curSection, kind: 'const' });
  });
  // a definition ends where the next top-level definition or section starts
  const starts = [...defs.map(d => d.line), ...sections.map(s => s.line)].sort((a, b) => a - b);
  for (const d of defs) d.end = (starts.find(x => x > d.line) || lines.length + 1) - 1;
  // calls: known names used as `name(` (also inside onclick="name(…)" strings) within the body
  const names = new Set(defs.filter(d => d.kind === 'fn').map(d => d.name));
  const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  for (const d of defs) {
    const body = lines.slice(d.line - 1, d.end).join('\n');
    const calls = new Set();
    let m; while ((m = callRe.exec(body))) if (names.has(m[1]) && m[1] !== d.name) calls.add(m[1]);
    // constants referenced by name
    for (const k of defs) if (k.kind === 'const' && k.name !== d.name && new RegExp('\\b' + k.name + '\\b').test(body)) calls.add(k.name);
    d.calls = [...calls].sort();
  }
  const byName = new Map(); defs.forEach(d => { if (!byName.has(d.name)) byName.set(d.name, d); });
  for (const d of defs) d.calledBy = defs.filter(x => x.calls.includes(d.name)).map(x => x.name);
  return { defs, sections, byName, total: lines.length };
}

function writeMap({ defs, sections, total }) {
  const out = [];
  out.push('# CODEMAP — карта кода index.html');
  out.push('');
  out.push(`Сгенерировано \`node tools/codemap.cjs\` (обновляется само при каждом коммите). ${total} строк, ${defs.filter(d => d.kind === 'fn').length} функций, ${sections.length} разделов. Номера — строки index.html.`);
  out.push('');
  out.push('Связи: `node tools/codemap.cjs who <функция>` (что вызывает и кто её вызывает), `find <часть имени>`, `section <часть заголовка>`. Читай index.html кусками по номерам строк отсюда, а не целиком.');
  out.push('');
  const order = [{ title: '(начало скрипта)', line: 0 }, ...sections];
  for (const s of order) {
    const ds = defs.filter(d => d.section === s.title);
    if (!ds.length) continue;
    out.push(`## ${s.title}${s.line ? ` · L${s.line}` : ''}`);
    const consts = ds.filter(d => d.kind === 'const').map(d => `${d.name} L${d.line}`);
    const fns = ds.filter(d => d.kind === 'fn').map(d => `${d.name} L${d.line}`);
    if (consts.length) out.push('Данные: ' + consts.join(', '));
    if (fns.length) out.push(fns.join(', '));
    out.push('');
  }
  // fx.js public API (effects), small and stable
  try {
    const fx = fs.readFileSync(path.join(ROOT, 'fx.js'), 'utf8').replace(/\r\n/g, '\n').split('\n');
    const api = []; fx.forEach((l, i) => { const m = l.match(/^window\.(fx\w+)\s*=/); if (m) api.push(`${m[1]} L${i + 1}`); });
    if (api.length) { out.push('## fx.js (эффекты)'); out.push(api.join(', ')); out.push(''); }
  } catch (e) {}
  fs.writeFileSync(path.join(ROOT, 'CODEMAP.md'), out.join('\n'));
}

function show(d) {
  return `${d.name}  index.html L${d.line}–L${d.end}  [${d.section}]\n  вызывает: ${d.calls.join(', ') || '—'}\n  вызывают: ${d.calledBy.join(', ') || '—'}`;
}

const g = scan();
const [cmd, ...rest] = process.argv.slice(2), arg = rest.join(' ');
if (!cmd) { writeMap(g); console.log(`CODEMAP.md: ${g.defs.length} определений, ${g.sections.length} разделов`); }
else if (cmd === 'who') { const d = g.byName.get(arg); console.log(d ? show(d) : `Не найдено: ${arg}. Попробуй: node tools/codemap.cjs find ${arg}`); }
else if (cmd === 'find') { const q = arg.toLowerCase(); const r = g.defs.filter(d => d.name.toLowerCase().includes(q)); console.log(r.map(d => `${d.name} L${d.line}–L${d.end} [${d.section}]`).join('\n') || 'ничего'); }
else if (cmd === 'section') { const q = arg.toLowerCase(); const r = g.defs.filter(d => d.section.toLowerCase().includes(q)); console.log(r.map(d => `${d.name} L${d.line}–L${d.end}`).join('\n') || 'ничего'); }
else { console.log('Команды: (без аргументов) | who <имя> | find <текст> | section <текст>'); process.exitCode = 1; }
