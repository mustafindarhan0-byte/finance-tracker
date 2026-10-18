// Body 2.0 · B1 muscle map: node tests/body.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
const i=src.indexOf('// ── Body 2.0 · B1: muscle map ──'),j=src.indexOf('let bodySeg=',i);
if(i<0||j<0)throw new Error('body block not found');
const ctx={console};vm.createContext(ctx);
vm.runInContext(`function parseLocalDate(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function localDate(d){const z=d.getTimezoneOffset()*60000;return new Date(d-z).toISOString().slice(0,10)}
function addDays(s,n){const d=parseLocalDate(s);d.setDate(d.getDate()+n);return localDate(d)}
function daysBetween(a,b){return Math.round((parseLocalDate(b)-parseLocalDate(a))/86400000)}
function isoWeekday(s){const w=parseLocalDate(s).getDay();return w===0?7:w}
function weekStart(d){return addDays(d,-(isoWeekday(d)-1))}
const fmtNum=n=>String(n).replace('.',',');
${src.slice(i,j)};this.B={MUSCLES,EXERCISE_MUSCLES,exerciseMuscles,muscleLoad,muscleRecovery,muscleVerdict,bodyPolys,BODY_SHAPES,SKILL_TREES,evaluateSkillTree,bestStreak,avgBodyWeight,volumeWeeks};`,ctx);
const B=ctx.B;let pass=0,fail=0;
const ok=(c,n)=>{if(c)pass++;else{fail++;console.log('FAIL',n)}};

const plans=[{id:'A',name:'A',exercises:[{id:'squat',name:'Присед'},{id:'bench',name:'Жим лёжа'},{id:'x1',name:'Подъём на носки'},{id:'x2',name:'Непонятное'}]}];
const wo=(date,entries,extra)=>({id:date,planId:'A',date,at:new Date(date+'T19:00:00').getTime(),done:true,entries,...(extra||{})});
const W=[
  wo('2026-10-12',[{exId:'squat',reps:[8,8,8]},{exId:'bench',reps:[8,8,null]}]),
  wo('2026-10-17',[{exId:'squat',reps:[5,5,5]},{exId:'x1',reps:[15,15]},{exId:'x2',reps:[10]}]),
  wo('2026-10-01',[{exId:'bench',reps:[8,8,8]}]),                       // outside the window
  {...wo('2026-10-16',[{exId:'bench',reps:[8,8,8]}]),done:false},        // unfinished
  wo('2026-10-15',[{exId:'bench',reps:[0,null,null]}])                   // zero reps → no set
];
const L=B.muscleLoad(W,plans,'2026-10-11','2026-10-17');
ok(L.quads===6,'quads: 3+3 primary sets → 6 ('+L.quads+')');
ok(L.glutes===6,'glutes primary 6');
ok(L.hamstrings===3,'hamstrings secondary 0.5×6 → 3 ('+L.hamstrings+')');
ok(L.chest===2,'chest: bench 2 sets in window (the 01.10 one is outside, unfinished/zero ignored) → 2 ('+L.chest+')');
ok(L.triceps===1,'triceps secondary 0.5×2 → 1');
ok(L.calves===2,'calves via name guess «носки» → 2');
ok(L.neck===0&&L.traps===0,'neck & traps untouched');
ok(Object.keys(L).length===Object.keys(B.MUSCLES).length,'every muscle present in the load map');
ok(B.exerciseMuscles({id:'zz',name:'Шраги со штангой'}).p.includes('traps'),'shrug → traps');
ok(B.exerciseMuscles({id:'zz',name:'Непонятное'}).p.length===0,'unknown exercise → no muscles');
ok(B.exerciseMuscles({id:'zz',name:'x',muscles:{p:['neck']}}).p[0]==='neck','plan exercise can carry its own muscles');
ok(B.exerciseMuscles({id:'zz',name:'Жим лёжа узким'}).p.includes('chest'),'name guess bench');
// recovery
const now=new Date('2026-10-18T09:00:00').getTime();
const R=B.muscleRecovery(W,plans,now);
ok(R.quads.state==='rest','squat on 17.10 19:00 → quads resting at 18.10 09:00 (14 h)');
ok(R.chest.state==='ready','bench 12.10 → chest ready (5.6 days)');
ok(R.neck.state==='none','neck never worked');
const R2=B.muscleRecovery([wo('2026-10-01',[{exId:'bench',reps:[8]}])],plans,now);
ok(R2.chest.state==='stale','bench 17 days ago → stale');
ok(B.muscleVerdict(5)==='low'&&B.muscleVerdict(10)==='ok'&&B.muscleVerdict(20)==='ok'&&B.muscleVerdict(21)==='high','verdict thresholds');
// combat sessions are not counted as lifting sets
const Lc=B.muscleLoad([wo('2026-10-17',[{exId:'squat',reps:[8]}],{kind:'combat'})],plans,'2026-10-11','2026-10-17');
ok(Lc.quads===0,'combat workouts ignored in lifting load');
// shapes: every muscle has a shape on at least one side, and mirrored halves stay inside the viewBox
const drawn=new Set([...B.bodyPolys('front'),...B.bodyPolys('back')].map(p=>p.m));
ok(Object.keys(B.MUSCLES).every(m=>drawn.has(m)),'every muscle drawn: missing '+Object.keys(B.MUSCLES).filter(m=>!drawn.has(m)).join(','));
const allX=[...B.bodyPolys('front'),...B.bodyPolys('back')].flatMap(p=>p.pts.filter((v,k)=>k%2===0));
ok(Math.min(...allX)>=40&&Math.max(...allX)<=160,'shapes inside the 40..160 viewBox');
const neckCount=B.bodyPolys('front').filter(p=>p.m==='neck').length;
ok(neckCount===1,'neck (centre shape) not mirrored → 1 polygon ('+neckCount+')');
ok(B.bodyPolys('front').filter(p=>p.m==='abs').length===2,'abs halves mirrored → 2 polygons');
// all starter-pack exercises are mapped
const ids=['squat','bench','bbrow','dbpress','abs','rdl','incline','pullup','lunge','arms','legpress','ohp','dbrow','dips','plank'];
ok(ids.every(id=>B.EXERCISE_MUSCLES[id]&&B.EXERCISE_MUSCLES[id].p.length),'all 15 plan exercises mapped');
const allMus=new Set(Object.keys(B.MUSCLES));
ok(Object.values(B.EXERCISE_MUSCLES).every(e=>e.p.concat(e.s).every(m=>allMus.has(m))),'catalog uses only known muscle ids');
// ── B2 skill tree
const T=B.SKILL_TREES.body,find=id=>T.find(n=>n.id===id);
ok(T.every(n=>(n.requires||[]).every(r=>find(r))),'every prerequisite exists');
ok(new Set(T.map(n=>n.id)).size===T.length,'node ids unique');
const bwts=[...Array(7)].map((_,k)=>({date:'2026-10-0'+(k+1),kg:70}));
const base={plans,bodyWeights:bwts,habits:[{id:'hp',name:'Белок 120 г+'}],checks:[],profile:{startKg:67},done:{},today:'2026-10-18'};
let r=B.evaluateSkillTree(T,{...base,workouts:[]});
ok(r.s_sq1.state==='open'&&r.s_sq2.state==='locked','squat chain: first open, next locked');
ok(r.s_sq1.target===70&&r.s_sq1.label.includes('0 / 70'),'lift target = 1× avg body weight (70) — '+r.s_sq1.label);
const sq=w=>({id:'q'+w,planId:'A',date:'2026-10-10',at:1,done:true,entries:[{exId:'squat',weight:w,reps:[5,5,5]}]});
r=B.evaluateSkillTree(T,{...base,workouts:[sq(70)]});
ok(r.s_sq1.state==='done'&&r.s_sq1.newly,'squat 70×5 at 70 kg body weight → done (newly)');
ok(r.s_sq2.state==='open','next squat node opens after the first');
r=B.evaluateSkillTree(T,{...base,workouts:[{...sq(80),entries:[{exId:'squat',weight:80,reps:[4,4]}]}]});
ok(r.s_sq1.state==='open','80 kg but only 4 reps → not counted for ×5');
r=B.evaluateSkillTree(T,{...base,workouts:[],done:{s_sq1:'2026-10-01'}});
ok(r.s_sq1.state==='done'&&!r.s_sq1.newly&&r.s_sq2.state==='open','done stays done (history) even without data; children open');
r=B.evaluateSkillTree(T,{...base,bodyWeights:[],workouts:[sq(70)]});
ok(r.s_sq1.state==='open'&&/взвесь/.test(r.s_sq1.label),'no body weight → lift node cannot pass, asks to weigh in');
r=B.evaluateSkillTree(T,{...base,workouts:[{id:'p',planId:'B',date:'2026-10-10',done:true,entries:[{exId:'pullup',weight:null,reps:[6,5,4]}]}]});
ok(r.s_pu1.state==='done'&&r.s_pu2.state==='open'&&r.s_pu2.value===6,'pull-ups best set 6 → 5 done, 10 open (6/10)');
r=B.evaluateSkillTree(T,{...base,workouts:Array.from({length:12},(_,k)=>({...sq(10),id:'w'+k}))});
ok(r.m_w12.state==='done'&&r.m_w36.state==='open','12 done workouts → node done');
ok(B.evaluateSkillTree(T,{...base,workouts:[{...sq(10),kind:'combat'}]}).m_w12.value===0,'combat sessions do not count as lifting workouts');
r=B.evaluateSkillTree(T,{...base,workouts:[]});
ok(r.m_kg2.state==='done'&&r.m_kg4.state==='open','start 67, avg 70 → +3: +2 done, +4 open — '+r.m_kg4.state);
ok(r.m_goal.state==='locked','goal locked until +4 is done');
r=B.evaluateSkillTree(T,{...base,workouts:[],done:{m_kg2:'x',m_kg4:'x'},bodyWeights:bwts.map(x=>({...x,kg:75.2}))});
ok(r.m_goal.state==='done','avg 75.2 ≥ 75 → goal done');
ok(B.avgBodyWeight([{date:'2026-10-01',kg:60},...bwts],7)===70,'average uses the last 7 weigh-ins');
ok(B.bestStreak(['2026-10-01','2026-10-02','2026-10-04','2026-10-05','2026-10-06'])===3,'best streak 3');
const checks=Array.from({length:30},(_,k)=>({habitId:'hp',date:B.SKILL_TREES&&('2026-09-'+String(k+1).padStart(2,'0'))})).filter(c=>c.date<='2026-09-30');
r=B.evaluateSkillTree(T,{...base,workouts:[],checks});
ok(r.m_pr30.state==='done','protein habit 30 days in a row → done');
r=B.evaluateSkillTree(T,{...base,workouts:[],habits:[]});
ok(r.m_pr30.state==='open'&&/нет привычки/.test(r.m_pr30.label),'no protein habit → explains');
ok(r.c_gate.state==='locked'&&B.evaluateSkillTree(T,{...base,workouts:[],done:{s_sq1:1,s_bp1:1,s_pu1:1,m_goal:1}}).c_gate.state==='open','combat gate: locked until strength base + weight goal, then open (not auto-done)');
console.log(`body: ${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
