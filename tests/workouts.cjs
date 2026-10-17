// Module 5 (workouts): pure parts + input handlers, taken from index.html (read-only) and run with stubs.
// node tests/workouts.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=slice('// ── Module 5: workouts and body weight ──','// ── Shell: navigation');

// Minimal DOM: elements by id, a body root that counts full re-renders
function el(id){return{id,textContent:'',innerHTML:'',value:'',dataset:{},classList:{s:new Set(),toggle(c,on){on?this.s.add(c):this.s.delete(c)},contains(c){return this.s.has(c)}}}}
const dom={};
let renders=0;
const root={_h:'',set innerHTML(v){renders++;this._h=v},get innerHTML(){return this._h},querySelector:()=>null};
const document={activeElement:null,getElementById:id=>id==='body-root'?root:(dom[id]||null)};
const flashes=[],puts=[],dels=[];
let confirmAnswer=true,confirms=0;
const ctx={
  console,document,
  colCache:{},tasksCache:[],
  today:()=>'2026-10-17',
  parseLocalDate:s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)},
  fmtNum:n=>String(n).replace('.',','),
  fmt:n=>Number(n).toLocaleString('ru-RU'),
  escapeHtml:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  ico:()=>'<svg/>',formatTaskDate:s=>s,uid:(()=>{let n=0;return()=>'new'+(++n)})(),toast:()=>{},
  fxFlash:e=>flashes.push(e),fxDraw:()=>{},
  getCol:async n=>(ctx.colCache[n]||(ctx.colCache[n]={data:[]})).data,getTasks:async()=>ctx.tasksCache,
  colPut:async(n,x)=>{puts.push([n,x]);const a=await ctx.getCol(n),i=a.findIndex(y=>y.id===x.id);if(i>=0)a[i]=x;else a.push(x)},
  colDel:async(n,id)=>{dels.push([n,id]);const a=await ctx.getCol(n),i=a.findIndex(y=>y.id===id);if(i>=0)a.splice(i,1)},
  awardXp:async(id,sphere,amount)=>({id,sphere,amount}),completeTask:async()=>{},checkAchievements:()=>{},
  confirm:()=>{confirms++;return confirmAnswer},
};
vm.createContext(ctx);
vm.runInContext(code+`
;this.M={lastDoneEntry,suggestWeight,pendingWorkoutTask,workoutSummary,parseKg,parseRepsVal,staleWorkout,wkClean,
  setWeight,setReps,startWorkout,finishWorkout,resumeWorkout,refreshBody,renderBody,
  get wk(){return wk},set wk(v){wk=v},get wkCur(){return wkCur},set wkCur(v){wkCur=v},get wkSummary(){return wkSummary}};`,ctx);
const M=ctx.M;

let pass=0,fail=0;
function ok(cond,name,extra){if(cond)pass++;else{fail++;console.log('FAIL',name,extra!==undefined?JSON.stringify(extra):'')}}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const EX={id:'squat',name:'Присед',sets:3,repsMin:8,repsMax:10,step:2.5};
const W=(id,date,entries,extra)=>({id,planId:'A',date,at:Date.parse(date),done:true,entries,...extra});
const setWorkouts=ws=>{ctx.colCache.workouts={data:ws}};
ctx.colCache.workoutPlans={data:[{id:'A',name:'План A',exercises:[EX,{id:'pull',name:'Подтягивания',sets:2,repsMin:5,repsMax:8,step:0}]}]};

// ── suggestWeight / lastDoneEntry ──
setWorkouts([]);
ok(M.suggestWeight(EX)===null,'1 no history → null');
setWorkouts([W('w1','2026-10-10',[{exId:'squat',weight:60,reps:[10,10,10]}])]);
ok(M.suggestWeight(EX)===62.5,'2 all sets at max → +step',M.suggestWeight(EX));
setWorkouts([W('w1','2026-10-10',[{exId:'squat',weight:60,reps:[10,9,10]}])]);
ok(M.suggestWeight(EX)===60,'3 one set below max → same weight');
setWorkouts([W('w1','2026-10-10',[{exId:'squat',weight:60,reps:[10,10]}])]);
ok(M.suggestWeight(EX)===60,'4 fewer sets than planned → same weight');
setWorkouts([W('w1','2026-10-08',[{exId:'squat',weight:55,reps:[10,10,10]}]),W('w2','2026-10-12',[{exId:'squat',weight:null,reps:[8,8,8]}])]);
ok(M.suggestWeight(EX)===57.5,'5 last entry without weight → look further back',M.suggestWeight(EX));
ok(M.lastDoneEntry('squat').weight===null,'6 lastDoneEntry default still returns the newest logged entry');
setWorkouts([W('w1','2026-10-08',[{exId:'squat',weight:50,reps:[8,8,8]}]),W('w2','2026-10-12',[{exId:'squat',weight:NaN,reps:[10,10,10]}]),W('w3','2026-10-14',[{exId:'squat',weight:70,reps:[10,10,10]}],{done:false})]);
ok(M.suggestWeight(EX)===50,'7 NaN weight skipped, unfinished workout ignored',M.suggestWeight(EX));
setWorkouts([W('w1','2026-10-12',[{exId:'squat',weight:40,reps:[10,10,10]}],{at:1}),W('w2','2026-10-12',[{exId:'squat',weight:45,reps:[8,8,8]}],{at:2})]);
ok(M.suggestWeight(EX)===45,'8 same date → later `at` wins');
setWorkouts([W('w1','2026-10-12',[{exId:'squat',weight:60,reps:[null,null,null]}]),W('w0','2026-10-01',[{exId:'squat',weight:30,reps:[10,10,10]}])]);
ok(M.suggestWeight(EX)===32.5,'9 entry with no sets logged is skipped');
ok(M.suggestWeight({...EX,step:0})===30,'10 step 0 → no increment');

// ── pendingWorkoutTask ──
const T=(id,due,extra)=>({id,title:'Тренировка '+id,workoutPlan:'A',due,done:false,...extra});
ctx.tasksCache=[T('up','2026-10-19'),T('od2','2026-10-15'),T('od1','2026-10-12'),T('td','2026-10-17')];
ok(M.pendingWorkoutTask().id==='td','11 today first');
ctx.tasksCache=[T('up','2026-10-19'),T('od2','2026-10-15'),T('od1','2026-10-12'),T('doneOld','2026-10-01',{done:true})];
ok(M.pendingWorkoutTask().id==='od1','12 then the oldest overdue (done ignored)');
ctx.tasksCache=[T('up2','2026-10-25'),T('up1','2026-10-19'),{id:'x',title:'не тренировка',due:'2026-10-17',done:false}];
ok(M.pendingWorkoutTask().id==='up1','13 then the nearest upcoming; tasks without workoutPlan ignored');
ctx.tasksCache=[];
ok(M.pendingWorkoutTask()===null,'14 nothing → null');

// ── parsing ──
const P=v=>M.parseKg(v);
ok(eq(P('62,5'),{ok:true,val:62.5})&&eq(P(' 80 '),{ok:true,val:80})&&eq(P('62.'),{ok:true,val:62}),'15 valid weights incl. comma');
ok(eq(P(''),{ok:true,val:null}),'16 empty weight → null');
ok(['abc','6,2,5','-5','1e3','62кг','NaN','600'].every(v=>P(v).ok===false),'17 garbage / out of range rejected');
ok(eq(M.parseRepsVal('8'),{ok:true,val:8})&&eq(M.parseRepsVal(''),{ok:true,val:null})&&['8.5','x','-1','1000','101'].every(v=>M.parseRepsVal(v).ok===false),'18 reps parsing');

// ── summary / volume ──
const S=M.workoutSummary({entries:[{exId:'squat',weight:60,reps:[10,10,8]},{exId:'pull',weight:null,reps:[8,6]},{exId:'bench',weight:40,reps:[null,null,null]},{exId:'row',weight:NaN,reps:[10,NaN,null]}]});
ok(eq(S,{exercises:3,total:4,sets:6,reps:52,volume:1680}),'19 summary: volume = Σ kg×reps, bodyweight/NaN weight add 0',S);
ok(M.workoutSummary({entries:[{exId:'squat',weight:62.5,reps:[3]}]}).volume===187.5,'20 fractional volume');

// ── stale workout ──
setWorkouts([W('a','2026-10-15',[],{done:false}),W('b','2026-10-16',[],{done:false}),W('c','2026-10-17',[],{done:false}),W('d','2026-10-14',[],{done:true})]);
ok(M.staleWorkout().id==='b','21 newest unfinished from an earlier day');
const cl=M.wkClean({entries:[{weight:NaN,reps:[NaN,8,null,'x']}]});
ok(eq(cl.entries[0],{weight:null,reps:[null,8,null,null]}),'22 wkClean removes NaN',cl);

// ── input handlers do not re-render; flash on the sets wrapper that stays in the DOM ──
(async()=>{
  setWorkouts([W('h','2026-10-10',[{exId:'squat',weight:60,reps:[10,10,10]}])]);
  ['wo-cap','wo-list','wo-hint','sets-wrap'].forEach(id=>dom[id]=el(id));dom['wo-hint'].dataset.base='3×8–10';
  await M.startWorkout('A',null);
  ok(M.wk&&M.wk.entries[0].weight===62.5,'23 start uses suggestion',M.wk&&M.wk.entries[0]);
  const r0=renders,inp=Object.assign(el('s0'),{dataset:{x:'0'}});
  M.setReps(0,'8',inp);M.setReps(1,'9',Object.assign(el('s1'),{dataset:{x:'0'}}));
  ok(renders===r0,'24 setReps does not rebuild the screen',{renders,r0});
  ok(eq(M.wk.entries[0].reps,[8,9,null])&&dom['wo-list'].innerHTML.includes('Присед'),'25 model + exercise list updated');
  ok(flashes.length===0,'26 no flash before all sets are filled');
  M.setReps(2,'10',Object.assign(el('s2'),{dataset:{x:'0'}}));
  ok(flashes.length===1&&flashes[0]===dom['sets-wrap']&&renders===r0,'27 flash once on #sets-wrap, still no re-render');
  M.setReps(2,'9',Object.assign(el('s2'),{dataset:{x:'0'}}));
  ok(flashes.length===1,'28 editing a filled set does not flash again');
  const wi=Object.assign(el('w'),{dataset:{x:'0'}});
  M.setWeight('abc',wi);
  ok(M.wk.entries[0].weight===62.5&&wi.value==='62,5'&&dom['wo-hint'].classList.contains('warn')&&!/NaN/.test(dom['wo-hint'].textContent),'29 garbage weight keeps previous value + hint',{w:M.wk.entries[0].weight,v:wi.value});
  M.setWeight('65',wi);
  ok(M.wk.entries[0].weight===65&&!dom['wo-hint'].classList.contains('warn')&&dom['wo-hint'].textContent==='3×8–10'&&/сегодня \+5 кг/.test(dom['wo-cap'].textContent),'30 valid weight clears hint, caption shows delta',dom['wo-cap'].textContent);
  const ri=Object.assign(el('s1'),{dataset:{x:'0'}});M.setReps(1,'zz',ri);
  ok(M.wk.entries[0].reps[1]===9&&ri.value===9,'31 garbage reps keep previous value');
  ok(!/NaN/.test(root.innerHTML),'32 no NaN in the rendered screen');
  // finish with sets → summary, no confirm
  confirms=0;await M.finishWorkout();
  ok(confirms===0&&M.wk===null&&M.wkSummary&&M.wkSummary.xp===60&&M.wkSummary.exercises===1&&M.wkSummary.volume===65*(8+9+9),'33 finish → summary with volume and XP',M.wkSummary);
  ok(/Тренировка завершена/.test(root.innerHTML)&&/\+60/.test(root.innerHTML),'34 summary block rendered');
  // finish with all sets empty → confirm; "no" keeps the workout
  await M.startWorkout('A',null);confirmAnswer=false;confirms=0;
  await M.finishWorkout();
  ok(confirms===1&&M.wk!==null,'35 empty finish asks and "no" keeps the workout');
  confirmAnswer=true;await M.finishWorkout();
  ok(M.wk===null&&M.wkSummary.sets===0,'36 empty finish confirmed');
  // stale workout offered and resumable
  setWorkouts([W('old','2026-10-15',[{exId:'squat',weight:60,reps:[10,null,null]},{exId:'pull',weight:null,reps:[null,null]}],{done:false})]);
  M.wk=null;await M.refreshBody();
  ok(M.wk===null&&/Продолжить тренировку от 15 октября/.test(root.innerHTML)&&/Отменить её/.test(root.innerHTML),'37 stale workout offered, not auto-resumed');
  M.resumeWorkout('old');
  ok(M.wk&&M.wk.id==='old'&&M.wkCur===0&&/от 15 октября/.test(root.innerHTML),'38 resume opens it with its date');
  console.log(`workouts: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
