// SPEC_desktop: keys, side panel markup, desktop-only CSS, «Впереди» as a side panel. node tests/desktop.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
const css=fs.readFileSync(path.join(ROOT,'theme.css'),'utf8').replace(/\r\n/g,'\n');
const fnSrc=name=>{const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('fn '+name);let d=0,j=src.indexOf('{',i);for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)break}return src.slice(i,j+1)};
let pass=0,fail=0;
const ok=(c,n,x)=>{if(c)pass++;else{fail++;console.log('FAIL',n,x!==undefined?JSON.stringify(x).slice(0,400):'')}};

// D2 keys
const ctx={};vm.createContext(ctx);vm.runInContext(fnSrc('desktopKeyAction')+';this.K=desktopKeyAction',ctx);
const K=(code,o)=>ctx.K({code,...(o||{})});
ok(K('Slash')==='cmd'&&K('KeyN')==='cmd','/ and N open [+] (by key position, so the Russian layout works too)');
ok(K('Digit1').view==='status'&&K('Digit2').view==='quests'&&K('Digit3').view==='body'&&K('Numpad4').view==='money','1–4 switch sections');
ok(K('Digit5')===null&&K('KeyA')===null,'other keys do nothing');
ok(K('Slash',{typing:true})===null&&K('Digit1',{typing:true})===null,'nothing while typing in a field');
ok(K('KeyN',{ctrl:true})===null&&K('KeyN',{meta:true})===null&&K('Digit1',{alt:true})===null,'nothing with Ctrl / Cmd / Alt');
ok(K('Digit2',{overlay:true})===null,'nothing over an open window');

// D1 side panel markup
const nav=src.slice(src.indexOf('<nav class="bottom-nav"'),src.indexOf('</nav>'));
const btns=nav.match(/<button class="nav-btn[^>]*>[\s\S]*?<\/button>/g)||[];
ok(btns.length===6,'5 sections + settings in the nav',btns.length);
ok(btns.every(b=>/class="nav-label">[^<]+</.test(b)&&/aria-label="[^"]+"/.test(b)),'every nav button has a label and aria-label');
ok(/class="side-head side-only"/.test(nav)&&/class="side-foot side-only"/.test(nav)&&/id="side-date"/.test(nav),'side head (brand, date) and foot (keys, sync, settings)');

// desktop-only CSS: outside the ≥1024 block the new classes only hide / flatten
const m=css.indexOf('@media (min-width:1024px){');ok(m>0,'desktop block exists');
let d=0,e=m+'@media (min-width:1024px)'.length;for(;e<css.length;e++){if(css[e]==='{')d++;else if(css[e]==='}'&&--d===0)break}
const outside=css.slice(0,m)+css.slice(e+1),rx=/([^{}]*(?:\.nav-label|\.side-|\.q-side|\.st-col|\.split|\.cmd-box|\.stats-grid|\.sk-grid)[^{}]*)\{([^}]*)\}/g;
const bad=[];let r;while((r=rx.exec(outside)))if(/display:(?!none|contents)|grid-|position:|width:|columns:/.test(r[2]))bad.push(r[1].trim()+'{'+r[2]+'}');
ok(bad.length===0,'new layout classes add no layout below 1024 px (only hide / display:contents; type styles are fine)',bad);
ok(/\.bottom-nav\{top:0;bottom:0;left:0/.test(css.slice(m,e)),'nav becomes a left panel only inside the desktop block');

// D3/D5/D6 wrappers keep the phone order (display:contents)
ok(/\.st-cols,\.st-col,\.q-split,\.split,\.split-col,\.cmd-box,\.stats-grid\{display:contents\}/.test(css),'wrappers are display:contents on phones');
const stats=src.slice(src.indexOf('<div id="view-stats"'),src.indexOf('<!-- PLANS'));
const ord=['st-ring','st-dyn','st-cats','st-banks'].map(c=>stats.indexOf('class="card '+c));
ok(ord.every((x,i)=>x>0&&(i===0||x>ord[i-1])),'Аналитика keeps the phone order: ring, dynamics, categories, banks',ord);

// D4 «Впереди» as a panel
const c2={escapeHtml:s=>String(s),ico:()=>'<svg/>',listName:l=>l,formatTaskDate:d=>d,taskRowHtml:(t,late,noEdit)=>'<row '+t.id+(noEdit?' noedit':'')+'>',
  WD_SHORT:['пн','вт','ср','чт','пт','сб','вс'],today:()=>'2026-10-24',tasksCache:[{id:'a',title:'A',due:'2026-10-24',list:'inbox',time:'10:00',done:false},{id:'b',title:'B',due:'2026-10-25',list:'gym',time:'',done:false}],logCache:[],
  weekNavHtml:()=>'<div class="wk-nav"></div><div class="body-seg"></div>'};
vm.createContext(c2);
vm.runInContext(['function parseLocalDate(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}','const pad2=n=>String(n).padStart(2,"0");',
  'function localDate(d){return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())}','function addDays(s,n){const d=parseLocalDate(s);d.setDate(d.getDate()+n);return localDate(d)}',
  fnSrc('isoWeekday'),fnSrc('daysBetween'),fnSrc('weekStart'),fnSrc('nextOccurrence'),fnSrc('upcomingEvents'),fnSrc('weekAhead'),
  src.match(/const WD_FULL=[^\n]*\n/)[0],fnSrc('renderWeekAhead'),'this.R=renderWeekAhead'].join('\n'),c2);
const el={innerHTML:''};c2.R(el,true);
ok(!/wk-nav|body-seg|wa-strip|wa-past/.test(el.innerHTML)&&/q-side-title/.test(el.innerHTML),'panel: no week nav, switch, strip or past line',el.innerHTML.slice(0,200));
ok(/<row a noedit>/.test(el.innerHTML)&&/id="qs-2026-10-25"/.test(el.innerHTML),'panel rows have no inline edit form; section ids do not clash with the week tab');
const el2={innerHTML:''};c2.R(el2,false);
ok(/wk-nav/.test(el2.innerHTML)&&/wa-strip/.test(el2.innerHTML)&&/id="wa-2026-10-25"/.test(el2.innerHTML),'week tab keeps its nav and strip');

// assets versioned together
const v=(src.match(/theme\.css\?v=(\d+)/)||[])[1],sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(v&&src.includes('fx.js?v='+v)&&sw.includes("'finance-v"+v+"'")&&sw.includes('theme.css?v='+v),'asset versions bumped together',v);

console.log(`desktop: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
