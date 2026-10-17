// F6.6 / F6.7 / F6.9 foundation: starter pack dates and ids, import toast, launch shortcuts, first-run checklist,
// bottom sheet (fake DOM), service worker fetch strategy (mocked caches/fetch), manifest and maskable icon.
// Code is taken from index.html / sw.js (read-only) and run in a sandbox.  Run: node tests/foundation.cjs
const fs=require('fs'),vm=require('vm'),path=require('path'),zlib=require('zlib');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}

let pass=0,fail=0;
function check(name,cond,info){if(cond){pass++;console.log('ok  ',name)}else{fail++;console.log('FAIL',name,info===undefined?'':JSON.stringify(info))}}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const tick=()=>new Promise(r=>setImmediate(r));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ── sandbox with the pure part + the sheet ──
class El{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parent=null;this.attrs={};this.listeners={};this.className='';this.textContent='';this.id='';this.value='';this.type=''}
  get classList(){const s=this;return{add:c=>{if(!s.classList.contains(c))s.className=(s.className+' '+c).trim()},remove:c=>{s.className=s.className.split(/\s+/).filter(x=>x&&x!==c).join(' ')},contains:c=>s.className.split(/\s+/).includes(c)}}
  appendChild(c){c.parent=this;this.children.push(c);return c}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null}}
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return this.attrs[k]}
  addEventListener(t,f){(this.listeners[t]=this.listeners[t]||[]).push(f)}
  click(){(this.listeners.click||[]).forEach(f=>f({type:'click'}))}
  focus(){doc.activeElement=this}
  select(){}
  get offsetWidth(){return 0}
}
const docListeners=[];
const doc={
  body:new El('body'),activeElement:null,
  createElement:t=>new El(t),
  addEventListener:(t,f)=>{if(t==='keydown')docListeners.push(f)},
  removeEventListener:(t,f)=>{const i=docListeners.indexOf(f);if(i>=0)docListeners.splice(i,1)},
};
function key(k,shift){const e={key:k,shiftKey:!!shift,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){}};docListeners.slice().forEach(f=>f(e));return e}
function find(el,cls){if(el.className&&el.className.split(/\s+/).includes(cls))return el;for(const c of el.children){const r=find(c,cls);if(r)return r}return null}
const layers=()=>doc.body.children.filter(c=>c.classList.contains('sheet-layer'));

const nativeConfirm=()=>{throw new Error('native confirm must not run while the sheet is available')};
const nativePrompt=()=>{throw new Error('native prompt must not run while the sheet is available')};
const ctx={console,URLSearchParams,setTimeout,clearTimeout,document:doc,confirm:nativeConfirm,prompt:nativePrompt,reducedMotion:()=>true};
ctx.window=ctx;
vm.createContext(ctx);
const code=[
  slice('function localDate(','\n'),
  slice('const EXTRA_STORES=','function docId('),
  slice('function escapeHtml(','\n'),
  slice('const pad2=','// Completed early'),
  slice('function daysBetween(','\n'),
  slice('// firstrun:pure-begin','// firstrun:pure-end'),
  slice('// sheet:dom-begin','// sheet:dom-end'),
].join('\n');
vm.runInContext(code+'\n;this.F={STARTER_PACK,starterPackDocs,countsText,importSummary,launchIntent,LAUNCH_VIEWS,sheetMessage,sheetNextFocus,firstRunStateFrom,firstRunChecklistHtml,sheetConfirm,sheetPrompt,isoWeekday,addDays,daysBetween,ALL_STORES};',ctx);
const F=ctx.F;

(async()=>{
  // ── starter pack ──
  const P=F.STARTER_PACK,NOW=1792000000000;
  const d1=F.starterPackDocs(P,'2026-10-17',{},NOW); // Saturday
  check('starter: 22 tasks, 2 habits, 3 plans',d1.tasks.length===22&&d1.habits.length===2&&d1.workoutPlans.length===3,[d1.tasks.length,d1.habits.length,d1.workoutPlans.length]);
  const ids=d1.tasks.map(t=>t.id);
  check('starter: ids are the seed ids (deterministic, unique, seed_*)',eq(ids,P.tasks.map(t=>t.id))&&new Set(ids).size===22&&ids.every(i=>i.startsWith('seed_')));
  const rep=d1.tasks.filter(t=>t.repeat);
  check('starter: repeating tasks start after today, on their weekday, within a week',rep.filter(t=>t.repeat.type==='weekly').every(t=>t.due>'2026-10-17'&&t.repeat.days.includes(F.isoWeekday(t.due))&&F.daysBetween('2026-10-17',t.due)<=7),rep.map(t=>t.id+':'+t.due));
  const by=Object.fromEntries(d1.tasks.map(t=>[t.id,t]));
  check('starter: Тренировка A → next Tuesday 2026-10-20, C → Sunday 2026-10-18',by.seed_gymA.due==='2026-10-20'&&by.seed_gymC.due==='2026-10-18',[by.seed_gymA.due,by.seed_gymC.due]);
  check('starter: «Распределить зарплату» → last day of the month',by.seed_salary.due==='2026-10-31',by.seed_salary.due);
  const weeks=d1.tasks.filter(t=>/^seed_dfir_w\d\d$/.test(t.id)).sort((a,b)=>a.id<b.id?-1:1);
  check('starter: DFIR week 1 → first Monday after today',weeks[0].due==='2026-10-19',weeks[0].due);
  check('starter: DFIR weeks keep 7-day spacing (w12 = w1 + 77 days)',weeks.every((t,i)=>i===0||F.daysBetween(weeks[i-1].due,t.due)===7)&&weeks[11].due===F.addDays(weeks[0].due,77),weeks.map(t=>t.due));
  const mon=F.starterPackDocs(P,'2026-10-19',{},NOW).tasks.find(t=>t.id==='seed_dfir_w01');
  check('starter: on a Monday, week 1 starts next Monday (strictly after today)',mon.due==='2026-10-26',mon.due);
  const early=F.starterPackDocs(P,'2026-09-01',{},NOW).tasks;
  check('starter: before the seed dates the plan moves earlier too',early.find(t=>t.id==='seed_dfir_w01').due==='2026-09-07'&&early.find(t=>t.id==='seed_dfir_w02').due==='2026-09-14');
  const eom=F.starterPackDocs(P,'2026-10-31',{},NOW).tasks.find(t=>t.id==='seed_salary');
  check('starter: on the last day of a month, salary task → end of next month',eom.due==='2026-11-30',eom.due);
  check('starter: fresh state (not done, createdAt now, source seed, habits active)',d1.tasks.every(t=>t.done===false&&t.doneAt===null&&t.createdAt===NOW&&t.source==='seed')&&d1.habits.every(h=>h.archived===false&&h.createdAt===NOW));
  const all={tasks:ids,habits:d1.habits.map(h=>h.id),workoutPlans:d1.workoutPlans.map(p=>p.id)};
  const d2=F.starterPackDocs(P,'2026-10-17',all,NOW+1);
  check('starter: idempotent — second run with everything present writes nothing',d2.tasks.length+d2.habits.length+d2.workoutPlans.length===0);
  const d3=F.starterPackDocs(P,'2026-10-17',{tasks:ids.slice(2),habits:['seed_h_evening'],workoutPlans:['A','B']},NOW);
  check('starter: only missing documents are written',eq(d3.tasks.map(t=>t.id),ids.slice(0,2))&&eq(d3.habits.map(h=>h.id),['seed_h_protein'])&&eq(d3.workoutPlans.map(p=>p.id),['C']));
  d1.tasks[0].repeat.days.push(9);d1.workoutPlans[0].exercises.pop();
  check('starter: output is a copy (STARTER_PACK is not mutated)',eq(P.tasks[0].repeat.days,[2])&&P.workoutPlans[0].exercises.length===5);
  check('starter: plans referenced by tasks exist in the pack',P.tasks.filter(t=>t.workoutPlan).every(t=>P.workoutPlans.some(p=>p.id===t.workoutPlan)));
  const seedFile=path.join(ROOT,'..','..','..','assets_src','seed-v1.json');
  if(fs.existsSync(seedFile)){
    const seed=JSON.parse(fs.readFileSync(seedFile,'utf8'));
    const pick=t=>({id:t.id,title:t.title,list:t.list,time:t.time,repeat:t.repeat,xp:t.xp,workoutPlan:t.workoutPlan});
    check('starter: embedded pack = seed-v1.json (tasks, habits, plans; dates aside)',eq(P.tasks.map(pick),seed.tasks.map(pick))&&eq(P.habits.map(h=>[h.id,h.name,h.sphere,h.order]),seed.habits.map(h=>[h.id,h.name,h.sphere,h.order]))&&eq(P.workoutPlans,seed.workoutPlans));
  }else console.log('skip  seed-v1.json not found (gitignored) — embedded pack not compared');
  const packText=JSON.stringify(P);
  check('starter: no personal data (no amounts/banks/emails/phones/codes)',!/@|\+7|kaspi|freedom|halyk|forte|syncCode|amount|₸/i.test(packText));

  // ── import toast ──
  const n=k=>Array.from({length:k},(_,i)=>({id:'x'+i}));
  check('import toast: per collection, seed file',F.importSummary({tasks:n(22),habits:n(2),workoutPlans:n(3)})==='Импортировано: задач 22, привычек 2, планов 3',F.importSummary({tasks:n(22),habits:n(2),workoutPlans:n(3)}));
  check('import toast: operations first, zeros left out',F.importSummary({transactions:n(5),goals:[],tasks:n(1)})==='Импортировано: операций 5, задач 1');
  check('import toast: empty file',F.importSummary({})==='В файле нет записей'&&F.importSummary(null)==='В файле нет записей');

  // ── launch shortcuts ──
  check('launch: ?action=add → [+]',eq(F.launchIntent('?action=add'),{action:'add'}));
  check('launch: ?view=quests / ?view=body',eq(F.launchIntent('?view=quests'),{view:'quests'})&&eq(F.launchIntent('?view=body'),{view:'body'}));
  check('launch: unknown or hostile values ignored',F.launchIntent('')===null&&F.launchIntent('?view=evil')===null&&F.launchIntent('?view=__proto__')===null&&F.launchIntent('?action=rm')===null&&F.launchIntent('?view=setup')===null);
  check('launch: action wins over view',eq(F.launchIntent('?view=body&action=add'),{action:'add'}));

  // ── first-run checklist ──
  const s0=F.firstRunStateFrom({});
  check('checklist: empty state → nothing done',!s0.code&&!s0.balances&&!s0.starter&&!s0.expense&&!s0.done);
  const s1=F.firstRunStateFrom({codeSaved:'1',settings:[{key:'balAt_kaspi',value:1}],tasks:[{id:'seed_run'}],txs:[{type:'income'}]});
  check('checklist: state from flags/settings/tasks/operations',s1.code&&s1.balances&&s1.starter&&!s1.expense&&!s1.done);
  check('checklist: done after the first expense',F.firstRunStateFrom({codeSaved:'1',starterFlag:'1',settings:[{key:'balAt_halyk',value:5}],txs:[{type:'expense'}]}).done===true);
  const h=F.firstRunChecklistHtml(s1);
  check('checklist html: 3/4, buttons only for open steps (data-act)',h.includes('>3/4<')&&h.includes('data-act="expense"')&&!h.includes('data-act="code"')&&(h.match(/data-act=/g)||[]).length===1&&h.includes('Первые шаги'));
  check('checklist html: hidden or done → empty',F.firstRunChecklistHtml({...s1,hidden:true})===''&&F.firstRunChecklistHtml({done:true})==='');

  // ── bottom sheet ──
  check('sheet: focus trap index wraps',F.sheetNextFocus(2,3,false)===0&&F.sheetNextFocus(0,3,true)===2&&F.sheetNextFocus(1,3,false)===2&&F.sheetNextFocus(0,0,false)===-1);
  check('sheet: fallback message = title + text',F.sheetMessage({title:'A',text:'B'})==='A\n\nB'&&F.sheetMessage({title:'A'})==='A');
  // replaced window.confirm (tests/console) answers instead of the sheet
  let asked=null;ctx.confirm=m=>{asked=m;return true};
  const fb=await F.sheetConfirm({title:'Удалить лимит?',ok:'Удалить',danger:true});
  check('sheet: overridden window.confirm answers, no sheet drawn',fb===true&&asked==='Удалить лимит?'&&layers().length===0);
  ctx.confirm=()=>false;
  check('sheet: overridden window.confirm "no" → false',(await F.sheetConfirm({title:'x'}))===false);
  ctx.prompt=(m,v)=>m==='Название привычки'&&v===''?'  Бег ':null;
  check('sheet: overridden window.prompt answers (label as message)',(await F.sheetPrompt({title:'Новая привычка',label:'Название привычки'}))==='  Бег ');
  ctx.prompt=()=>null;
  check('sheet: overridden window.prompt cancel → null',(await F.sheetPrompt({title:'x'}))===null);
  ctx.confirm=nativeConfirm;ctx.prompt=nativePrompt;

  const opener=new El('button');opener.focus();
  let p=F.sheetConfirm({title:'<img src=x onerror=alert(1)>',text:'Строка 1\nСтрока 2',ok:'Удалить',danger:true});
  await tick();
  let L=layers()[0],box=L&&find(L,'sheet');
  check('sheet: dialog drawn (role=dialog, aria-modal, labelled, handle, HUD)',!!box&&box.attrs.role==='dialog'&&box.attrs['aria-modal']==='true'&&box.attrs['aria-labelledby']===find(L,'sheet-title').id&&!!find(L,'sheet-handle')&&box.classList.contains('hud')&&L.classList.contains('show'));
  check('sheet: title/text are text, not HTML',find(L,'sheet-title').textContent==='<img src=x onerror=alert(1)>'&&find(L,'sheet-title').children.length===0&&find(L,'sheet-text').textContent==='Строка 1\nСтрока 2');
  const cancelBtn=find(L,'sheet-cancel'),okBtn=find(L,'sheet-ok');
  check('sheet: danger → focus starts on «Отмена», ok styled as danger',doc.activeElement===cancelBtn&&okBtn.classList.contains('sheet-ok-danger')&&okBtn.textContent==='Удалить');
  key('Tab');check('sheet: Tab moves to the next button',doc.activeElement===okBtn);
  key('Tab');check('sheet: Tab from the last wraps to the first',doc.activeElement===cancelBtn);
  key('Tab',true);check('sheet: Shift+Tab from the first wraps to the last',doc.activeElement===okBtn);
  okBtn.click();
  check('sheet: OK → true, focus returns to the opener',(await p)===true&&doc.activeElement===opener);
  await wait(5);
  check('sheet: closed sheet is removed, key listener detached',layers().length===0&&docListeners.length===0);

  p=F.sheetConfirm({title:'Отключить устройство?'});await tick();
  check('sheet: non-danger → focus starts on OK',doc.activeElement===find(layers()[0],'sheet-ok'));
  const esc=key('Escape');
  check('sheet: Esc → false',(await p)===false&&esc.defaultPrevented);
  await wait(5);
  p=F.sheetConfirm({title:'Архивировать?'});await tick();
  find(layers()[0],'sheet-backdrop').click();
  check('sheet: backdrop tap → false',(await p)===false);
  await wait(5);

  p=F.sheetPrompt({title:'Новая привычка',label:'Название привычки',value:'Бег',placeholder:'Например'});await tick();
  L=layers()[0];const inp=find(L,'sheet-input'),lab=find(L,'sheet-label');
  check('sheet prompt: labelled input (label for=id), value prefilled, focused',inp&&lab.attrs.for===inp.id&&lab.textContent==='Название привычки'&&inp.value==='Бег'&&doc.activeElement===inp&&inp.placeholder==='Например');
  inp.value='Чтение 20 минут';key('Enter');
  check('sheet prompt: Enter in the field → its value',(await p)==='Чтение 20 минут');
  await wait(5);
  p=F.sheetPrompt({title:'x',label:'y'});await tick();
  find(layers()[0],'sheet-cancel').click();
  check('sheet prompt: «Отмена» → null',(await p)===null);
  await wait(5);

  const q1=F.sheetConfirm({title:'Удалить все данные?',danger:true}),q2=F.sheetConfirm({title:'Точно удалить всё?',danger:true});
  await tick();await tick();
  check('sheet: queued — one sheet at a time',layers().length===1&&find(layers()[0],'sheet-title').textContent==='Удалить все данные?');
  find(layers()[0],'sheet-ok').click();await q1;await tick();await tick();
  const second=layers().find(l=>find(l,'sheet-title').textContent==='Точно удалить всё?');
  check('sheet: the second opens after the first is answered',!!second);
  find(second,'sheet-cancel').click();
  check('sheet: answers stay in order',(await q1)===true&&(await q2)===false);
  await wait(5);

  // ── service worker ──
  const swSrc=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
  function swSandbox(opts){
    const store=new Map(),puts=[],listeners={},added=[];
    const keyOf=(r,o)=>{let u=typeof r==='string'?new URL(r,'https://x.test/finance-tracker/sw.js').href:r.url;if(o&&o.ignoreSearch)u=u.split('?')[0];return u};
    const cache={
      addAll:async list=>{for(const u of list){if(opts.failLocal&&u===opts.failLocal)throw new Error('404 '+u);store.set(keyOf(u),{ok:true,body:'cached '+u})}},
      add:async u=>{if((opts.failCdn||[]).includes(u))throw new Error('cdn down');added.push(u);store.set(keyOf(u),{ok:true,body:'cached '+u})},
      put:async(r,res)=>{puts.push([keyOf(r),res]);store.set(keyOf(r),res)},
    };
    const caches={
      open:async()=>cache,keys:async()=>[],delete:async()=>true,
      match:async(r,o)=>{const k=keyOf(r,o);if(store.has(k))return store.get(k);if(o&&o.ignoreSearch){for(const[kk,v]of store)if(kk.split('?')[0]===k)return v}return undefined},
    };
    const Response={error:()=>({ok:false,error:true})};
    const sctx={URL,console,caches,Response,
      setTimeout:(f,ms)=>setTimeout(f,ms/100),clearTimeout, // 3 s → 30 ms
      fetch:opts.fetch||(async()=>{throw new Error('offline')}),
      self:{addEventListener:(t,f)=>{listeners[t]=f},skipWaiting(){},clients:{claim(){}}}};
    vm.createContext(sctx);vm.runInContext(swSrc+'\n;this.S={CACHE_NAME,LOCAL_ASSETS,CDN_ASSETS,NET_TIMEOUT_MS};',sctx);
    return{S:sctx.S,store,puts,listeners,added,
      install:()=>{let w;listeners.install({waitUntil:x=>{w=x}});return w},
      fetchEv:(url,extra)=>{let res=null;const req={url,method:'GET',mode:'cors',...extra,clone(){return this}};listeners.fetch({request:req,respondWith:x=>{res=x}});return res}};
  }
  const resp=(ok,body)=>({ok,status:ok?200:404,body,clone(){return{...this,cloned:true}}});
  let sw=swSandbox({failCdn:['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js']});
  check('sw: cache name bumped, 3 s network timeout',sw.S.CACHE_NAME!=='finance-v34'&&/^finance-v\d+$/.test(sw.S.CACHE_NAME)&&sw.S.NET_TIMEOUT_MS===3000);
  let installed=true;try{await sw.install()}catch(e){installed=false}
  check('sw install: a failed CDN file does not break the install, the others are cached',installed&&sw.added.length===sw.S.CDN_ASSETS.length-1);
  sw=swSandbox({failLocal:'./fx.js'});installed=true;try{await sw.install()}catch(e){installed=false}
  check('sw install: a missing local file fails the install (strict)',installed===false);
  check('sw install: maskable icon is among the local files',sw.S.LOCAL_ASSETS.includes('./icon-512-maskable.png'));
  sw=swSandbox({});
  check('sw fetch: Firestore/googleapis, google.com, reCAPTCHA and POST are not intercepted',
    sw.fetchEv('https://firestore.googleapis.com/v1/x')===null&&sw.fetchEv('https://www.google.com/recaptcha/api.js')===null&&sw.fetchEv('https://www.gstatic.com/recaptcha/releases/x.js')===null&&sw.fetchEv('https://x.test/finance-tracker/a',{method:'POST'})===null);
  sw=swSandbox({fetch:async()=>resp(true,'fresh')});
  let r=await sw.fetchEv('https://x.test/finance-tracker/theme.css');await tick();
  check('sw fetch: network ok → network response, a copy is cached',r.body==='fresh'&&sw.puts.length===1&&sw.puts[0][1].cloned);
  sw=swSandbox({fetch:async()=>resp(false,'404 page')});
  r=await sw.fetchEv('https://x.test/finance-tracker/missing.png');await tick();
  check('sw fetch: non-ok response is returned but never cached',r.body==='404 page'&&sw.puts.length===0);
  sw=swSandbox({});sw.store.set('https://x.test/finance-tracker/fx.js',{ok:true,body:'old fx'});
  r=await sw.fetchEv('https://x.test/finance-tracker/fx.js');
  check('sw fetch: offline → cached copy',r.body==='old fx');
  let slowDone=false;
  sw=swSandbox({fetch:()=>new Promise(res=>setTimeout(()=>{slowDone=true;res(resp(true,'late'))},200))});
  sw.store.set('https://x.test/finance-tracker/index.html',{ok:true,body:'cached index'});
  const t0=Date.now();r=await sw.fetchEv('https://x.test/finance-tracker/index.html');
  check('sw fetch: slow network → cache after the timeout',r.body==='cached index'&&!slowDone&&Date.now()-t0<150,Date.now()-t0);
  await wait(250);
  check('sw fetch: the late network answer still refreshes the cache',sw.puts.some(([k,v])=>k==='https://x.test/finance-tracker/index.html'&&v.body==='late'));
  sw=swSandbox({fetch:()=>new Promise(res=>setTimeout(()=>res(resp(true,'late')),80))});
  r=await sw.fetchEv('https://x.test/finance-tracker/new.js');
  check('sw fetch: slow network and no cached copy → waits for the network',r.body==='late');
  sw=swSandbox({});sw.store.set('https://x.test/finance-tracker/index.html',{ok:true,body:'cached index'});
  r=await sw.fetchEv('https://x.test/finance-tracker/?action=add',{mode:'navigate'});
  check('sw fetch: offline shortcut launch (?action=add) → cached app page',r.body==='cached index');
  r=await sw.fetchEv('https://x.test/finance-tracker/nothing.png');
  check('sw fetch: offline, nothing cached, not a page → network error response',r.error===true);

  // ── manifest + icon ──
  const man=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8'));
  check('manifest: name/short_name «Система», id /finance-tracker/',man.name==='Система'&&man.short_name==='Система'&&man.id==='/finance-tracker/'&&man.start_url==='/finance-tracker/');
  check('manifest: maskable icon listed',man.icons.some(i=>i.purpose==='maskable'&&i.src==='icon-512-maskable.png'&&i.sizes==='512x512'));
  const sc=Object.fromEntries((man.shortcuts||[]).map(s=>[s.name,F.launchIntent(new URL(s.url,'https://x.test').search)]));
  check('manifest: shortcuts route to [+], quests, body',eq(sc,{'Расход':{action:'add'},'Квест дня':{view:'quests'},'Тренировка':{view:'body'}}),sc);
  const png=fs.readFileSync(path.join(ROOT,'icon-512-maskable.png'));
  const w=png.readUInt32BE(16),hh=png.readUInt32BE(20),ct=png[25];
  let maxR=0;
  {const chunks=[];let p=8;while(p<png.length){const len=png.readUInt32BE(p),t=png.toString('ascii',p+4,p+8);if(t==='IDAT')chunks.push(png.slice(p+8,p+8+len));p+=12+len}
   const raw=zlib.inflateSync(Buffer.concat(chunks)),st=w*3;
   for(let y=0;y<hh;y++){if(raw[y*(st+1)]!==0)throw new Error('filter');for(let x=0;x<w;x++){const o=y*(st+1)+1+x*3;if(raw[o]+raw[o+1]+raw[o+2]>24)maxR=Math.max(maxR,Math.hypot(x+.5-w/2,y+.5-hh/2))}}}
  check('icon: maskable PNG 512×512 opaque RGB, content inside the 40 % safe zone',w===512&&hh===512&&ct===2&&maxR>100&&maxR<=204.8,{w,hh,ct,maxR});
  check('index: <title> Система',/<title>Система<\/title>/.test(src));

  console.log(`\nfoundation: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
