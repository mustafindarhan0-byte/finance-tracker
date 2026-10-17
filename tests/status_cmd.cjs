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
ctx.settings={bal_freedom:10000,balAt_freedom:before-1000};
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

console.log(`status_cmd: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
