// Backup pure functions (F3.4–F3.6) taken from index.html (read-only) and run in a sandbox.
// Run: node tests/backup.cjs
const fs=require('fs'),vm=require('vm'),path=require('path'),nodeCrypto=require('crypto');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=[
  slice('const EXTRA_STORES=','function docId('),
  slice('async function sha256Hex(','async function connectSpace('),
  slice('// backup:pure-begin','// backup:pure-end'),
].join('\n');
const ctx={console,btoa,atob,TextEncoder,TextDecoder,CompressionStream,DecompressionStream,Response,Blob,crypto:globalThis.crypto,Uint8Array,Array};
vm.createContext(ctx);
vm.runInContext(code+'\n;this.B={BACKUP_STORES,BACKUP_PART_MAX,plainValue,cleanBackupData,buildBackupV2,parseBackup,stableStr,diffBackup,chunkList,bytesToB64,b64ToBytes,encodeSnapshot,decodeSnapshot,splitB64,dayRu,dayDiff,ruDays,reminderFor,snapshotDue,csvCell,buildTxCsv};',ctx);
const B=ctx.B;

let pass=0,fail=0;
function check(name,cond,info){if(cond){pass++;console.log('ok  ',name)}else{fail++;console.log('FAIL',name,info===undefined?'':JSON.stringify(info))}}
const clone=x=>JSON.parse(JSON.stringify(x));
const ts=ms=>({seconds:Math.floor(ms/1000),nanoseconds:0,toMillis:()=>ms});

(async()=>{
  // ── gzip / base64 ──
  const text=JSON.stringify({a:'Кофе ☕ «Ромашка»',n:[1,2.5,-3],big:'x'.repeat(50000)});
  const enc=await B.encodeSnapshot(text);
  check('gzip: enc is gzip',enc.enc==='gzip',enc.enc);
  check('gzip: roundtrip keeps unicode text',await B.decodeSnapshot(enc.b64,enc.enc)===text);
  check('gzip: compresses repetitive JSON',enc.b64.length<text.length/10,enc.b64.length);
  const rnd=new Uint8Array(nodeCrypto.randomBytes(200000));
  const b64=B.bytesToB64(rnd);
  check('base64: matches Node Buffer (chunked > 32 KB)',b64===Buffer.from(rnd).toString('base64'));
  check('base64: roundtrip bytes',Buffer.compare(Buffer.from(B.b64ToBytes(b64)),Buffer.from(rnd))===0);
  const plain=B.bytesToB64(new TextEncoder().encode(text));
  check('no-gzip fallback: enc none decodes',await B.decodeSnapshot(plain,'none')===text);
  const big='A'.repeat(2*1024*1024+7),parts=B.splitB64(big);
  check('split: 2 MB → 3 parts ≤ 900 KB, joins back',parts.length===3&&parts.every(p=>p.length<=B.BACKUP_PART_MAX)&&parts.join('')===big,parts.map(p=>p.length));
  check('split: empty → one empty part',B.splitB64('').length===1);

  // ── JSON v2 ──
  const raw={
    transactions:[{id:'t1',type:'expense',amount:1500.5,category:'food',description:'Обед',date:'2026-10-01',createdAt:1,updatedAt:ts(1790000000000)},{id:'t9',deleted:true,updatedAt:ts(5)}],
    settings:[{key:'currency',value:'KZT'},{key:'geminiKey',value:'SECRET'}],
    goals:[{id:'g1',name:'Отпуск',targetAmount:100000,currentAmount:2000}],
    members:[{id:'m1',name:'device'}],
    importedStatements:[{id:'abc123',bank:'kaspi',importedAt:5,count:3}],
  };
  const data=B.cleanBackupData(raw);
  check('clean: Timestamp → millis',data.transactions[0].updatedAt===1790000000000);
  check('clean: tombstones dropped',data.transactions.length===1);
  check('clean: geminiKey stripped',!data.settings.some(x=>x.key==='geminiKey')&&data.settings.length===1);
  check('clean: members never exported',!('members' in data));
  const v2=await B.buildBackupV2(data,'2026-10-17T10:00:00.000Z');
  const sha=nodeCrypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  check('v2: header fields',v2.format==='sistema-backup'&&v2.version===2&&v2.exportedAt==='2026-10-17T10:00:00.000Z');
  check('v2: counts',v2.counts.transactions===1&&v2.counts.importedStatements===1&&v2.counts.settings===1,v2.counts);
  check('v2: sha256 of JSON.stringify(data)',v2.sha256===sha);
  const p2=await B.parseBackup(JSON.parse(JSON.stringify(v2)));
  check('parse v2: ok after file roundtrip',!p2.error&&p2.version===2&&p2.data.goals[0].name==='Отпуск',p2.error);
  const bad=clone(v2);bad.data.transactions[0].amount=1;
  check('parse v2: tampered data rejected',!!(await B.parseBackup(bad)).error);
  const p1=await B.parseBackup({transactions:[{id:1,amount:5}],settings:[{key:'geminiKey',value:'x'}],currency:'KZT',exportDate:'2026-01-01T00:00:00Z'});
  check('parse v1: old export accepted',!p1.error&&p1.version===1&&p1.data.transactions.length===1&&p1.data.settings.length===0);
  check('parse v1: missing collections listed',p1.missing.includes('importedStatements')&&p1.missing.includes('tasks')&&!p1.missing.includes('transactions'));
  check('parse: garbage rejected',!!(await B.parseBackup([1,2])).error&&!!(await B.parseBackup({foo:1})).error);

  // ── CSV ──
  const txs=[
    {id:'2',type:'income',amount:100,category:'salary',description:'Зарплата',date:'2026-10-05',createdAt:2,bank:'kaspi',source:'manual'},
    {id:'1',type:'expense',amount:1234.5,category:'food',description:'=HYPERLINK("http://x")',date:'2026-10-01',createdAt:1,source:'statement'},
    {id:'3',type:'expense',amount:0.1+0.2,category:'cafe',description:'Кафе "Ромашка"; зал',date:'2026-10-07',createdAt:3},
    {id:'4',type:'expense',amount:10,category:'x',description:'-2+3',date:'2026-10-08',createdAt:4},
    {id:'5',type:'expense',amount:10,category:'x',description:'@SUM(A1)',date:'2026-10-09',createdAt:5},
    {id:'6',type:'expense',amount:10,category:'x',description:'+7 701',date:'2026-10-10',createdAt:6},
  ];
  const csv=B.buildTxCsv(txs,{cat:id=>({food:'Еда',salary:'Зарплата'})[id]||id,bank:k=>k==='kaspi'?'Kaspi Bank':k});
  const lines=csv.slice(1).split('\r\n');
  check('csv: UTF-8 BOM',csv.charCodeAt(0)===0xFEFF);
  check('csv: CRLF only, ends with CRLF',!/[^\r]\n/.test(csv)&&csv.endsWith('\r\n'));
  check('csv: header with ; separator',lines[0]==='Дата;Тип;Сумма;Категория;Описание;Банк;Источник',lines[0]);
  check('csv: sorted by date, DD.MM.YYYY',lines[1].startsWith('01.10.2026;')&&lines[2].startsWith('05.10.2026;'),lines.slice(1,3));
  check('csv: decimal comma, expense negative, no guard on amount',lines[1].split(';')[2]==='-1234,5',lines[1]);
  check('csv: float noise rounded',lines[3].includes(';-0,3;'),lines[3]);
  check('csv: income positive + names mapped',lines[2]==='05.10.2026;Доход;100;Зарплата;Зарплата;Kaspi Bank;вручную',lines[2]);
  check('csv: formula guard + doubled quotes',lines[1].includes(`;"'=HYPERLINK(""http://x"")";`),lines[1]);
  check('csv: ; in text quoted, quotes doubled',lines[3].includes(';"Кафе ""Ромашка""; зал";'),lines[3]);
  check('csv: - + @ text prefixed',lines[4].includes(";'-2+3;")&&lines[5].includes(";'@SUM(A1);")&&lines[6].includes(";'+7 701;"),lines.slice(4,7));
  check('csv: cell helper',B.csvCell('a\nb')==='"a\nb"'&&B.csvCell(-5.25,true)==='-5,25'&&B.csvCell(null)==='');

  // ── dry run diff ──
  const cur={
    transactions:[{id:'a',amount:1,b:2,updatedAt:111},{id:'b',amount:2},{id:'c',amount:3}],
    budgets:[{key:'general',limit:100}],
    settings:[{key:'currency',value:'KZT'},{key:'geminiKey',value:'k'}],
    tasks:[{id:'t1',title:'x'}],
    importedStatements:[{id:'h1',bank:'kaspi'},{id:'h2',bank:'halyk'}],
  };
  const inc={
    transactions:[{b:2,amount:1,id:'a',updatedAt:999},{id:'b',amount:20},{id:'d',amount:4},{id:'d',amount:5},{amount:6}],
    budgets:[{key:'general',limit:100},{key:'food',limit:5}],
    settings:[{key:'currency',value:'USD'}],
    importedStatements:[{id:'h1',bank:'kaspi'}],
  };
  const {per,ops}=B.diffBackup(cur,inc);
  const t=per.transactions;
  check('diff: transactions add/change/del/same',t.add===1&&t.change===1&&t.del===1&&t.same===1,t);
  check('diff: updatedAt and key order ignored',!ops.some(o=>o.s==='transactions'&&o.id==='a'));
  check('diff: duplicate and keyless docs skipped',t.bad===2,t);
  check('diff: budgets keyed by key',per.budgets.add===1&&per.budgets.same===1&&per.budgets.del===0,per.budgets);
  check('diff: geminiKey never deleted',!ops.some(o=>o.id==='geminiKey')&&per.settings.change===1&&per.settings.del===0,per.settings);
  check('diff: collection absent in copy untouched',!('tasks' in per)&&!ops.some(o=>o.s==='tasks'));
  check('diff: importedStatements keyed by id',per.importedStatements.del===1&&ops.some(o=>o.s==='importedStatements'&&o.kind==='del'&&o.id==='h2'));
  check('diff: ops = add+change+del',ops.length===Object.values(per).reduce((n,c)=>n+c.add+c.change+c.del,0),ops.length);
  check('stableStr: key order independent',B.stableStr({a:1,b:[{y:1,x:2}]})===B.stableStr({b:[{x:2,y:1}],a:1}));
  check('chunk: 1001 by 400',JSON.stringify(B.chunkList(Array(1001).fill(0),400).map(c=>c.length))==='[400,400,201]');

  // full snapshot cycle: data → v2 → gzip/base64 → back → parse → diff with itself = nothing to write
  const snap=await B.encodeSnapshot(JSON.stringify(v2));
  const back=await B.parseBackup(JSON.parse(await B.decodeSnapshot(B.splitB64(snap.b64,64).join(''),snap.enc)));
  const again=B.diffBackup(data,back.data);
  check('snapshot cycle: restore of an unchanged state writes nothing',!back.error&&again.ops.length===0,again.per);
  const empty=B.diffBackup({},back.data);
  check('restore into empty space adds everything',empty.ops.length===4&&empty.ops.every(o=>o.kind==='set'),empty.per);

  // ── reminders / schedule ──
  check('reminder: never',B.reminderFor(null,'2026-10-17')==='Внешней копии ещё не было');
  check('reminder: within 7 days → empty',B.reminderFor('2026-10-10','2026-10-17')==='');
  check('reminder: 8 / 21 / 22 / 25 days',B.reminderFor('2026-10-09','2026-10-17')==='Копия была 8 дней назад'&&B.ruDays(21)==='21 день'&&B.ruDays(22)==='22 дня'&&B.ruDays(25)==='25 дней'&&B.ruDays(11)==='11 дней');
  check('reminder: across DST/month',B.dayDiff('2026-03-28','2026-04-05')===8);
  check('snapshot due: 7 days yes, 6 no, never yes',B.snapshotDue('2026-10-10','2026-10-17')&&!B.snapshotDue('2026-10-11','2026-10-17')&&B.snapshotDue(null,'2026-10-17'));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
