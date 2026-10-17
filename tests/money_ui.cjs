// F6.1/F6.4 money UI: pure helpers taken from index.html (read-only) and run in a sandbox.
// node tests/money_ui.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=[
  slice('// money-ui:pure-begin','// money-ui:pure-end'),
  slice('const BANK_KEYS=','\n'),
  slice('function bankTotals(','async function renderBankBalances('),
  slice('const MONEY_VIEWS=','const reducedMotion='),
].join('\n');

let fakeToday='2026-10-17';
const ctx={console,today:()=>fakeToday};
vm.createContext(ctx);
vm.runInContext(code+';this.M={dateRange,filterPeriod,periodLabel,periodPhrase,dayMonthShort,formatDateShort,fitTextSize,ymdShift,bankTotals,navKeyOf,MONEY_VIEWS,MONEY_LABELS};',ctx);
const M=ctx.M;

let pass=0,fail=0;
function ok(cond,name,extra){if(cond)pass++;else{fail++;console.log('FAIL',name,extra!==undefined?JSON.stringify(extra):'')}}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// ── dateRange: week = Monday–Sunday of the current week ──
// 2026-10-17 is a Saturday → week 12.10 (Mon) … 18.10 (Sun)
ok(eq(M.dateRange('week','2026-10-17'),{start:'2026-10-12',end:'2026-10-18'}),'1 week on Saturday',M.dateRange('week','2026-10-17'));
ok(eq(M.dateRange('week','2026-10-12'),{start:'2026-10-12',end:'2026-10-18'}),'2 week on Monday starts today');
ok(eq(M.dateRange('week','2026-10-18'),{start:'2026-10-12',end:'2026-10-18'}),'3 week on Sunday still the same week (not next)');
ok(eq(M.dateRange('week','2026-11-01'),{start:'2026-10-26',end:'2026-11-01'}),'4 week across month boundary');
ok(eq(M.dateRange('week','2027-01-01'),{start:'2026-12-28',end:'2027-01-03'}),'5 week across year boundary');
// month / year / all
ok(eq(M.dateRange('month','2026-10-17'),{start:'2026-10-01',end:'2026-10-31'}),'6 month = calendar month');
ok(eq(M.dateRange('month','2028-02-10'),{start:'2028-02-01',end:'2028-02-29'}),'7 month end in a leap February');
ok(eq(M.dateRange('year','2026-10-17'),{start:'2026-01-01',end:'2026-12-31'}),'8 year = calendar year, not last 365 days');
ok(eq(M.dateRange('all','2026-10-17'),{start:null,end:null}),'9 all → no bounds');
ok(eq(M.dateRange('calendar','2026-10-17'),{start:null,end:null}),'10 calendar → no bounds (filtered by the calendar)');
ok(eq(M.dateRange('week'),M.dateRange('week','2026-10-17')),'11 default today() used');

// ── filterPeriod ──
const txs=['2026-10-11','2026-10-12','2026-10-17','2026-10-18','2026-10-19','2026-09-30','2026-10-01','2025-12-31','2026-01-01'].map((d,i)=>({id:'t'+i,date:d}));
const ids=a=>a.map(t=>t.date).join(',');
ok(ids(M.filterPeriod(txs,'week','2026-10-17'))==='2026-10-12,2026-10-17,2026-10-18','12 week filter: Sunday kept, Sunday before and next Monday dropped',ids(M.filterPeriod(txs,'week','2026-10-17')));
ok(ids(M.filterPeriod(txs,'month','2026-10-17'))==='2026-10-11,2026-10-12,2026-10-17,2026-10-18,2026-10-19,2026-10-01','13 month filter');
ok(M.filterPeriod(txs,'year','2026-10-17').length===8,'14 year filter drops last year only');
ok(M.filterPeriod(txs,'all','2026-10-17').length===txs.length,'15 all keeps everything');
ok(M.filterPeriod(txs,'all')===txs,'16 all returns the same array');

// ── labels ──
ok(M.periodLabel('week','2026-10-17')==='Эта неделя','17 label week');
ok(M.periodLabel('month','2026-10-17')==='Октябрь','18 label month = month name');
ok(M.periodLabel('month','2026-05-03')==='Май','19 label May');
ok(M.periodLabel('year','2026-10-17')==='2026','20 label year = the year');
ok(M.periodLabel('all','2026-10-17')==='Всё','21 label all = «Всё»');
ok(M.periodLabel('calendar')==='Календарь','22 label calendar');
ok(M.periodPhrase('week','2026-10-17')==='за эту неделю','23 phrase week');
ok(M.periodPhrase('month','2026-10-17')==='за октябрь','24 phrase month');
ok(M.periodPhrase('year','2026-10-17')==='за 2026 год','25 phrase year');
ok(M.periodPhrase('all')==='за всё время','26 phrase all');

// ── history dates ──
ok(M.formatDateShort('2026-10-17','2026-10-17')==='Сегодня','27 today');
ok(M.formatDateShort('2026-10-16','2026-10-17')==='Вчера','28 yesterday');
ok(M.formatDateShort('2026-10-15','2026-10-17')==='15 окт','29 «15 окт», no ISO');
ok(M.formatDateShort('2026-10-31','2026-11-01')==='Вчера','30 yesterday across month');
ok(M.formatDateShort('2026-12-31','2027-01-01')==='Вчера','31 yesterday across year');
ok(M.formatDateShort('2026-05-02','2026-10-17')==='2 мая','32 genitive May, no leading zero');
ok(M.formatDateShort('2025-10-17','2026-10-17')==='17 окт 2025','33 other year gets the year');
ok(M.dayMonthShort('2026-10-17','2026-10-17')==='17 окт','34 dayMonthShort today is still a date');
ok(!/\d{4}-\d{2}-\d{2}/.test(M.formatDateShort('2026-03-08','2026-10-17')),'35 no ISO in output');
ok(M.formatDateShort('2026-10-17')==='Сегодня','36 default today()');
ok(M.dayMonthShort('')===''&&M.dayMonthShort('bad')==='bad','37 bad input passes through');

// ── fitTextSize (fake measure: width = chars × size × 0.6) ──
const meas=chars=>s=>chars*s*0.6;
ok(M.fitTextSize(meas(5),343,60,24,2)===60,'38 short text keeps max size');
ok(M.fitTextSize(meas(14),343,60,24,2)===40,'39 long text steps down to the largest fitting size',M.fitTextSize(meas(14),343,60,24,2));
ok(meas(14)(M.fitTextSize(meas(14),343,60,24,2))<=343&&meas(14)(M.fitTextSize(meas(14),343,60,24,2)+2)>343,'40 result is the largest fitting step');
ok(M.fitTextSize(meas(40),343,60,24,2)===24,'41 nothing fits → min');
ok(M.fitTextSize(meas(14),343,61,24,4)===37,'42 step 4 from 61 (41 is 1 px too wide)',M.fitTextSize(meas(14),343,61,24,4));
ok(M.fitTextSize(meas(40),343,61,24,4)===24,'43 never below min even if the step overshoots');
let calls=0;M.fitTextSize(s=>{calls++;return 1000},343,60,24,2);
ok(calls===18,'44 measures each step once until min',calls);
ok(M.fitTextSize(meas(14),343,60,24,0)===40,'45 step 0 falls back to 2');

// ── bank totals: «не задан» excluded ──
const bt=M.bankTotals({kaspi:100000.5,freedom:null,halyk:0,forte:null});
ok(bt.total===100000.5&&eq(bt.set,['kaspi','halyk'])&&eq(bt.unset,['freedom','forte']),'46 unset banks excluded, 0 counts as set',bt);
ok(M.bankTotals({kaspi:null,freedom:null,halyk:null,forte:null}).set.length===0,'47 nothing set');
ok(M.bankTotals({kaspi:0.1,freedom:0.2,halyk:null,forte:null}).total===0.3,'48 kopecks rounded');

// ── shell: 4 money tabs, statement/debts/alloc map to Money ──
ok(eq([...M.MONEY_VIEWS],['home','history','stats','plans']),'49 four money tabs');
ok(eq(M.MONEY_VIEWS.map(v=>M.MONEY_LABELS[v]),['Обзор','Операции','Аналитика','Планы']),'50 tab labels');
ok(['home','history','stats','plans','statement','debts','alloc'].every(v=>M.navKeyOf(v)==='money'),'51 money children light the Money tab');
ok(M.navKeyOf('settings','history')==='money'&&M.navKeyOf('settings','body')==='body'&&M.navKeyOf('settings')==='status','52 settings lights the tab it was opened from');
ok(M.navKeyOf('settings','settings')==='status'&&M.navKeyOf('add')==='quests'&&M.navKeyOf('quests')==='quests','53 other keys unchanged');

console.log(`money_ui: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
