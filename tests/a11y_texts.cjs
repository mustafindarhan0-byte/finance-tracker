// F6.7 texts / F6.8 accessibility: static checks over index.html + theme.css, plus the pure i18n helpers
// (plural, nWord, errText) and countsText run in a sandbox. node tests/a11y_texts.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
const css=fs.readFileSync(path.join(ROOT,'theme.css'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}

let pass=0,fail=0;
function check(name,cond,extra){if(cond){pass++;console.log('ok  ',name)}else{fail++;console.log('FAIL',name,extra!==undefined?JSON.stringify(extra).slice(0,600):'')}}
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const script=src.slice(src.lastIndexOf('<script>')+8,src.lastIndexOf('</script>'));
const markup=src.slice(0,src.lastIndexOf('<script>'));

// ── 1. the app script compiles (same as node --check on the extracted <script>) ──
let compiled=true;try{new vm.Script(script,{filename:'index-script.js'})}catch(e){compiled=String(e)}
check('script: extracted <script> compiles',compiled===true,compiled);

// ── 2. «ты» everywhere: no «вы»-imperatives left in the file ──
const VY=/Введите|Выберите|Загрузите|Проверьте|Нажмите|Укажите|Заполните|Задайте|Сохраните|Скопируйте|Попробуйте|Начните|Обновите|Откройте|Добавьте|Создайте/i;
const vyHits=src.split('\n').map((l,i)=>[i+1,l]).filter(([,l])=>VY.test(l)).map(([n,l])=>n+': '+l.trim().slice(0,90));
check('texts: no «Введите / Выберите / Загрузите / Проверьте / Нажмите / Укажите …» anywhere',vyHits.length===0,vyHits);
check('texts: «ты»-forms are used («Введи», «Выбери», «Загрузи», «нажми»)',/Введи описание/.test(src)&&/Выбери категорию/.test(src)&&/Загрузи выписку/.test(src)&&/нажми «Сохранить»/.test(src));

// ── 3. no direct window.prompt / window.confirm outside the sheet helpers' fallback ──
const sheetBlock=slice('// sheet:dom-begin','// sheet:dom-end');
const outside=script.replace(sheetBlock,'');
const direct=[...outside.matchAll(/(^|[^.\w$])(confirm|prompt)\s*\(|window\.(confirm|prompt)\s*\(/g)].map(m=>outside.slice(Math.max(0,m.index-40),m.index+40).replace(/\n/g,' '));
check('dialogs: no confirm()/prompt() call outside sheetConfirm/sheetPrompt',direct.length===0,direct);
check('dialogs: the sheet keeps its fallback to a replaced window.confirm / window.prompt',/window\.confirm\(sheetMessage\(o\)\)/.test(sheetBlock)&&/window\.prompt\(o\.label\|\|o\.title/.test(sheetBlock));
check('dialogs: deleteTx, addToGoal, duplicate statement, undo import, finishWorkout, allocConfirm ask through the sheet',
  /async function deleteTx\(id\)\{if\(!await sheetConfirm\(/.test(src)&&/addToGoal[\s\S]{0,80}await sheetPrompt\(/.test(src)&&/confirmNotDuplicateStatement[\s\S]{0,400}sheetConfirm\(/.test(src)
  &&/undoStmtImport[\s\S]{0,200}sheetConfirm\(/.test(src)&&/finishWorkout[\s\S]{0,200}sheetConfirm\(/.test(src)&&/q&&!await sheetConfirm\(/.test(src));

// ── 4. zoom allowed ──
const vp=(src.match(/<meta name="viewport" content="([^"]*)"/)||[])[1]||'';
check('viewport: no user-scalable=no / maximum-scale',vp&&!/user-scalable\s*=\s*no|maximum-scale/i.test(vp),vp);

// ── tag helpers: opening tag around a position (attribute values in this code base use double quotes) ──
function openTagAt(lt){
  let i=lt+1,q=false;
  while(i<src.length){const c=src[i];if(c==='"')q=!q;else if(c==='>'&&!q)break;i++}
  return src.slice(lt,i+1);
}
// ── 5. every element with an onclick attribute is a button / a / input / select, or has role + tabindex ──
const bad=[];
for(const m of src.matchAll(/[\s'"]onclick=/g)){
  if(src[m.index]==='.')continue;
  let lt=src.lastIndexOf('<',m.index);
  const tag=(src.slice(lt).match(/^<([a-zA-Z]+)/)||[])[1];
  if(!tag){bad.push('?? '+src.slice(m.index-60,m.index+20));continue}
  const open=openTagAt(lt);
  if(/^(button|a|input|select)$/i.test(tag))continue;
  if(/\brole="button"/.test(open)&&/\btabindex="0"/.test(open))continue;
  // the conditional attribute string used for action rows: ` role="button" tabindex="0" onclick=…`
  const near=src.slice(Math.max(lt,m.index-60),m.index);
  if(/role="button" tabindex="0"\s*$/.test(near))continue;
  bad.push(open.slice(0,140));
}
check('onclick: only on buttons / links / inputs, or on role="button" tabindex="0"',bad.length===0,bad);
check('keyboard: one delegated Enter/Space handler for [role=button]',/getAttribute\('role'\)==='button'&&t\.tagName!=='BUTTON'/.test(src)&&/e\.key==='Enter'\|\|e\.key===' '/.test(src));
check('rows are buttons: habit rows, quest-of-the-day habits, category tiles, legend, calendar days, templates, «Позже»',
  /<button type="button" class="habit-row"/.test(src)&&/<button type="button" class="qrow"/.test(src)&&/<button type="button" class="cat-btn/.test(src)&&/'<button type="button" class="cat-btn'/.test(src)
  &&/<button type="button" class="sphere-legend-item"/.test(src)&&/<button type="button" class="\$\{cls\.join\(' '\)\}"/.test(src)&&/<button type="button" class="tmpl-chip"/.test(src)&&/<button type="button" class="task-section-title fold"/.test(src));

// ── 6. icon-only buttons have an aria-label ──
const noName=[];
for(const m of src.matchAll(/<button\b/g)){
  const open=openTagAt(m.index),end=src.indexOf('</button>',m.index+open.length);
  if(end<0)continue;
  const inner=src.slice(m.index+open.length,end);
  if(inner.includes('<button'))continue; // nested markup — not a button body
  const text=inner.replace(/\$\{\s*ico(Inline)?\([^)]*\)\s*\}/g,'').replace(/ico(Inline)?\([^)]*\)/g,'').replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]*>/g,'').replace(/['+`\s]/g,'');
  if(text==='' && !/aria-label(ledby)?=/.test(open))noName.push(open.slice(0,140));
}
check('icon-only buttons: every one has aria-label',noName.length===0,noName);
check('aria-label on the gear, close ×, nav, calendar arrows, week arrows, send buttons',
  (src.match(/aria-label="Настройки"/g)||[]).length>=2&&/aria-label="Закрыть"/.test(src)&&/aria-label="Закрыть быстрый ввод"/.test(src)&&/aria-label="Статус"/.test(src)&&/aria-label="Предыдущий месяц"/.test(src)
  &&/aria-label="Следующая неделя"/.test(src)&&/aria-label="Добавить задачу"/.test(src));
check('icons: chevLeft / chevRight exist (week arrows were empty)',/chevLeft:'<path/.test(src)&&/chevRight:'<path/.test(src));

// ── 7. [+] is a modal dialog with focus management ──
const layerTag=(src.match(/<div id="cmd-layer"[^>]*>/)||[''])[0];
check('#cmd-layer: role="dialog" aria-modal="true" aria-label',/role="dialog"/.test(layerTag)&&/aria-modal="true"/.test(layerTag)&&/aria-label="[^"]+"/.test(layerTag),layerTag);
const openCmd=slice('function openCmd(){','\nfunction cmdSetType('),closeCmd=slice('function closeCmd(){','\nfunction cmdSetType(');
check('#cmd-layer: focus moves in on open (input) and back on close',/cmdPrevFocus=document\.activeElement/.test(openCmd)&&/inp\.focus\(\)/.test(openCmd)&&/back\.focus\(\)/.test(closeCmd));
check('#cmd-layer: Esc closes, Tab is kept inside, a sheet on top wins',/if\(e\.key==='Escape'\)\{e\.preventDefault\(\);closeCmd\(\)/.test(src)&&/L\.querySelectorAll\('button,input,select,textarea,\[tabindex="0"\]'\)/.test(src)&&/document\.querySelector\('\.sheet-layer'\)/.test(src));

// ── 8. labels: no placeholder-only fields ──
const unlabeled=[];
for(const m of src.matchAll(/<(input|select|textarea)\b/g)){
  const open=openTagAt(m.index);
  if(/type="(checkbox|radio|file|hidden)"/.test(open))continue;
  if(/aria-label(ledby)?=/.test(open))continue;
  const id=(open.match(/\bid="([^"$]+)"/)||[])[1];
  if(id&&src.includes(`for="${id}"`))continue;
  unlabeled.push(open.slice(0,120));
}
check('fields: every input/select has a <label for> or aria-label',unlabeled.length===0,unlabeled);
check('fields: debt, goal, budget and template forms have visible labels',['dbt-name','dbt-bank','dbt-total','dbt-remaining','dbt-monthly','dbt-day','goal-name','goal-target','goal-deadline','budget-cat','budget-limit','tmpl-name','tmpl-amount','tmpl-cat','al-salary','al-life','te-title'].every(id=>new RegExp(`<label[^>]*for="${id}"`).test(src)));

// ── 9. toasts ──
const toastTag=(src.match(/<div id="toast"[^>]*>/)||[''])[0];
check('toast: role="status" aria-live="polite"',/role="status"/.test(toastTag)&&/aria-live="polite"/.test(toastTag),toastTag);
const zOf=sel=>{let z=null;for(const m of css.matchAll(new RegExp('(^|\\n|\\})\\s*'+sel.replace('.','\\.')+'\\{([^}]*)\\}','g'))){const k=m[2].match(/z-index:(\d+)/);if(k)z=+k[1]}return z};
check('toast: above the [+] layer and the bottom sheet (z-index)',zOf('.toast')>zOf('.cmd-layer')&&zOf('.toast')>zOf('.sheet-layer'),{toast:zOf('.toast'),cmd:zOf('.cmd-layer'),sheet:zOf('.sheet-layer')});
check('toast: undo buttons pass ids through data-id, not inside JS strings',!/undoTx\('\$\{/.test(src)&&!/undoTask\('\$\{/.test(src)&&/onclick="undoTx\(this\.dataset\.id\)"/.test(src));

// ── 10. inputs ≥ 16 px; tap targets ──
check('css: inputs default to 16 px',/(^|\n)input,select,textarea\{font-size:16px\}/.test(css));
const big=css.match(/\n(\.settings-input,[^{]*)\{font-size:16px\}/);
check('css: the small input classes are lifted to 16 px (settings, search, selects, forms, statement category)',!!big&&['.settings-input','.search-input','.currency-select','.add-form input','.bank-edit-row input','.stmt-cat','#debt-form input','.al-row input','.sheet .sheet-input'].every(s=>big[1].includes(s)));
const hit=css.match(/\n(\.task-check::after,[^{]*)\{\s*content:'';position:absolute;[^}]*width:max\(100%,44px\);height:max\(100%,44px\)/);
check('css: 44×44 hit area for the task checkbox, delete, header, calendar arrows, chips, settings buttons',!!hit&&['.task-check::after','.del-btn::after','.header-btn::after','.calendar-nav-btn::after','.cmd-part::after','.settings-btn::after','.sphere-legend-item::after','.toast-undo::after'].every(s=>hit[1].includes(s)));
check('css: segmented controls and chips are at least 44 px high',/\.period-tab,\.cmd-bank,\.cmd-date,\.cmd-flip,\.stmt-cat,[^{]*\{min-height:44px\}/.test(css)&&/\.tmpl-chip\{min-height:44px/.test(css)&&/\.cmd-seg button\{[^}]*min-height:44px/.test(css));

// ── 11. contrast ──
const tok=n=>{const m=css.match(new RegExp('--'+n+':(#[0-9A-Fa-f]{6})'));return m?m[1]:null};
function lum(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const navBg=(css.match(/\.bottom-nav\{background:(#[0-9A-Fa-f]{6})/)||[])[1];
const C={fogInk1:ratio(tok('fog'),tok('ink-1')),fogInk2:ratio(tok('fog'),tok('ink-2')),t3Ink1:ratio(tok('text3'),tok('ink-1')),t3Ink2:ratio(tok('text3'),tok('ink-2')),dimNav:ratio(tok('dim'),navBg),dimVoid:ratio(tok('dim'),tok('void')),dimInk1:ratio(tok('dim'),tok('ink-1'))};
check('contrast: --fog body text ≥ 4.5:1 on --ink-1 and --ink-2',C.fogInk1>=4.5&&C.fogInk2>=4.5,C);
check('contrast: --text3 small text ≥ 4.5:1 on --ink-1 and --ink-2',C.t3Ink1>=4.5&&C.t3Ink2>=4.5,C);
check('contrast: inactive nav icons (--dim on the nav capsule) ≥ 3:1',/\.nav-btn\{[^}]*color:var\(--dim\)!important/.test(css)&&C.dimNav>=3,C);
check('contrast: locked achievements — no opacity fade, --dim icon ≥ 3:1 on the page, name/desc in --fog',!/\.ach\{[^}]*opacity:/.test(css)&&/\.ach:not\(\.got\) \.ach-ic svg\{color:var\(--dim\)!important/.test(css)&&C.dimVoid>=3&&C.dimInk1>=3,C);
check('contrast: large placeholders ([+] field, weight) ≥ 3:1',/\.cmd-input::placeholder\{color:var\(--dim\)\}/.test(css)&&/\.kg-input::placeholder\{color:var\(--dim\)\}/.test(css));

// ── 12. motion ──
check('motion: prefers-reduced-motion blocks still present',(css.match(/prefers-reduced-motion/g)||[]).length>=4&&/reducedMotion\(\)/.test(src));

// ── 13. glossary and Russian cases ──
check('glossary: savings goals are «Копилки» in labels (backup, integrity, settings, toasts)',/goals:'Копилки'/.test(src)&&/INTEGRITY_CLASSES=\{goal:'Копилки'/.test(src)&&/Копилки, рассрочки, опыт/.test(src)&&!/toast\('Цель создана'\)/.test(src)&&!/'до цели'|>до цели</.test(src));
const ach=slice('const ACHIEVEMENTS=[','];');
check('glossary: achievements — «100 задач» / «Выполнено сто задач», no «квестов» for tasks',/name:'100 задач',desc:'Выполнено сто задач'/.test(ach)&&!/квест/i.test(ach));
check('glossary: marquee says «квест дня N/M»',/`квест дня \$\{sm\.done\}\/\$\{sm\.total\}`/.test(src));
const cb=slice('async function checkBudget(','// ── History ──');
check('budget warnings: «Лимит общих расходов превышен», «N % лимита: Еда», no «Лимит на …»',/Лимит общих расходов превышен/.test(cb)&&/лимита: \$\{name\}/.test(cb)&&!/Лимит на /.test(cb));
check('code wording: «Код доступа» in settings (not «Код синхронизации»)',/settings-label">Код доступа</.test(src)&&!/Код синхронизации/.test(src));

// ── 14. pure helpers in a sandbox: plural, nWord, errText, countsText ──
const warned=[];
const ctx={console:{warn:(...a)=>warned.push(a.map(String).join(' ')),log(){},error(){}}};
vm.createContext(ctx);
vm.runInContext(slice('// i18n:pure-begin','// i18n:pure-end')+'\n'+slice('// one / few / many forms per collection','// toast after «Импорт (объединить)»')+';this.I={plural,nWord,errText,W_OPS,W_TASKS,countsText};',ctx);
const I=ctx.I,F=I.W_OPS;
check('plural: 1 / 21 / 101 → операция',[1,21,101,1001].every(n=>I.plural(n,F)==='операция'));
check('plural: 2 / 3 / 4 / 22 / 104 → операции',[2,3,4,22,104].every(n=>I.plural(n,F)==='операции'));
check('plural: 0 / 5 / 9 / 20 / 100 → операций',[0,5,9,20,100].every(n=>I.plural(n,F)==='операций'));
check('plural: 11–14, 111, 112 → операций (teens)',[11,12,13,14,111,112,1012].every(n=>I.plural(n,F)==='операций'));
check('plural: negatives and strings count by absolute value',I.plural(-1,F)==='операция'&&I.plural('3',F)==='операции'&&I.plural(-15,F)==='операций');
check('nWord: «Добавлено: 1 операция / 2 операции / 5 операций»',['1 операция','2 операции','5 операций'].every((s,i)=>I.nWord([1,2,5][i],F)===s)&&I.nWord(21,I.W_TASKS)==='21 задача');
check('countsText: «22 задачи, 2 привычки, 3 плана тренировок», zeros left out',I.countsText({tasks:22,habits:2,workoutPlans:3,goals:0})==='22 задачи, 2 привычки, 3 плана тренировок',I.countsText({tasks:22,habits:2,workoutPlans:3}));
check('countsText: singular / few forms per collection',I.countsText({transactions:1,goals:2,journal:5})==='1 операция, 2 копилки, 5 записей журнала',I.countsText({transactions:1,goals:2,journal:5}));
check('errText: permission-denied → «Нет доступа — устройство не в списке. Введи код ещё раз»',I.errText({code:'permission-denied',message:'Missing or insufficient permissions.'})==='Нет доступа — устройство не в списке. Введи код ещё раз');
check('errText: unavailable / deadline-exceeded / timeout → «Нет связи — запись уйдёт, когда появится интернет»',['unavailable','deadline-exceeded','timeout'].every(c=>I.errText({code:c})==='Нет связи — запись уйдёт, когда появится интернет'));
check('errText: offline on a read → «проверь интернет», not «запись уйдёт»',I.errText({code:'unavailable'},'read')==='Нет связи — проверь интернет и попробуй ещё раз');
check('errText: prefixed codes (auth/…, firestore/…) are mapped',I.errText({code:'auth/network-request-failed'})==='Нет связи — запись уйдёт, когда появится интернет'&&I.errText({code:'firestore/permission-denied'}).startsWith('Нет доступа'));
check('errText: resource-exhausted → daily limit, unauthenticated → reopen the app',/Дневной лимит/.test(I.errText({code:'resource-exhausted'}))&&/закрой приложение/.test(I.errText({code:'unauthenticated'})));
check('errText: browser errors by name (QuotaExceededError, NotAllowedError)',/Память браузера/.test(I.errText({name:'QuotaExceededError',message:'The quota has been exceeded.'}))&&/Браузер не разрешил/.test(I.errText({name:'NotAllowedError'})));
check('errText: English text is never shown; our Russian message becomes a sentence',I.errText(new Error('Cannot read properties of undefined'))==='Что-то пошло не так — попробуй ещё раз'&&I.errText(new Error('снимок не найден'))==='Снимок не найден'&&I.errText(new TypeError('Failed to fetch'))==='Нет связи — запись уйдёт, когда появится интернет');
check('errText: null / string / unknown code → generic Russian text',I.errText(null)==='Что-то пошло не так — попробуй ещё раз'&&I.errText({code:'weird-code'})==='Что-то пошло не так — попробуй ещё раз'&&I.errText('копия повреждена')==='Копия повреждена');
warned.length=0;const shown=I.errText({code:'permission-denied',message:'Missing or insufficient permissions.'});
check('errText: the raw code goes to the console only',!/permission-denied|Missing/.test(shown)&&warned.some(w=>w.includes('permission-denied')),warned);
const raw=[...script.matchAll(/toast\([^;]*?(err|e)\.(code|message)/g)].map(m=>m[0].slice(0,80));
check('errText: no toast shows e.code / e.message directly',raw.length===0,raw);

console.log(`\na11y_texts: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
