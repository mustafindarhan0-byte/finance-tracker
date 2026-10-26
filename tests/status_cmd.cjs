// F6.2 / F6.3 / F6.5: [+] parsing (incl. the no-amount hint rule), date chips → saveTx date, task action routing,
// status tile targets, salary allocation (income tx, bank, budget question). Code is taken from index.html (read-only).
// node tests/status_cmd.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
const css=fs.readFileSync(path.join(__dirname,'..','theme.css'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const line=re=>{const m=src.match(re);if(!m)throw new Error('line '+re);return m[0]};
const code=[
  line(/function localDate\([^\n]*\n/),line(/const pad2=[^\n]*\n/),line(/function parseLocalDate\([^\n]*\n/),line(/function addDays\([^\n]*\n/),line(/function isoWeekday\([^\n]*\n/),
  slice('const KEYWORDS={','const CUR_SYM'),
  slice('function parseInput(text){','const CAT_TYPE={};'),
  slice('async function saveTx(','// ── Templates ──'),
  slice('// Balance of a bank = last saved snapshot','async function setBankBalance'),
  slice('// Quick input, parsed from the end','async function addQuickTask'),
  slice('// ── F6 pure helpers','\n// ── Module 3: installments'),
  slice('let allocIncome=','\n// ── Module 5: workouts'),
  line(/function daysBetween\([^\n]*\n/),line(/function weekStart\([^\n]*\n/),
  slice('// First date strictly after `after`','// Completed early'),
  slice('// Occurrences (incl. future repeats)','function taskRowHtml('),
].join('\n');

const T0='2026-10-17';
const batches=[];
function mkBatch(){const b={puts:[],goal:[],committed:false};batches.push(b);return b}
const dom={};
const ctx={
  console,
  today:()=>T0,
  learnedMap:{'магнум астана':'groceries'},
  currentType:'expense',currentBank:'freedom',txCache:[],
  fsDb:{batch:mkBatch},
  batchPut:(b,col,doc)=>b.puts.push([col,doc]),
  batchGoalInc:(b,id,amt)=>b.goal.push([id,amt]),
  commitBatch:b=>{b.committed=true},
  extractJournal:body=>{const m=body.match(/#(dfir)\b/);return{text:body.replace(/#\S+/g,'').trim(),sphere:m?'dfir':null}},
  // classifier stand-in: first keyword substring for the type (the real one is in classify())
  classify:async(desc,type)=>{const l=desc.toLowerCase();if(ctx.learnedMap[l])return ctx.learnedMap[l];for(const[c,ws]of Object.entries(ctx.KEYWORDS_REF))if((type==='income')===['salary','freelance','gift_income'].includes(c)&&ws.some(w=>l.includes(w)))return c;return null},
  settings:{},getSetting:async k=>ctx.settings[k],
  document:{getElementById:id=>dom[id]||null,querySelector:()=>null},
  // allocation deps
  uid:(()=>{let n=0;return()=>'id'+(++n)})(),
  fmtCur:n=>Number(n).toLocaleString('ru-RU')+' ₸',
  BANK_KEYS:['kaspi','freedom','halyk','forte'],BANK_NAMES:{kaspi:'Kaspi Bank',forte:'Forte Bank',halyk:'Halyk Bank',freedom:'Freedom Bank',cash:'Наличные'},
  budgets:[],dbAll:async s=>s==='budgets'?ctx.budgets:[],
  confirmAnswer:true,questions:[],confirm:q=>{ctx.questions.push(q);return ctx.confirmAnswer},
  // F6.7: allocConfirm asks through sheetConfirm; with window.confirm replaced it answers via confirm (as in index.html)
  sheetConfirm:o=>Promise.resolve(!!ctx.confirm([o&&o.title,o&&o.text].filter(Boolean).join('\n\n'))),
  xp:[],batchXp:async(b,id,sphere,amount)=>{ctx.xp.push([id,sphere,amount])},
  cols:{allocations:[]},getCol:async n=>ctx.cols[n]||(ctx.cols[n]=[]),
  tasksCache:[],getTasks:async()=>ctx.tasksCache,
  completed:[],completeTask:async(id,o)=>{ctx.completed.push([id,o])},
  checkAchievements:()=>{},toasts:[],toast:m=>ctx.toasts.push(m),refreshAlloc:()=>{},
  escapeHtml:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(code+`
;KEYWORDS_REF=KEYWORDS;this.M={cmdParse,cmdNoAmountHint,cmdEnterAction,cmdDateValue,cmdDatePick,cmdDateLabel,cmdFixAmountToken,
  taskActionKind,taskTapAction,workoutOpenDecision,statusTileTarget,allocBudgetQuestion,findRecordedSalary,saveTx,bankBalance,
  allocConfirm,setCmdType:t=>{cmdType=t},setOverride:o=>{cmdCatOverride=o},
  todaySpend,cmdKindLabel,weekAhead,parseQuickTask,undatedTaskFix,setForce:(f,l)=>{cmdForce=f;cmdList=l||null},
  setPlan:p=>{allocPlanState=p}};`,ctx);
const M=ctx.M;

let pass=0,fail=0;
function ok(cond,name,extra){if(cond)pass++;else{fail++;console.log('FAIL',name,extra!==undefined?JSON.stringify(extra):'')}}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

(async()=>{
// ── [+] parsing ──
let st=await M.cmdParse('кофе 500');
ok(st.kind==='tx'&&st.amount===500&&st.cat==='food'&&st.type==='expense','1 «кофе 500» → expense, Еда',st);
st=await M.cmdParse('кофе');
ok(st.kind==='task'&&st.hint&&st.hint.text==='кофе 500'&&st.hint.fill==='кофе '&&!st.hint.fixed,'2 «кофе» → hint «кофе 500», fill «кофе »',st);
st=await M.cmdParse('кофе 5оо');
ok(st.kind==='task'&&st.hint&&st.hint.fixed&&st.hint.text==='кофе 500'&&st.hint.fill==='кофе 500','3 «кофе 5оо» → fixed hint «кофе 500»',st);
st=await M.cmdParse('5оо кофе');
ok(st.hint&&st.hint.text==='кофе 500','4 «5оо кофе» → hint «кофе 500»',st);
st=await M.cmdParse('позвонить маме');
ok(st.kind==='task'&&!st.hint&&st.title==='позвонить маме','5 «позвонить маме» → plain task',st);
st=await M.cmdParse('купить молоко');
ok(st.kind==='task'&&!st.hint,'6 «купить молоко» (task verb) → plain task, no hint',st);
st=await M.cmdParse('молоко хлеб');
ok(st.kind==='task'&&st.hint&&st.hint.text==='молоко хлеб 500','7 «молоко хлеб» (keywords, 2 words) → hint',st);
st=await M.cmdParse('разобрать образ диска для кейса');
ok(st.kind==='task'&&!st.hint,'8 a long sentence → plain task',st);
st=await M.cmdParse('тренировка #зал вт 18:00');
ok(st.kind==='task'&&st.list==='gym'&&st.time==='18:00'&&!st.hint,'9 tagged/timed task unchanged',st);
st=await M.cmdParse('+ разобрал кейс #dfir');
ok(st.kind==='journal'&&st.sphere==='dfir','10 «+ …» → journal',st);
st=await M.cmdParse('отчёт 2 квартал');
ok(st.kind==='task'&&!st.hint,'11 digits that are not an amount → plain task',st);
st=await M.cmdParse('+5оо');
ok(st.kind==='task'&&st.hint&&st.hint.text==='+500','12 «+5оо» → hint keeps the income plus',st);
st=await M.cmdParse('магнум астана');
ok(st.hint,'13 learned description without amount → hint',st);
ok(M.cmdNoAmountHint('сходить в аптеку',ctx.KEYWORDS_REF,{})===null&&M.cmdNoAmountHint('такси',ctx.KEYWORDS_REF,{}).text==='такси 500','14 verb vs single word',[M.cmdNoAmountHint('такси',ctx.KEYWORDS_REF,{})]);
ok(M.cmdFixAmountToken('5оо')==='500'&&M.cmdFixAmountToken('1o0,5')==='100,5'&&M.cmdFixAmountToken('ооо')===null&&M.cmdFixAmountToken('500')===null,'15 cmdFixAmountToken');
M.setCmdType('income');st=await M.cmdParse('зарплата 300000');M.setCmdType('expense');
ok(st.kind==='tx'&&st.type==='income'&&st.cat==='salary','16 income switch → salary',st);
M.setOverride({desc:'кофе',type:'expense',cat:'groceries'});st=await M.cmdParse('кофе 700');
ok(st.cat==='groceries','17 category corrected on the chip survives re-parse',st);
st=await M.cmdParse('кофе мокко 700');
ok(st.cat==='food','18 override is per description',st);M.setOverride(null);

// ── Enter rule ──
const hinted={kind:'task',title:'кофе',hint:{text:'кофе 500'}};
ok(M.cmdEnterAction(hinted,false)==='arm'&&M.cmdEnterAction(hinted,true)==='save','19 hinted line: 1st Enter arms, 2nd saves the task');
ok(M.cmdEnterAction({kind:'tx',cat:null},false)==='cats'&&M.cmdEnterAction({kind:'tx',cat:'food'},false)==='save'&&M.cmdEnterAction(null,false)==='none'&&M.cmdEnterAction({kind:'task',title:'x'},false)==='save','20 other Enter actions');

// ── date chips ──
ok(M.cmdDateValue('today','',T0)===T0&&M.cmdDateValue('yesterday','',T0)==='2026-10-16','21 today / yesterday');
ok(M.cmdDateValue('yesterday','','2026-11-01')==='2026-10-31'&&M.cmdDateValue('yesterday','','2026-01-01')==='2025-12-31','22 yesterday across month / year');
ok(M.cmdDateValue('pick','2026-10-05',T0)==='2026-10-05'&&M.cmdDateValue('pick','2026-10-20',T0)===T0&&M.cmdDateValue('pick','2026-02-30',T0)===T0&&M.cmdDateValue('pick','',T0)===T0,'23 picked date: past ok, future/broken → today');
ok(eq(M.cmdDatePick('pick','2026-10-16',T0),{choice:'yesterday',picked:''})&&eq(M.cmdDatePick('pick',T0,T0),{choice:'today',picked:''})&&eq(M.cmdDatePick('pick','2026-10-03',T0),{choice:'pick',picked:'2026-10-03'})&&M.cmdDatePick('pick','2026-10-18',T0)===null&&eq(M.cmdDatePick('pick','',T0),{choice:'today',picked:''}),'24 cmdDatePick normalises and rejects the future');
ok(M.cmdDateLabel(T0,T0)==='Сегодня'&&M.cmdDateLabel('2026-10-16',T0)==='Вчера'&&M.cmdDateLabel('2026-10-03',T0)==='3 окт'&&M.cmdDateLabel('2025-12-31',T0)==='31 дек 2025','25 date labels');

// ── saveTx with the chip date; bank balance math ──
ctx.Date_now=Date.now;const before=Date.now();
const tx=await M.saveTx('кофе',500,'food',null,{date:'2026-10-16'});
ok(tx.date==='2026-10-16'&&tx.bank==='freedom'&&tx.type==='expense'&&tx.createdAt>=before&&tx.source==='manual','26 saveTx: extra.date overrides date, createdAt stays now, bank = current',tx);
const tx2=await M.saveTx('кофе',300,'food');
ok(tx2.date===T0,'27 no extra → today');
// manual snapshot (time mode) taken today: an entry dated before the snapshot day was already inside the real balance — only today's 300 counts
ctx.settings={bal_freedom:10000,balAt_freedom:new Date(T0+'T00:00:01').getTime()}; // snapshot on the test's own «today», independent of the real clock
ok(await M.bankBalance('freedom',[tx,tx2])===9700,'28 time-mode snapshot: entry dated before the snapshot day is not subtracted again',await M.bankBalance('freedom',[tx,tx2]));
// statement snapshot (date mode) up to 16.10: the back-dated 16.10 entry is already inside the statement
ctx.settings={bal_freedom:10000,balAt_freedom:new Date(2026,9,16,23,59,59).getTime(),balMode_freedom:'date'};
ok(await M.bankBalance('freedom',[tx,tx2])===9700,'29 date-mode snapshot: entry dated inside the statement is not added again',await M.bankBalance('freedom',[tx,tx2]));

// ── task action routing ──
const wt={id:'w',title:'Тренировка A',workoutPlan:'A',done:false},sal={id:'s',title:'Распределить зарплату',done:false},sal2={id:'s2',title:'Зарплата',kind:'salary'},plain={id:'p',title:'Купить хлеб'};
ok(M.taskTapAction(wt,'row')==='workout'&&M.taskTapAction(wt,'check')==='workout','30 workout task: row and checkbox open the workout');
ok(M.taskTapAction(sal,'check')==='salary'&&M.taskTapAction(sal2,'row')==='salary','31 salary task (title or kind) → allocation');
ok(M.taskTapAction(plain,'check')==='complete'&&M.taskTapAction(plain,'row')==='edit'&&M.taskTapAction({...wt,done:true},'check')===null&&M.taskTapAction(undefined,'row')===null,'32 plain task: check completes, row edits; done/missing → nothing');
ok(M.taskActionKind({...wt,kind:'salary'})==='workout'&&M.taskActionKind(plain)===null,'33 workoutPlan wins; plain → null');
const ws=[{id:'a',taskId:'w',date:'2026-10-15',at:1,done:false},{id:'b',taskId:'w',date:'2026-10-16',at:2,done:false},{id:'c',taskId:'x',date:T0,done:false},{id:'d',taskId:'w',date:T0,done:true}];
ok(eq(M.workoutOpenDecision({taskId:'w'},ws,'w',T0),{act:'show'})&&eq(M.workoutOpenDecision({taskId:'x'},ws,'w',T0),{act:'busy'}),'34 workout in progress: same task → show, other → busy');
ok(eq(M.workoutOpenDecision(null,ws,'w',T0),{act:'resume',id:'b'}),'35 open workout of this task → resume the newest');
ok(eq(M.workoutOpenDecision(null,ws,'y',T0),{act:'busy',id:'c'})&&eq(M.workoutOpenDecision(null,[ws[3]],'w',T0),{act:'start'}),'36 another open workout today → busy; none → start');

// ── status tiles ──
ok(eq(M.statusTileTarget('money'),{view:'money'})&&eq(M.statusTileTarget('dfir'),{view:'quests',tab:'today',list:'dfir'})&&eq(M.statusTileTarget('body'),{view:'body'})&&M.statusTileTarget('x')===null,'37 tile targets');

// ── salary allocation ──
const f=n=>n+' ₸';
ok(M.allocBudgetQuestion(0,250000,f)===null&&M.allocBudgetQuestion(250000,250000,f)===null,'38 no question without an old / with the same budget');
const q=M.allocBudgetQuestion(200000,250000,f);
ok(q&&q.includes('200000 ₸')&&q.includes('250000 ₸'),'39 question shows old and new',q);
const txs=[{type:'income',category:'salary',amount:500000,date:'2026-10-12',bank:'kaspi'},{type:'income',category:'salary',amount:500000,date:'2026-09-30'},{type:'expense',category:'salary',amount:500000,date:T0}];
ok(M.findRecordedSalary(txs,500000,T0)===txs[0]&&M.findRecordedSalary(txs,400000,T0)===null&&M.findRecordedSalary(txs,500000,'2026-10-25')===null,'40 recorded salary: same amount within 7 days');

const plan=()=>({S:500000,parts:[{label:'Жизнь',amount:250000,kind:'life'},{label:'Подушка',amount:100000,kind:'goal',goalId:'g1'}],rest:150000});
const setDom=(checked,bank)=>{dom['al-income']={checked};dom['al-bank']={value:bank}};
ctx.tasksCache=[{id:'st',title:'Распределить зарплату',done:false}];
// a) record income to Halyk, old budget 200k, user says yes
ctx.budgets=[{key:'general',limit:200000}];ctx.confirmAnswer=true;setDom(true,'halyk');M.setPlan(plan());batches.length=0;
await M.allocConfirm();
let b=batches[0],txPut=b.puts.find(p=>p[0]==='transactions'),bud=b.puts.find(p=>p[0]==='budgets'),alloc=b.puts.find(p=>p[0]==='allocations');
ok(txPut&&txPut[1].type==='income'&&txPut[1].category==='salary'&&txPut[1].amount===500000&&txPut[1].bank==='halyk'&&txPut[1].date===T0,'41 allocation records the salary income with the chosen bank',txPut&&txPut[1]);
ok(ctx.currentType==='expense','42 global Расход/Доход untouched');
ok(bud&&bud[1].limit===250000&&ctx.questions.length===1,'43 budget replaced after yes',bud);
ok(alloc&&alloc[1].txId===txPut[1].id&&alloc[1].bank==='halyk'&&txPut[1].allocId===alloc[1].id&&b.committed,'44 allocation ↔ tx linked, one committed batch');
ok(eq(ctx.completed[0],['st',{noXp:true}])&&ctx.xp.length===1&&ctx.xp[0][2]===30,'45 salary task closed without XP, +30 allocation XP once',[ctx.completed,ctx.xp]);
// b) user says no → old budget kept; income unticked → no tx
ctx.confirmAnswer=false;setDom(false,'kaspi');M.setPlan(plan());batches.length=0;
await M.allocConfirm();
b=batches[0];
ok(!b.puts.some(p=>p[0]==='budgets')&&!b.puts.some(p=>p[0]==='transactions')&&ctx.questions.length===2,'46 «no» keeps the old budget; unticked → no income',b.puts.map(p=>p[0]));
ok(b.goal.length===1&&b.goal[0][1]===100000,'47 goal contributions unchanged');
// c) same budget → no question
ctx.budgets=[{key:'general',limit:250000}];setDom(true,'kaspi');M.setPlan(plan());batches.length=0;
await M.allocConfirm();
ok(ctx.questions.length===2&&batches[0].puts.some(p=>p[0]==='budgets'),'48 same value → no question');
// double tap: plan consumed by the first call
await M.allocConfirm();
ok(batches.length===1,'49 second confirm without a plan does nothing');

// ── static checks: markup and styles ──
ok(/id="cmd-dates"[^>]*>[\s\S]*?data-d="today"[\s\S]*?data-d="yesterday"[\s\S]*?id="cmd-date-input"/.test(src),'50 date chips in #cmd-layer');
ok(/\.hero\{[^}]*height:240px/.test(css)&&/\.bento\{[^}]*repeat\(3,/.test(css),'51 hero 240 px, tiles in one row of three');
ok(/\.qrow \.qxp\{[^}]*color:var\(--fog\)/.test(css)&&!/\.t-bonus\{color:var\(--money\)/.test(css)&&!/\.tile \.bar\{--c:var\(--c\)\}/.test(css),'52 XP not in money gold; no self-referencing --c on tile bars');
const rs=slice('function renderStatus(){','function openSphere(');
ok(!/mq\.push\(warn/.test(rs)&&/st-plaques/.test(rs)&&/<button class="tile/.test(rs)&&!/completeTask\(/.test(rs),'53 renderStatus: warnings on plaques, tiles are buttons, no direct completeTask');
const tr=slice('function taskRowHtml(','function taskEditHtml(');
ok(!/completeTask\(this/.test(tr)&&/taskTap\(this\.dataset\.id,'check',this\)/.test(tr),'54 task rows go through taskTap');

// ── SPEC_365 R1: today's spending
{const tx=(id,type,amount,category,date)=>({id,type,amount,category,date});
 const r=M.todaySpend([tx(1,'expense',1500,'food',T0),tx(2,'expense',3000,'food',T0),tx(3,'expense',2450,'transport',T0),tx(4,'expense',800,'fun',T0),tx(5,'expense',100,'telecom',T0),
   tx(6,'income',450000,'salary',T0),tx(7,'expense',9999,'food','2026-10-16'),tx(8,'expense',50000,'goal_g1',T0)],T0);
 ok(r.spent===7850&&r.count===5,'R1 todaySpend: only today expenses, goal_* left out',r);
 ok(r.top.length===3&&r.top[0].cat==='food'&&r.top[0].sum===4500&&r.top[0].n===2&&r.top[1].cat==='transport'&&r.top[2].cat==='fun','R1 top-3 by sum with counts',r.top);
 ok(JSON.stringify(M.todaySpend([],T0))==='{"spent":0,"count":0,"top":[]}','R1 empty day');
}

// ── SPEC_365 R2: the [+] type label and the type switch
await (async()=>{
  M.setForce(null);M.setCmdType('expense');
  const L=async(s,forced)=>M.cmdKindLabel(await M.cmdParse(s),forced);
  ok(await L('кофе 1500')==='расход · понял по сумме','R2 label: expense by amount',await L('кофе 1500'));
  ok(await L('+5000 подработка')==='доход · начинается с +','R2 label: income by +',await L('+5000 подработка'));
  ok(await L('созвон с банком завтра 10:00')==='задача · есть дата или время','R2 label: task with date/time',await L('созвон с банком завтра 10:00'));
  ok(await L('купить корм #быт')==='задача · есть #список','R2 label: task with #tag',await L('купить корм #быт'));
  ok(await L('позвонить маме')==='задача · суммы нет','R2 label: task without amount',await L('позвонить маме'));
  ok(await L('кофе')==='похоже на трату — добавь сумму','R2 label: hint',await L('кофе'));
  ok(await L('+ разобрал кейс')==='журнал · начинается с +','R2 label: journal',await L('+ разобрал кейс'));
  ok(M.cmdKindLabel(null,false)==='','R2 label: empty line');
  M.setForce('task','gym');
  const t=await M.cmdParse('купить корм 3000');
  ok(t.kind==='task'&&t.title==='купить корм 3000'&&t.list==='gym'&&M.cmdKindLabel(t,true)==='задача · выбрано вручную','R2 forced task keeps the amount in the title, chosen list',t);
  M.setForce('tx');
  const x=await M.cmdParse('созвон завтра 10:00');
  ok(x.kind==='task'&&!!x.hint,'R2 forced expense on a line without an amount → amount hint, not a task',x);
  const y=await M.cmdParse('кофе 1500');
  ok(y.kind==='tx'&&y.amount===1500&&M.cmdKindLabel(y,true)==='расход · выбрано вручную','R2 forced expense with an amount',y);
  M.setForce(null);
  ok((await M.cmdParse('кофе')).hint&&(await M.cmdParse('+ разобрал кейс')).kind==='journal'&&(await M.cmdParse('+5000 зп')).type==='income','R2 old behaviour kept');
})();

// ── SPEC_365 R3: week «Впереди» (T0 = Sat 17.10.2026 → days Sat, Sun)
{const tk=(id,title,due,extra)=>({id,title,due,list:'inbox',time:'',done:false,...(extra||{})});
 const tasks=[tk('a','Лаба',T0,{time:'14:00'}),tk('b','Созвон',T0,{time:'10:00'}),tk('c','Просрочка','2026-10-15'),tk('d','Тренировка C','2026-10-18',{time:'12:00'}),
   tk('e','Взвеситься',T0,{repeat:{type:'daily'}}),tk('f','Готово',T0,{done:true}),tk('g','Потом','2026-10-21'),tk('h','Сорвано','2026-10-13')];
 const log=[{date:'2026-10-12'},{date:'2026-10-14'},{date:'2026-10-17'},{date:'2026-10-05'}];
 const w=M.weekAhead(tasks,log,T0);
 ok(w.ws==='2026-10-12'&&w.we==='2026-10-18'&&w.days.map(d=>d.date).join()===T0+',2026-10-18','R3 days from today to Sunday',w.days.map(d=>d.date));
 const d0=w.days[0].items.map(i=>i.title);
 ok(d0[0]==='Сорвано'&&d0[1]==='Просрочка'&&w.days[0].items[0].late&&w.days[0].items[1].late,'R3 overdue go to today, first, oldest first',d0);
 ok(d0.indexOf('Созвон')<d0.indexOf('Лаба')&&!d0.includes('Готово'),'R3 sorted by time, done left out',d0);
 ok(w.days[1].items.some(i=>i.title==='Взвеситься'&&i.repeat&&!i.real)&&w.days[1].items.some(i=>i.title==='Тренировка C'&&i.real),'R3 daily repeat gives tomorrow too (not a real instance)',w.days[1].items);
 ok(w.past.done===2&&w.past.planned===4,'R3 past days: 2 done, 2 failed (13.10, 15.10)',w.past);
 ok(w.later.some(e=>e.title==='Потом')&&w.later.length<=5,'R3 later = up to 5 things in the 7 days after Sunday',w.later);}

// ── dates in words (T0 = 17.10.2026): «3 ноября», «31 ноября», «до 5 дек», «в 20:00», year rollover, old undated tasks
{const Q=t=>{const r=M.parseQuickTask(t);return r.title+'|'+r.due+'|'+r.time};
 ok(Q('Брекеты 3 ноября 20:00')==='Брекеты|2026-11-03|20:00','«3 ноября 20:00» → date + time',Q('Брекеты 3 ноября 20:00'));
 ok(Q('КПД закрыть 31 Ноября')==='КПД закрыть|2026-11-30|','«31 Ноября» (no such day, capital letter) → last day of November',Q('КПД закрыть 31 Ноября'));
 ok(Q('созвон 3 ноября в 20:00')==='созвон|2026-11-03|20:00','«3 ноября в 20:00» — the preposition goes too',Q('созвон 3 ноября в 20:00'));
 ok(Q('сдать отчёт до 5 дек')==='сдать отчёт|2026-12-05|','short month + «до»',Q('сдать отчёт до 5 дек'));
 ok(Q('поездка 10 января')==='поездка|2027-01-10|','a date already past this year → next year',Q('поездка 10 января'));
 ok(Q('отпуск 5 мая 2027')==='отпуск|2027-05-05|','explicit year',Q('отпуск 5 мая 2027'));
 ok(Q('прочитать 3 главы')==='прочитать 3 главы||'&&Q('3 ноября')==='3 ноября||','no month word → no date; a title is never empty',[Q('прочитать 3 главы'),Q('3 ноября')]);
 ok(Q('встреча 03.11')==='встреча|2026-11-03|'&&Q('тренировка #зал вт 18:00')==='тренировка|2026-10-20|18:00','old formats still work (03.11, weekday, #list)',[Q('встреча 03.11'),Q('тренировка #зал вт 18:00')]);
 const fx=M.undatedTaskFix({id:'a',title:'Брекеты 3 ноября',time:'20:00',due:'',done:false,repeat:null});
 ok(fx&&fx.title==='Брекеты'&&fx.due==='2026-11-03'&&fx.time==='20:00','an old undated task gets its date out of the title',fx);
 ok(M.undatedTaskFix({title:'КПД 31 ноября',due:'',done:true})===null&&M.undatedTaskFix({title:'КПД 31 ноября',due:'2026-11-01'})===null&&M.undatedTaskFix({title:'вода',due:''})===null&&M.undatedTaskFix({title:'отчёт 5 дек',due:'',repeat:{type:'daily'}})===null,'done / dated / repeating / dateless titles are left alone');}

console.log(`status_cmd: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
