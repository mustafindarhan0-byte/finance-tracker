// F3.3: checkInvariants() taken from index.html (read-only) and run on synthetic data.
// node tests/integrity.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=[
  slice('const CATS={','const CAT_MAP'),
  slice('const BANK_KEYS=','\n'),
  slice('const SPHERE_OF_LIST=','\n'),
  slice('// ── F3.3 Data integrity check: pure part','// ── F3.3 Data integrity check: UI ──'),
].join('\n');
const ctx={console};vm.createContext(ctx);
vm.runInContext(code+'\n;this.F={checkInvariants,isYmd};',ctx);
const {checkInvariants,isYmd}=ctx.F;

let pass=0,fail=0;
function ok(cond,name,extra){if(cond)pass++;else{fail++;console.log('FAIL',name,extra!==undefined?JSON.stringify(extra,null,1):'')}}
const C=JSON.parse.bind(JSON),J=JSON.stringify;
const clone=o=>C(J(o));
const run=d=>{const r=checkInvariants(d);return{list:Array.from(r),notes:Array.from(r.notes||[])}};
const has=(list,cls,re,kind)=>list.filter(x=>x.cls===cls&&re.test(x.title+' '+x.detail)&&(kind===undefined||(x.fix?x.fix.kind:null)===kind));

// Simulated fix application (mirrors integrityApply on plain data) — a fix must make its issue disappear
function apply(d,f){
  d=clone(d);
  const byId=(arr,id,k='id')=>arr.find(x=>String(x[k])===String(id));
  if(f.kind==='goalSet')byId(d.goals,f.goalId).currentAmount=f.amount;
  else if(f.kind==='xpDel')d.xpLog=d.xpLog.filter(e=>String(e.id)!==f.xpId);
  else if(f.kind==='xpAdd')d.xpLog.push({id:f.xpId,date:f.date,at:f.at,sphere:f.sphere,amount:f.amount,source:f.source});
  else if(f.kind==='xpSet')byId(d.xpLog,f.xpId).amount=f.amount;
  else if(f.kind==='checkDel')d.habitChecks=d.habitChecks.filter(c=>String(c.key)!==f.key);
  else if(f.kind==='debtSet'){const x=byId(d.debts,f.debtId);x.remaining=f.remaining;x.closed=!!f.close;if(f.close)d.tasks=d.tasks.filter(t=>String(t.debtId)!==f.debtId)}
  else if(f.kind==='debtTask'){const x=byId(d.debts,f.debtId);d.tasks.push({id:'new_'+x.id,title:'Платёж: '+x.name,list:'money',due:'2026-11-05',repeat:{type:'monthly',day:x.payDay},done:false,source:'debt',debtId:x.id})}
  else if(f.kind==='taskDel')d.tasks=d.tasks.filter(t=>!f.taskIds.includes(String(t.id)));
  else throw new Error('kind '+f.kind);
  return d;
}

// A consistent dataset WITH the new optional fields
const NEW={
  transactions:[
    {id:'t1',type:'expense',amount:500,category:'food',description:'кофе',date:'2026-10-01',createdAt:1000,source:'manual',bank:'kaspi'},
    {id:'t2',type:'income',amount:300000,category:'salary',description:'зп',date:'2026-10-05',createdAt:5000,source:'statement',bank:'freedom'},
    {id:'t3',type:'expense',amount:20000,category:'goal_g1',description:'Подушка',date:'2026-10-06',createdAt:6000,source:'manual',bank:'cash'},
    {id:'t4',type:'expense',amount:15000,category:'debts',description:'Рассрочка: Телефон',date:'2026-10-10',createdAt:7000,source:'manual',bank:'kaspi',debtId:'d1',logId:'L2'},
    {id:'t5',type:'expense',amount:700,category:'transport',description:'такси',date:'2026-10-11',createdAt:8000,source:'manual'},
  ],
  goals:[{id:'g1',name:'Подушка',targetAmount:500000,currentAmount:120000,deadline:'',createdAt:1}],
  budgets:[{key:'general',limit:150000}],
  debts:[{id:'d1',name:'Телефон',bank:'Kaspi',total:90000,remaining:45000,remaining0:60000,monthly:15000,payDay:10,createdAt:1,closed:false}],
  tasks:[
    {id:'k1',title:'Платёж: Телефон',list:'money',due:'2026-11-10',repeat:{type:'monthly',day:10},done:false,source:'debt',debtId:'d1'},
    {id:'k2',title:'Разобрать образ',list:'dfir',due:'2026-10-02',repeat:null,done:true,xp:40},
    {id:'k3',title:'Тренировка A',list:'gym',due:'2026-10-09',repeat:{type:'weekly',days:[4]},done:false,workoutPlan:'A'},
    {id:'k4',title:'Распределить зарплату',list:'money',due:'2026-10-31',repeat:{type:'monthly_last'},done:false},
  ],
  taskLog:[
    {id:'L1',taskId:'k2',title:'Разобрать образ',list:'dfir',date:'2026-10-02',at:2000,xp:40},
    {id:'L2',taskId:'k1',title:'Платёж: Телефон',list:'money',date:'2026-10-10',at:7000,xp:20},
    {id:'L3',taskId:'k3',title:'Тренировка A',list:'gym',date:'2026-10-02',at:2500,noXp:true},
    {id:'L4',taskId:'k4',title:'Распределить зарплату',list:'money',date:'2026-10-05',at:5000,noXp:true},
  ],
  habits:[{id:'h1',name:'Белок',sphere:'body',order:0,archived:false}],
  habitChecks:[{key:'h1_2026-10-01',habitId:'h1',date:'2026-10-01'}],
  journal:[{id:'j1',text:'заметка',sphere:'dfir',date:'2026-10-03',at:3000}],
  workouts:[{id:'w1',planId:'A',taskId:'k3',date:'2026-10-02',at:2500,done:true,entries:[]},{id:'w2',planId:'B',date:'2026-10-12',at:9000,done:false,entries:[]}],
  allocations:[{id:'a1',date:'2026-10-05',salary:300000,parts:[{label:'Жизнь',amount:150000},{label:'Подушка',amount:100000,goalId:'g1'}]}],
  xpLog:[
    {id:'task_L1',date:'2026-10-02',amount:40,sphere:'dfir',source:'task'},
    {id:'task_L2',date:'2026-10-10',amount:20,sphere:'money',source:'task'},
    {id:'debt_L2',date:'2026-10-10',amount:30,sphere:'money',source:'debt'},
    {id:'habit_h1_2026-10-01',date:'2026-10-01',amount:20,sphere:'body',source:'habit'},
    {id:'journal_j1',date:'2026-10-03',amount:5,sphere:'dfir',source:'journal'},
    {id:'workout_w1',date:'2026-10-02',amount:60,sphere:'body',source:'workout'},
    {id:'alloc_a1',date:'2026-10-05',amount:30,sphere:'money',source:'allocation'},
    {id:'cool_dfir_2026-09-20',date:'2026-09-20',amount:-300,sphere:'dfir',source:'cooling'},
  ],
  settings:[{key:'currency',value:'KZT'},{key:'bal_kaspi',value:100000},{key:'balAt_kaspi',value:4000},{key:'balMode_kaspi',value:'time'},{key:'bal_halyk',value:null}],
};
// The same data in today's shape (no debtId/logId, no goalId, no remaining0, no taskLog xp/noXp)
function oldShape(d){
  d=clone(d);
  d.transactions.forEach(t=>{delete t.debtId;delete t.logId});
  d.allocations.forEach(a=>a.parts.forEach(p=>delete p.goalId));
  d.debts.forEach(x=>delete x.remaining0);
  d.taskLog.forEach(l=>{delete l.xp;delete l.noXp});
  return d;
}
const OLD=oldShape(NEW);

// 1. empty / garbage input
{const r=run({});ok(r.list.length===0&&r.notes.length===0,'empty data → no issues',r)}
{let threw=false;try{run({transactions:null,goals:'x',xpLog:[null,1,{id:'task_zz',amount:5}]});run(undefined)}catch(e){threw=e.message}ok(threw===false,'garbage input does not throw',threw)}
// 2. consistent data with new fields
{const r=run(NEW);ok(r.list.length===0,'consistent NEW → no issues',r.list);ok(!r.notes.some(n=>/remaining0|noXp|goalId|logId/.test(n)),'NEW → no heuristic notes',r.notes)}
// 3. consistent data in old shape — heuristics must not raise false positives, but must say what was skipped
{const r=run(OLD);ok(r.list.length===0,'consistent OLD → no issues',r.list);
 ok(r.notes.some(n=>/remaining0/.test(n)),'OLD → note about remaining0',r.notes);
 ok(r.notes.some(n=>/по названию/.test(n)),'OLD → note: alloc parts matched by goal name',r.notes);
 ok(r.notes.some(n=>/noXp/.test(n)),'OLD → note: noXp heuristic',r.notes);
 ok(r.notes.some(n=>/logId/.test(n)),'OLD → note: debt XP check skipped (no logId)',r.notes)}
// 4. goal more than computed (manual «Пополнить») → info + fix to computed sum
{const d=clone(NEW);d.goals[0].currentAmount=125000;const r=run(d),x=has(r.list,'goal',/больше на 5/,'goalSet');
 ok(x.length===1&&x[0].severity==='info'&&x[0].fix.amount===120000&&/ручные пополнения/.test(x[0].detail),'goal > computed → info, ручные пополнения, fix=120000',r.list);
 ok(run(apply(d,x[0].fix)).list.length===0,'goal fix clears the issue')}
// 5. goal less than computed → warn
{const d=clone(NEW);d.goals[0].currentAmount=20000;const x=has(run(d).list,'goal',/меньше на 100/,'goalSet');ok(x.length===1&&x[0].severity==='warn','goal < computed → warn')}
// 6. old shape goal: allocation without goalId matched by label; removing the label match changes the sum
{const d=clone(OLD);d.allocations[0].parts[1].label='Что-то';const x=has(run(d).list,'goal',/больше на 100/);ok(x.length===1,'OLD: unmatched allocation label → goal mismatch',x)}
// 7. currentAmount not a number
{const d=clone(NEW);delete d.goals[0].currentAmount;const x=has(run(d).list,'goal',/не число/,'goalSet');ok(x.length===1&&x[0].severity==='error','goal currentAmount missing → error')}
// 8. transactions on a deleted goal
{const d=clone(NEW);d.transactions.push({id:'t9',type:'expense',amount:100,category:'goal_gone',description:'x',date:'2026-10-01',createdAt:1});
 const x=has(run(d).list,'goal',/удалённую копилку gone/);ok(x.length===1&&x[0].fix===null&&x[0].ids[0]==='t9','tx on deleted goal → info, no fix',x)}
// 9. debt remaining vs remaining0 − Σ payments
{const d=clone(NEW);d.debts[0].remaining=50000;const r=run(d),x=has(r.list,'debt',/не сходится/,'debtSet');
 ok(x.length===1&&x[0].fix.remaining===45000&&x[0].fix.close===false,'debt remaining mismatch → fix 45000',r.list);
 ok(run(apply(d,x[0].fix)).list.length===0,'debt mismatch fix clears it')}
{const d=clone(NEW);d.transactions.push({id:'t10',type:'expense',amount:45000,category:'debts',description:'Рассрочка: Телефон',date:'2026-10-12',createdAt:9500,bank:'kaspi',debtId:'d1'});
 const x=has(run(d).list,'debt',/не сходится/,'debtSet');ok(x.length===1&&x[0].fix.remaining===0&&x[0].fix.close===true,'debt fully paid by tx → fix closes',x);
 ok(!has(run(d).list,'debt',/нет задачи/).length,'fully paid debt is not asked for a task')}
// 10. closed with remaining > 0
{const d=clone(NEW);d.debts[0].closed=true;d.tasks=d.tasks.filter(t=>t.id!=='k1');d.debts[0].remaining0=45000;d.transactions=d.transactions.filter(t=>t.id!=='t4');
 const x=has(run(d).list,'debt',/закрыта, но остаток/,'debtSet');ok(x.length===1&&x[0].fix.close===true&&x[0].fix.remaining===0,'closed debt with remaining → fix',x)}
// 11. open with remaining 0 (old shape, no remaining0)
{const d=clone(OLD);d.debts[0].remaining=0;const r=run(d),x=has(r.list,'debt',/остаток 0, но не закрыта/,'debtSet');
 ok(x.length===1,'open debt with remaining 0 → close',r.list);ok(!has(r.list,'debt',/нет задачи/).length,'zero-remaining debt: no task demand');
 ok(run(apply(d,x[0].fix)).list.length===0,'close fix also removes its task')}
// 12. open debt without a task / with two tasks
{const d=clone(NEW);d.tasks=d.tasks.filter(t=>t.id!=='k1');const x=has(run(d).list,'debt',/нет задачи-платежа/,'debtTask');
 ok(x.length===1,'open debt without task → debtTask');ok(run(apply(d,x[0].fix)).list.length===0,'debtTask fix clears it')}
{const d=clone(NEW);d.tasks.push({id:'k9',title:'Платёж: Телефон',list:'money',due:'2026-12-10',repeat:{type:'monthly',day:10},done:false,source:'debt',debtId:'d1'});
 const x=has(run(d).list,'debt',/задач-платежей 2/,'taskDel');ok(x.length===1&&J(x[0].fix.taskIds)==='["k9"]','two debt tasks → delete the later one',x)}
// 13. orphan debt tasks
{const d=clone(NEW);d.tasks.push({id:'k8',title:'Платёж: Старое',list:'money',due:'2026-11-01',repeat:{type:'monthly',day:1},done:false,source:'debt',debtId:'dX'});
 const x=has(run(d).list,'debt',/рассрочка удалена/,'taskDel');ok(x.length===1&&x[0].ids[0]==='k8','task → missing debt',x)}
{const d=clone(NEW);d.debts.push({id:'d2',name:'Пылесос',bank:'Halyk',total:30000,remaining:0,monthly:10000,payDay:1,closed:true});
 d.tasks.push({id:'k7',title:'Платёж: Пылесос',list:'money',due:'2026-11-01',repeat:{type:'monthly',day:1},done:false,source:'debt',debtId:'d2'});
 const x=has(run(d).list,'debt',/уже закрыта/,'taskDel');ok(x.length===1,'task → closed debt',x)}
// 14. old shape: weaker upper bound total − payments found by description
{const d=clone(OLD);d.debts[0].remaining=80000;const r=run(d),x=has(r.list,'debt',/больше возможного/);
 ok(x.length===1&&x[0].fix===null&&/remaining0 нет/.test(x[0].detail),'OLD: remaining > total − paid → warn, says remaining0 missing',r.list)}
// 15. XP orphans of every kind
{const d=clone(NEW);d.xpLog.push(
   {id:'task_LX',date:'2026-10-01',amount:20},{id:'habit_h1_2026-10-09',date:'2026-10-09',amount:20},{id:'journal_jX',date:'2026-10-01',amount:5},
   {id:'workout_wX',date:'2026-10-01',amount:60},{id:'workout_w2',date:'2026-10-12',amount:60},{id:'debt_LX',date:'2026-10-01',amount:30},{id:'alloc_aX',date:'2026-10-01',amount:30});
 const r=run(d),o=r.list.filter(x=>x.cls==='xp'&&/Опыт без действия/.test(x.title));
 ok(o.length===7&&o.every(x=>x.fix&&x.fix.kind==='xpDel'),'7 orphan XP entries → xpDel',r.list);
 ok(has(r.list,'xp',/workout_w2.*не завершена/).length===1,'XP for unfinished workout flagged');
 let d2=d;o.forEach(x=>{d2=apply(d2,x.fix)});ok(run(d2).list.length===0,'orphan XP fixes clear everything')}
// 16. unknown prefix (info, no fix), cooling ignored, duplicate ids
{const d=clone(NEW);d.xpLog.push({id:'bonus_1',date:'2026-10-01',amount:10},{id:'task_L1',date:'2026-10-02',amount:40});
 const r=run(d);ok(has(r.list,'xp',/Неизвестный тип.*bonus_1/).length===1&&has(r.list,'xp',/bonus_1/)[0].fix===null,'unknown XP prefix → info without fix',r.list);
 ok(has(r.list,'xp',/Дубль записи опыта task_L1/).length===1,'duplicate XP id → warn');ok(!r.list.some(x=>x.ids.includes('cool_dfir_2026-09-20')),'cool_ entries accepted')}
// 17. missing XP for each action kind, with correct amount/sphere/date
{const d=clone(NEW);d.xpLog=d.xpLog.filter(e=>e.id.startsWith('cool_'));
 const r=run(d),add=r.list.filter(x=>x.fix&&x.fix.kind==='xpAdd'),m={};add.forEach(x=>m[x.fix.xpId]=x.fix);
 ok(J(Object.keys(m).sort())===J(['alloc_a1','debt_L2','habit_h1_2026-10-01','journal_j1','task_L1','task_L2','workout_w1']),'all 7 missing XP found',Object.keys(m));
 ok(m.task_L1.amount===40&&m.task_L1.sphere==='dfir'&&m.task_L1.date==='2026-10-02'&&m.task_L1.at===2000,'task XP from taskLog.xp, sphere by list, action date',m.task_L1);
 ok(m['habit_h1_2026-10-01'].amount===20&&m['habit_h1_2026-10-01'].sphere==='body'&&m.journal_j1.amount===5&&m.workout_w1.amount===60&&m.workout_w1.sphere==='body'&&m.alloc_a1.amount===30&&m.debt_L2.amount===30,'habit 20 / journal 5 / workout 60 / alloc 30 / debt 30');
 let d2=d;add.forEach(x=>{d2=apply(d2,x.fix)});ok(run(d2).list.length===0,'missing-XP fixes clear everything',run(d2).list)}
// 18. task XP amount: taskLog.xp wins; old shape compares with task.xp
{const d=clone(NEW);d.xpLog.find(e=>e.id==='task_L1').amount=20;const x=has(run(d).list,'xp',/task_L1: 20 вместо 40/,'xpSet');ok(x.length===1&&x[0].severity==='info','taskLog.xp=40 but 20 awarded → xpSet')}
{const d=clone(OLD);d.tasks.find(t=>t.id==='k2').xp=50;const x=has(run(d).list,'xp',/task_L1: 40 вместо 50.*task\.xp/);ok(x.length===1,'OLD: compares with current task.xp and says so',x)}
{const d=clone(OLD);d.tasks.find(t=>t.id==='k2').xp=0;d.xpLog=d.xpLog.filter(e=>e.id!=='task_L1');ok(!has(run(d).list,'xp',/task_L1/).length,'task with xp 0 needs no XP entry')}
// 19. noXp: XP present despite noXp=true → warn; absent → fine
{const d=clone(NEW);d.xpLog.push({id:'task_L3',date:'2026-10-02',amount:20});const x=has(run(d).list,'xp',/без опыта: task_L3/,'xpDel');ok(x.length===1&&x[0].severity==='warn','noXp=true but XP → xpDel')}
// 20. old shape: XP for a task that a workout closed → possible double award (info)
{const d=clone(OLD);d.xpLog.push({id:'task_L3',date:'2026-10-02',amount:20});const x=has(run(d).list,'xp',/двойной опыт: task_L3/,'xpDel');ok(x.length===1&&x[0].severity==='info'&&/эвристика/.test(x[0].detail),'OLD: workout task XP → possible double (heuristic)',x)}
// 21. old shape: ordinary task log without XP is still reported
{const d=clone(OLD);d.xpLog=d.xpLog.filter(e=>e.id!=='task_L1');const x=has(run(d).list,'xp',/Нет опыта: задача «Разобрать образ»/,'xpAdd');ok(x.length===1&&x[0].fix.amount===40&&/task\.xp/.test(x[0].detail),'OLD: missing task XP, amount from task.xp',x)}
// 22. debt tx with logId not in taskLog
{const d=clone(NEW);d.transactions.find(t=>t.id==='t4').logId='L404';const r=run(d);ok(has(r.list,'xp',/logId L404/).length===1,'debt tx logId without taskLog → info',r.list)}
// 23. tasks: done with repeat, repeat without due
{const d=clone(NEW);d.tasks.push({id:'k5',title:'Бег',list:'gym',due:'2026-10-01',repeat:{type:'daily'},done:true},{id:'k6',title:'DFIR',list:'dfir',due:'',repeat:{type:'weekly',days:[1]},done:false});
 const r=run(d);ok(has(r.list,'task',/Бег.*выполнена, но с повтором/).length===1,'done task with repeat');ok(has(r.list,'task',/DFIR.*повтор без даты/).length===1,'repeat task without due')}
// 24. habit checks for missing habits / bad key
{const d=clone(NEW);d.habitChecks.push({key:'hX_2026-10-02',habitId:'hX',date:'2026-10-02'},{key:'h1_2026-10-05',habitId:'h1',date:'2026-10-04'});
 d.xpLog.push({id:'habit_hX_2026-10-02',date:'2026-10-02',amount:20},{id:'habit_h1_2026-10-05',date:'2026-10-04',amount:20});
 const r=run(d),x=has(r.list,'task',/без привычки: hX_2026-10-02/,'checkDel');
 ok(x.length===1&&/Опыт за отметку останется/.test(x[0].detail),'check for deleted habit → checkDel',r.list);
 ok(has(r.list,'task',/h1_2026-10-05: ключ не совпадает/).length===1,'check key mismatch → info');
 ok(!has(r.list,'xp',/Нет опыта: привычка/).length,'no XP demand for a check of a deleted habit')}
// 25. transaction field validation
{const d=clone(NEW);d.transactions.push(
   {id:'b1',type:'expense',amount:0,category:'food',description:'ноль',date:'2026-10-01',createdAt:1},
   {id:'b2',type:'expense',amount:NaN,category:'food',description:'nan',date:'2026-10-01',createdAt:10000},
   {id:'b3',type:'expense',amount:'100',category:'food',description:'строка',date:'2026-10-01',createdAt:20000},
   {id:'b4',type:'expense',amount:100,category:'food',description:'30 февраля',date:'2026-02-30',createdAt:30000},
   {id:'b5',type:'expense',amount:100,category:'food',description:'точки',date:'17.10.2026',createdAt:40000},
   {id:'b6',type:'expense',amount:100,category:'casino',description:'кат',date:'2026-10-01',createdAt:50000},
   {id:'b7',type:'expense',amount:100,category:'food',description:'банк',date:'2026-10-01',createdAt:60000,bank:'sber'},
   {id:'b8',type:'transfer',amount:100,category:'food',description:'тип',date:'2026-10-01',createdAt:70000},
   {id:'b9',type:'expense',amount:100,description:'без кат',date:'2026-10-01',createdAt:80000},
   {id:'b10',type:'expense',amount:100,category:'food',description:'пустой банк',date:'2026-10-01',createdAt:90000,bank:''});
 const r=run(d),tx=r.list.filter(x=>x.cls==='tx'),by=id=>tx.find(x=>x.ids.includes(id));
 ok(['b1','b2','b3','b4','b5','b8','b9'].every(id=>by(id)&&by(id).severity==='error'),'bad amount/date/type/category → error',tx);
 ok(by('b6')&&by('b6').severity==='warn'&&/casino/.test(by('b6').detail),'unknown category → warn');
 ok(by('b7')&&/sber/.test(by('b7').detail),'unknown bank → warn');ok(!by('b10'),'empty bank is fine');
 ok(isYmd('2024-02-29')&&!isYmd('2026-02-29')&&!isYmd('2026-13-01'),'isYmd calendar check')}
// 26. duplicates within 2 s
{const base={type:'expense',amount:500,category:'food',description:'кофе',date:'2026-10-01',bank:'kaspi',source:'manual'};
 const d=clone(NEW);d.transactions.push({...base,id:'x1',createdAt:1500},{...base,id:'x2',createdAt:2900},{...base,id:'x3',createdAt:9000},{...base,id:'x4',createdAt:9100,bank:'halyk'});
 const r=run(d),dup=r.list.filter(x=>x.cls==='tx'&&/дубль/.test(x.title));
 ok(dup.length===2&&dup.every(x=>x.severity==='warn'),'manual dups: t1/x1 and x1/x2; 6 s apart and other bank not dup',dup.map(x=>x.ids));
 const s={type:'expense',amount:1200,category:'food',description:'MAGNUM',date:'2026-10-02',source:'statement'};
 const d2=clone(NEW);d2.transactions.push({...s,id:'s1',createdAt:50},{...s,id:'s2',createdAt:50});
 const x=run(d2).list.filter(x=>/дубль/.test(x.title));ok(x.length===1&&x[0].severity==='info'&&/из выписки/.test(x[0].detail),'statement dups → info only',x)}
// 27. bank snapshots in pairs
{const d=clone(NEW);d.settings.push({key:'bal_freedom',value:5000},{key:'balAt_forte',value:123});
 const r=run(d),b=r.list.filter(x=>x.cls==='bank');
 ok(b.length===2&&has(b,'bank',/freedom: нет времени/).length===1&&has(b,'bank',/forte: нет суммы/).length===1,'bal_ without balAt_ and vice versa; balMode_/null ignored',b)}
// 28. every issue is well-formed
{const d=clone(OLD);d.goals[0].currentAmount=1;d.debts[0].remaining=0;d.xpLog.push({id:'zzz',amount:1});d.transactions.push({id:'q',type:'x'});d.settings.push({key:'bal_halyk',value:1});
 const r=run(d);ok(r.list.length>=5&&r.list.every(x=>['goal','debt','xp','task','tx','bank'].includes(x.cls)&&['error','warn','info'].includes(x.severity)&&x.title&&Array.isArray(x.ids)&&x.ids.every(i=>typeof i==='string')&&(x.fix===null||typeof x.fix.kind==='string')),'issue shape',r.list)}

console.log(`integrity: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
