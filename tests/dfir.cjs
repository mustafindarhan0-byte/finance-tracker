// SPEC_dfir DF1–DF4, DF6 plan: outline parsing, topic files, progress from xpLog, weekly series with freezes,
// markdown → safe HTML, upload plan. Code is taken from index.html (read-only). node tests/dfir.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const line=re=>{const m=src.match(re);if(!m)throw new Error('line '+re);return m[0]};
const code=[
  line(/function localDate\([^\n]*\n/),line(/const pad2=[^\n]*\n/),line(/function parseLocalDate\([^\n]*\n/),line(/function addDays\([^\n]*\n/),line(/function isoWeekday\([^\n]*\n/),
  line(/function escapeHtml\([^\n]*\n/),
  line(/const xpToNext=[^\n]*\n/),line(/function cumXp\([^\n]*\n/),line(/function levelOf\([^\n]*\n/),line(/function levelInfo\([^\n]*\n/),
  line(/function rankOf\([^\n]*\n/),line(/function nextRankAt\([^\n]*\n/),line(/function weekStart\([^\n]*\n/),
  slice('// ── DFIR: chain, progress, streak, markdown','// ── Journal & command line'),
].join('\n');
const ctx={console};vm.createContext(ctx);vm.runInContext(code+'\n;this.X={dfirParseOutline,dfirTopicFile,dfirFront,dfirHash,dfirFlat,dfirDoneMap,dfirGrade,dfirProgress,dfirBlockXpNeeded,dfirStreak,dfirMd,dfirPlanUpload,rankOf}',ctx);
const X=ctx.X;
let fail=0,n=0;
function ok(c,msg){n++;if(!c){fail++;console.log('FAIL '+msg)}}
function eq(a,b,msg){ok(JSON.stringify(a)===JSON.stringify(b),msg+' → '+JSON.stringify(a)+' ≠ '+JSON.stringify(b))}

// ── DF1: outline, topic files, frontmatter
const OUT=fs.readFileSync(path.join(__dirname,'dfir','outline.md'),'utf8');
const chain=X.dfirParseOutline(OUT);
const flat=X.dfirFlat(chain);
eq(chain.length,13,'13 частей');
eq(chain.reduce((s,p)=>s+p.blocks.length,0),40,'40 блоков');
eq(flat.length,520,'520 тем');
eq(chain[0].blocks.map(b=>b.topics.length),[10,8,15,11],'блоки части I');
eq(chain[0].roman,'I','римский номер части');
eq(chain[0].blocks.reduce((s,b)=>s+b.topics.length,0),44,'в части I 44 темы');
const b3=chain[0].blocks[2];
eq([b3.n,b3.topics[0].n,b3.topics[b3.topics.length-1].n],[3,19,33],'блок 3 = темы 19–33');
ok(b3.src.length>0&&b3.tools.startsWith('Инструмент A3'),'у блока 3 есть опора и инструменты: '+b3.src+' / '+b3.tools);
ok(!/\*/.test(b3.tools)&&!/\*/.test(b3.src),'звёздочки курсива сняты');
ok(flat.every((t,i)=>t.n===i+1),'номера тем по возрастанию без пропусков');
ok(!chain.some(p=>/Пустая/.test(p.name)),'часть без блоков отброшена');
eq(X.dfirParseOutline('## Часть I. A\n### Блок 1. B\n1. t\n\n## Не вошло\n\n2. не тема\n').reduce((s,p)=>s+X.dfirFlat([p]).length,0),1,'раздел «## Не вошло» закрывает блок');
eq(X.dfirParseOutline('\r\n## Часть II. Б\r\n### Блок 5. Реестр\r\n45. Кусты\r\n')[0].blocks[0].topics[0],{n:45,title:'Кусты'},'CRLF');

eq(X.dfirTopicFile('03 Windows изнутри/024 Токены, привилегии и UAC.md'),{n:24},'файл темы');
eq(X.dfirTopicFile('Работа\\03 Windows изнутри\\024 Токены.md'),{n:24},'обратные слэши');
eq(X.dfirTopicFile('Vault/02 База знаний/001 x.md'),null,'Vault отброшен');
eq(X.dfirTopicFile('Работа/.obsidian/001 x.md'),null,'.obsidian отброшен');
eq(X.dfirTopicFile('03 Windows изнутри/README.md'),null,'не тема');
eq(X.dfirTopicFile('03/24 x.md'),null,'нужны три цифры');

const FM='---\ntype: topic\nn: 24\ntitle: "Токены, привилегии и UAC"\nminutes: 35\n---\n\n# 24. Токены, привилегии и UAC\n\nТекст.';
const fr=X.dfirFront(FM);
eq(fr.meta.minutes,'35','minutes из frontmatter');
eq(fr.meta.title,'Токены, привилегии и UAC','кавычки сняты');
ok(fr.body.startsWith('# 24.'),'тело начинается с заголовка: '+fr.body.slice(0,10));
eq(X.dfirFront('# Без шапки\nтекст').body,'# Без шапки\nтекст','без frontmatter — как есть');
ok(X.dfirFront(FM.replace(/\n/g,'\r\n')).meta.n==='24','frontmatter с CRLF');

// ── DF2: progress from xpLog
const DONE={11:'2026-10-11',12:'2026-10-11',13:'2026-10-11',14:'2026-10-11',15:'2026-10-11',16:'2026-10-12',17:'2026-10-17',18:'2026-10-17',19:'2026-10-18',20:'2026-10-21',21:'2026-10-21',22:'2026-10-26',23:'2026-10-28'};
const xp0=Object.entries(DONE).map(([k,d])=>({id:'dfirt_'+k,date:d,sphere:'dfir',amount:50,source:'dfirTopic'}));
const log=[...xp0,{id:'dfirb_2',date:'2026-10-17',sphere:'dfir',amount:100,source:'dfirBlock'},{id:'task_x',date:'2026-10-20',sphere:'money',amount:20}];
const pr=X.dfirProgress(chain,log,'2026-11-05');
eq(pr.doneCount,13,'пройдено 13');
eq(pr.total,520,'всего 520');
eq(pr.current&&pr.current.n,24,'текущая — 24');
eq([pr.curBlock.n,pr.curBlock.doneInBlock,pr.curBlock.size,pr.curBlock.pct],[3,5,15,33],'текущий блок 3: 5/15');
eq([pr.blocks[0].done,pr.blocks[0].closed],[0,false],'блок 1: 0 из 10, не закрыт');
ok(pr.blocks[1].closed,'блок 2 закрыт');
eq([pr.parts[0].done,pr.parts[0].size,pr.parts[0].pct],[13,44,30],'часть I: 13/44 = 30 %');
eq(pr.parts[1].pct,0,'часть II: 0 %');
eq(pr.month.length,31,'31 день');
eq(pr.month[0].date,'2026-10-06','первый — 06.10');
eq(pr.month[30].date,'2026-11-05','последний — сегодня');
eq(pr.month.find(d=>d.date==='2026-10-11').xp,250,'11.10 = 250');
eq(pr.month.find(d=>d.date==='2026-10-17').xp,200,'17.10 = 200 (две темы + блок)');
eq(pr.month.find(d=>d.date==='2026-10-20').xp,0,'чужая сфера не считается');
eq(pr.xp,750,'опыт DFIR 750');
eq([pr.level.level,pr.rank],[2,'Стажёр'],'уровень 2, Стажёр');
eq(X.dfirProgress(chain,[],'2026-11-05').current.n,1,'ничего не пройдено → первая тема');
const allDone=flat.map(t=>({id:'dfirt_'+t.n,date:'2026-10-11',sphere:'dfir',amount:50}));
eq(X.dfirProgress(chain,allDone,'2026-11-05').current,null,'всё пройдено → null');
eq(X.dfirProgress(chain,[{id:'dfirt_520',date:'2026-10-11',sphere:'dfir',amount:50}],'2026-11-05').current.n,1,'пройдена последняя → первая непройденная');

// block xp
const done=X.dfirDoneMap(log);
eq(X.dfirBlockXpNeeded(chain,done,log),{add:[],del:[]},'всё согласовано');
done.delete(18);
eq(X.dfirBlockXpNeeded(chain,done,log),{add:[],del:['dfirb_2']},'снята тема 18 → снять dfirb_2');
const d2=X.dfirDoneMap(xp0);
eq(X.dfirBlockXpNeeded(chain,d2,xp0).add,[{id:'dfirb_2',block:2,date:'2026-10-17'}],'закрытый блок без записи → добавить с датой последней темы');

// grade
eq([1,2,4,5,14].map(L=>X.dfirGrade(L)),[1,2,4,1,4],'ступени: 1/2/4 → 1/2/4; 5 → 1; 14 → 4');
ok(X.rankOf(14).startsWith('Tier 1'),'на 14 — Tier 1');

// ── DF3: weekly series + freezes
const dates=Object.values(DONE);
const st=X.dfirStreak(dates,'2026-11-05');
eq([st.streak,st.record,st.thisWeek,st.freezes],[2,2,0,2],'реальные даты: серия 2, рекорд 2, неделя 0, заморозки 2');
eq(st.countedWeeks,['2026-10-05','2026-10-12'],'засчитаны недели 05.10 и 12.10');
eq(st.frozenWeeks,['2026-10-19','2026-10-26'],'заморожены 19.10 и 26.10');
// 3 пропуска подряд при 2 заморозках: неделя 02.11 тратит одну (после выдачи 1.11 их 3 → 2),
// потом 09.11, 16.11 тратят оставшиеся, 23.11 — заморозок нет, серия 0
const wk=(mon,k)=>Array.from({length:k},()=>mon);
const d3=[...wk('2026-10-12',3),...wk('2026-10-19',3),...wk('2026-10-26',3)];
const s3=X.dfirStreak(d3,'2026-12-03');
eq(s3.frozenWeeks,['2026-11-02','2026-11-09','2026-11-16'],'заморожены три недели ноября');
eq([s3.record,s3.streak],[3,0],'после трёх пропусков подряд серия 0, рекорд сохранён');
// полгода без пропусков → заморозок 3
const half=[];for(let i=0;i<26;i++){const mon=new Date(2026,0,5+7*i);const y=mon.getFullYear(),m=String(mon.getMonth()+1).padStart(2,'0'),d=String(mon.getDate()).padStart(2,'0');half.push(...wk(`${y}-${m}-${d}`,3))}
eq(X.dfirStreak(half,'2026-07-08').freezes,3,'заморозок не больше 3');
// пропуск до первой засчитанной недели не тратит заморозку
eq(X.dfirStreak([...wk('2026-10-05',1),...wk('2026-10-19',3)],'2026-10-28').freezes,3,'пропуск до старта не тратит');
// текущая неделя с 3 темами сразу +1
eq(X.dfirStreak([...wk('2026-10-26',3),'2026-11-02','2026-11-03','2026-11-04'],'2026-11-05').streak,2,'текущая неделя с 3 темами +1 сразу');
eq(X.dfirStreak(['2026-11-02'],'2026-11-05'),{...X.dfirStreak(['2026-11-02'],'2026-11-05'),streak:0,record:0,thisWeek:1,freezes:3},'без засчитанных недель — нули');
// выдача 1-го числа приходит раньше оценки недели, которая кончается в этот месяц
const s4=X.dfirStreak([...wk('2026-09-07',3),'2026-09-14','2026-09-21','2026-09-28','2026-10-05'],'2026-10-14');
eq([s4.streak,s4.freezes],[1,0],'09: 3 заморозки, недели 14,21,28.09 → 0, 1.10 +1, неделя 05.10 → 0');

// ── DF4: markdown → safe HTML
const titles={20:'Процессы и потоки',24:'Токены'};
const XSS='<script>alert(1)</script>';
const md=X.dfirMd(`# 24. Заголовок файла\n\n## Зачем\n\nТекст ${XSS} и \`${XSS}\` и **жирный** и *курсив*.\n\n### Токен\n\n- **SID** пользователя;\n- группы;\n- привилегии;\n- уровень целостности.\n\n\`\`\`powershell\nwhoami /priv ${XSS}\n\`\`\`\n\n| Поле | Значение |\n|---|---|\n| a | ${XSS} |\n| b | c |\n\n> [!question]- Почему?\n> Потому что [[020 Процессы и потоки]].\n\n> [!question]- Ещё?\n> Ответ, см. [[03 Реестр]] и [[020 Процессы и потоки|процессы]].\n\n[${XSS}](https://example.com) и [x](javascript:alert(1))\n\n> [!note]\n> Заметка.\n\n1. раз\n2. два\n   - вложенный\n`,titles);
ok(!md.includes('<script>'),'нигде нет живого <script>');
ok((md.match(/&lt;script&gt;/g)||[]).length>=4,'XSS экранирован в тексте, коде, таблице и ссылке: '+(md.match(/&lt;script&gt;/g)||[]).length);
ok(!/<h2>24\./.test(md)&&!md.includes('Заголовок файла'),'первый # файла не повторяется');
eq((md.match(/<h[2-6]>/g)||[]).length,2,'2 заголовка');
eq((md.match(/<ul><li>/g)||[]).length>=1&&(md.match(/<li>/g)||[]).length,7,'4 пункта + 2 нумерованных + 1 вложенный');
ok(/<ul><li><b>SID<\/b> пользователя;<\/li><li>группы;<\/li><li>привилегии;<\/li><li>уровень целостности.<\/li><\/ul>/.test(md),'список из 4 пунктов');
ok(/<pre class="df-code" data-lang="powershell"><code>whoami \/priv &lt;script&gt;/.test(md),'блок кода с языком');
ok(/<table><thead><tr><th>Поле<\/th><th>Значение<\/th><\/tr><\/thead><tbody><tr><td>a<\/td><td>&lt;script/.test(md)&&(md.match(/<tr>/g)||[]).length===3,'таблица 3×2');
eq((md.match(/<details class="df-call df-question"><summary>/g)||[]).length,2,'2 <details> с <summary>');
ok(md.includes('data-topic="20">020 Процессы и потоки</a>'),'[[020 …]] → ссылка на тему 20');
ok(md.includes('data-topic="20">процессы</a>'),'[[x|подпись]] показывает подпись');
ok(md.includes('<span class="df-wl-x">03 Реестр</span>'),'[[03 Реестр]] → обычный текст');
ok(/<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">&lt;script&gt;/.test(md),'внешняя ссылка, подпись экранирована');
ok(!/href="javascript/i.test(md)&&md.includes(' и x'),'javascript: → обычный текст');
ok(md.includes('<b>жирный</b>')&&md.includes('<i>курсив</i>'),'жирный и курсив');
ok(md.includes('<code>&lt;script&gt;alert(1)&lt;/script&gt;</code>'),'инлайн-код экранирован');
ok(/<div class="df-call df-note"><div class="df-call-t">note<\/div><p>Заметка.<\/p><\/div>/.test(md),'выноска note');
ok(/<ol><li>раз<\/li><li>два<ul><li>вложенный<\/li><\/ul><\/li><\/ol>/.test(md),'вложенный список');
const open=X.dfirMd('Текст\n\n```\nкод без конца\n\n## Не заголовок',titles);
ok(/<pre class="df-code"><code>код без конца\n\n## Не заголовок<\/code><\/pre>$/.test(open),'незакрытый блок кода закрывается в конце: '+open);
ok(open.startsWith('<p>Текст</p>'),'текст до блока цел');
ok(!X.dfirMd('<img src=x onerror=alert(1)>').includes('<img'),'html в тексте экранирован');

// ── DF6: upload plan
const files=[
  {path:'Работа/Оглавление цепочки.md',text:OUT},
  {path:'Работа/progress.json',text:JSON.stringify({done:DONE})},
  {path:'Работа/03 Блок/024 Файл темы.md',text:FM},
  {path:'Работа/03 Блок/020 Процессы.md',text:'# 20. Процессы\n\nтекст'},
  {path:'Работа/Vault/024 Чужой.md',text:'чужое'},
  {path:'Работа/99 Лишнее/999 Нет в оглавлении.md',text:'x'},
];
const p1=X.dfirPlanUpload(files,null,{},[]);
ok(p1.outline&&X.dfirFlat(p1.chain).length===520,'оглавление из папки');
eq(p1.texts.map(t=>[t.id,t.n,t.title]).sort(),[['020',20,'Тема 20: проверка разбора'],['024',24,'Тема 24: проверка разбора']],'тексты 020 и 024, названия из оглавления');
ok(p1.texts.find(t=>t.n===24).text.startsWith('# 24.')&&!p1.texts.find(t=>t.n===24).text.includes('minutes:'),'текст без frontmatter');
eq(p1.marks.length,13,'13 отметок из progress.json');
ok(p1.marks.every(m=>m.amount===50&&m.sphere==='dfir'&&m.source==='dfirTopic'&&DONE[m.id.slice(6)]===m.date),'отметки с исходными датами');
eq(p1.blocks.map(b=>[b.id,b.date,b.amount]),[['dfirb_2','2026-10-17',100]],'блок 2 от 17.10');
const t24=X.dfirFlat(p1.chain).find(t=>t.n===24);
ok(t24.has&&t24.minutes===35&&t24.h,'у темы 24 есть текст, минуты и hash');
ok(!X.dfirFlat(p1.chain).find(t=>t.n===66).has,'у темы 66 текста нет');
const log2=[...p1.marks,...p1.blocks],meta={};X.dfirFlat(p1.chain).forEach(t=>{if(t.h)meta[t.n]=t.h});
const p2=X.dfirPlanUpload(files,p1.chain,meta,log2);
eq([p2.texts.length,p2.skipped,p2.marks.length,p2.blocks.length],[0,2,0,0],'повторная загрузка — пустой план');
const p3=X.dfirPlanUpload([{path:'03 Блок/020 Процессы.md',text:'# 20. Процессы\n\nновый текст'}],p1.chain,meta,log2);
ok(!p3.outline&&p3.texts.length===1&&p3.texts[0].n===20,'только папка блока: оглавление из сохранённого, изменённый текст');
ok(X.dfirFlat(p3.chain).find(t=>t.n===24).has,'старый флаг has сохраняется');
eq(X.dfirPlanUpload([{path:'03/020 x.md',text:'x'}],null,{},[]),{error:'noOutline'},'без оглавления — ошибка');
const dup=X.dfirPlanUpload([{path:'Оглавление цепочки.md',text:OUT},{path:'a/024 Черновик.md',text:'---\nn: 99\n---\nчерновик'},{path:'b/024 Тема.md',text:'---\nn: 24\n---\nнастоящая'}],null,{},[]);
eq(dup.texts[0].text,'настоящая','из двух файлов с одним номером — тот, где n совпадает');
eq(X.dfirPlanUpload([{path:'Оглавление цепочки.md',text:OUT},{path:'progress.json',text:'не json'}],null,{},[]).marks,[],'битый progress.json не ломает загрузку');

// ── DF5: rules allow the texts collection
const rules=fs.readFileSync(path.join(ROOT,'firestore.rules'),'utf8');
ok(/function dataColl[\s\S]*?'dfirTopics'[\s\S]*?\];/.test(rules),'dfirTopics в dataColl');
ok(src.includes("dbClear('dfirTopics')"),'clearAll чистит dfirTopics');
ok(!src.includes("getCol('dfirTopics')")&&!src.includes("dbAll('dfirTopics')"),'тексты не читаются целиком');

console.log(fail?`${fail} из ${n} проверок упали`:`ok: ${n} проверок`);
process.exitCode=fail?1:0;
