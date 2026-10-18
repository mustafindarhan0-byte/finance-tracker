// Body 2.0 · B1 muscle map: node tests/body.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
const i=src.indexOf('// ── Body 2.0 · B1: muscle map ──'),j=src.indexOf('let bodySeg=',i);
if(i<0||j<0)throw new Error('body block not found');
const ctx={console};vm.createContext(ctx);
vm.runInContext(`function parseLocalDate(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
${src.slice(i,j)};this.B={MUSCLES,EXERCISE_MUSCLES,exerciseMuscles,muscleLoad,muscleRecovery,muscleVerdict,bodyPolys,BODY_SHAPES};`,ctx);
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
console.log(`body: ${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
