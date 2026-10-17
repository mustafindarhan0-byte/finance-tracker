// F1.8 CSV statement import: extracts the real CSV helpers + analyzeStatement/loadCsvStatement from index.html
// (read-only) into a sandbox with a tiny fake DOM. Synthetic data only. Run: node tests/statements/csv.cjs
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=[
  slice('function escapeHtml(','\n'),
  slice('async function loadCsvStatement(','async function loadPdfStatement('),
  slice('function missRow(','let stmtBank='),
  slice('function stmtKey(','async function showPdfResults('),
  slice('function parseStmtAmount(','function toggleAllStmt('),
].join('\n');
const els={};
const el=id=>els[id]||(els[id]={id,value:'',innerHTML:'',hidden:true});
const ctx={console,TextDecoder,
  document:{getElementById:el},
  toast:m=>{ctx.lastToast=m},icoInline:()=>'',fmtCur:n=>String(n),formatDateShort:d=>d,CATS:{expense:[{id:'other_exp',name:'Другое'}],income:[{id:'other_inc',name:'Другое'}]},CAT_MAP:new Map(),
  BANK_NAMES:{kaspi:'Kaspi Bank',forte:'Forte Bank',halyk:'Halyk Bank',freedom:'Freedom Bank'},
  detectBank:()=>null,confirmNotDuplicateStatement:async()=>true,
  getTxs:async()=>ctx.TXS||[],
};
vm.createContext(ctx);
vm.runInContext(code+`
;var stmtData=[],stmtBank='',stmtMode='pdf',stmtMissed=[],detectedBalance=null;
this.F={parseStmtAmount,parseStmtDate,parseCsvRows,detectCsvDelimiter,findCsvHeaderRow,parseCsvTable,decodeCsvBuffer,looksMisdecoded,guessCsvColumns,stmtTypeFromCell,stmtRowEntries,analyzeStatement,loadCsvStatement};
this.S=()=>({stmtData,stmtBank,stmtMode,stmtMissed});`,ctx);
const F=ctx.F;

let pass=0,fail=0;
function t(name,fn){try{fn();pass++}catch(e){fail++;console.log('FAIL',name,'\u2014',e.message)}}
const eq=(a,b)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));

// ── amounts ──
[['-1 500,00',-1500],['1 500,00-',-1500],['(1 500,00)',-1500],['\u22121 500',-1500],['1.500',1500],['1,500',1500],
 ['1,50',1.5],['1.500,50',1500.5],['1,500.50',1500.5],['KZT -2 000',-2000],['-2 000 ₸',-2000],['1\u00A0500,00',1500],
 ['1\u202F500,00 KZT',1500],['(1 500,00 ₸)',-1500],['+2 000',2000],['0.500',0.5],['1.500.000',1500000],['1,500,000.25',1500000.25],
 ['USD 12.50',12.5],['-1,50',-1.5],['1 500,00 \u2212',-1500],['₸ 1 234,5',1234.5],['',0],['\u2014',0],['abc',0],[null,0]
].forEach(([s,e])=>t('amount '+JSON.stringify(s),()=>assert.strictEqual(F.parseStmtAmount(s),e)));

// ── dates ──
[['05.10.2026','2026-10-05'],['5.1.2026','2026-01-05'],['05.10.26','2026-10-05'],['2026-10-05T14:22:00','2026-10-05'],
 ['2026-10-05 14:22','2026-10-05'],['10/05/2026','2026-05-10'],['05-10-2026','2026-10-05'],['2026.10.05','2026-10-05'],
 ['05.10.2026 23:59:01','2026-10-05'],['45935','2025-10-05'],['45935.75','2025-10-05'],['45351','2024-02-29'],
 ['31.02.2026',null],['12345',null],['99999',null],['вчера',null],['',null],['32.01.2026',null],['05.13.2026',null]
].forEach(([s,e])=>t('date '+JSON.stringify(s),()=>assert.strictEqual(F.parseStmtDate(s).iso,e)));
t('date dd.mm without year → key only',()=>eq(F.parseStmtDate('05.10'),{iso:null,key:'10-05'}));
t('date key for full date',()=>eq(F.parseStmtDate('05.10.2026'),{iso:'2026-10-05',key:'10-05'}));

// ── RFC 4180 rows ──
t('rfc quoted delimiter',()=>eq(F.parseCsvRows('a;"b;c";d',';'),[['a','b;c','d']]));
t('rfc escaped quotes',()=>eq(F.parseCsvRows('"ТОО ""Ромашка""",1',','),[['ТОО "Ромашка"','1']]));
t('rfc CRLF + LF + CR rows',()=>eq(F.parseCsvRows('a,b\r\nc,d\ne,f\rg,h',','),[['a','b'],['c','d'],['e','f'],['g','h']]));
t('rfc newline inside quotes',()=>eq(F.parseCsvRows('1,"line1\r\nline2",3\r\n',','),[['1','line1\r\nline2','3']]));
t('rfc empty fields + trailing delimiter',()=>eq(F.parseCsvRows(';;x;\n',';'),[['','','x','']]));
t('rfc no trailing newline / blank lines kept as empty rows',()=>eq(F.parseCsvRows('a\n\nb','\t'),[['a'],[''],['b']]));
t('rfc tab',()=>eq(F.parseCsvRows('a\t"b\tc"\n','\t'),[['a','b\tc']]));

// ── delimiter detection ──
t('delim ; with decimal commas',()=>assert.strictEqual(F.detectCsvDelimiter('Дата;Описание;Сумма\n05.10.2026;Магнум;-1 500,00\n06.10.2026;Зарплата;200 000,00\n'),';'));
t('delim , with quoted decimal-comma amounts',()=>assert.strictEqual(F.detectCsvDelimiter('Date,Description,Amount\n05.10.2026,"Shop; Ltd","-1 500,00"\n06.10.2026,Salary,"200 000,00"\n'),','));
t('delim tab',()=>assert.strictEqual(F.detectCsvDelimiter('Дата\tСумма\tОписание\n05.10.2026\t-1 500,00\tМагнум; ТЦ\n'),'\t'));
t('delim , simple',()=>assert.strictEqual(F.detectCsvDelimiter('date,amount,desc\n2026-10-05,-1500.00,shop\n'),','));

// ── header detection ──
t('header after preamble',()=>{
  const rows=F.parseCsvRows('Выписка по счёту KZ00000A0000000000;;;\nПериод: 01.10.2026 - 15.10.2026;;;\nКлиент;Тестов Тест;ИИН 000000000000;\n;;;\nДата операции;Сумма;Валюта;Описание\n05.10.2026;-1 500,00;KZT;Магнум\n',';');
  assert.strictEqual(F.findCsvHeaderRow(rows),4);
});
t('header row 0 when first',()=>assert.strictEqual(F.findCsvHeaderRow(F.parseCsvRows('Date,Amount,Description\n2026-10-05,-1,x\n',',')),0));
t('header fallback: text row without known words',()=>assert.strictEqual(F.findCsvHeaderRow(F.parseCsvRows('x\nКогда,Сколько,Что\n05.10.2026,-1,магазин\n',',')),1));
t('parseCsvTable strips BOM, skips empty rows',()=>{
  const r=F.parseCsvTable('\uFEFF"Дата";"Сумма";"Описание"\r\n05.10.2026;-1 500,00;"Магнум; ТЦ"\r\n;;\r\n06.10.2026;"2 000,00";Возврат\r\n');
  eq([r.delim,r.headers,r.rows.length,r.rows[0][2],r.width],[';',['Дата','Сумма','Описание'],2,'Магнум; ТЦ',3]);
});

// ── decoding ──
t('decode utf-8 with BOM',()=>assert.strictEqual(F.decodeCsvBuffer(Buffer.concat([Buffer.from([0xEF,0xBB,0xBF]),Buffer.from('Дата;Сумма','utf8')])),'Дата;Сумма'));
t('decode windows-1251 fallback',()=>{
  const cp=Buffer.from([0xC4,0xE0,0xF2,0xE0,0x3B,0xD1,0xF3,0xEC,0xEC,0xE0,0x3B,0xCE,0xEF,0xE8,0xF1,0xE0,0xED,0xE8,0xE5]); // Дата;Сумма;Описание
  assert.strictEqual(F.decodeCsvBuffer(cp),'Дата;Сумма;Описание');
});
t('decode utf-16le BOM',()=>assert.strictEqual(F.decodeCsvBuffer(Buffer.concat([Buffer.from([0xFF,0xFE]),Buffer.from('Дата\tСумма','utf16le')])),'Дата\tСумма'));
t('one stray U+FFFD in utf-8 is not re-decoded',()=>assert.strictEqual(F.looksMisdecoded('Дата;Сумма;Описание\n05.10.2026;-1 500,00;Магнум\uFFFD ТЦ на Абая, длинное описание'),false));

// ── type / debit-credit ──
t('type cell words',()=>eq(['Списание','Пополнение','Покупка','Погашение кредита','Кредит','Возврат оплаты','Перевод','-','+','CR'].map(F.stmtTypeFromCell),['expense','income','expense','expense','income','income','','expense','income','income']));
t('debit/credit: expense column',()=>eq(F.stmtRowEntries(['05.10.2026','','1 500,00','Магнум'],{amount:-1,income:1,expense:2,type:-1}),[{type:'expense',amount:1500}]));
t('debit/credit: income column',()=>eq(F.stmtRowEntries(['05.10.2026','200 000,00','','ЗП'],{amount:-1,income:1,expense:2,type:-1}),[{type:'income',amount:200000}]));
t('debit/credit: negative in expense column → abs',()=>eq(F.stmtRowEntries(['x','','-700'],{amount:-1,income:1,expense:2}),[{type:'expense',amount:700}]));
t('debit/credit: both filled → two entries',()=>eq(F.stmtRowEntries(['x','100','50'],{amount:-1,income:1,expense:2}),[{type:'expense',amount:50},{type:'income',amount:100}]));
t('debit/credit override the sign of the amount column',()=>eq(F.stmtRowEntries(['x','-999','','300'],{amount:1,income:-1,expense:3}),[{type:'expense',amount:300}]));
t('type column overrides sign',()=>eq(F.stmtRowEntries(['x','1 500,00','Списание'],{amount:1,income:-1,expense:-1,type:2}),[{type:'expense',amount:1500}]));
t('unknown type → sign',()=>eq(F.stmtRowEntries(['x','-1 500,00','Перевод'],{amount:1,income:-1,expense:-1,type:2}),[{type:'expense',amount:1500}]));
t('zero amount → no entry',()=>eq(F.stmtRowEntries(['x','0,00'],{amount:1,income:-1,expense:-1}),[]));
t('guess columns: debit/credit layout',()=>eq(F.guessCsvColumns(['Дата','Дебет','Кредит','Назначение платежа']),{date:0,amount:-1,desc:3,income:2,expense:1,type:-1}));
t('guess columns: signed amount layout',()=>eq(F.guessCsvColumns(['Дата','Сумма','Операция','Детали']),{date:0,amount:1,desc:3,income:-1,expense:-1,type:2}));

// ── integration: loadCsvStatement → analyzeStatement with the fake DOM ──
(async()=>{
  const csv='Выписка (синтетическая);;;;\r\n;;;;\r\nДата;Приход;Расход;Описание;Тип\r\n05.10.2026;;"1 500,00";"ТОО ""Тест""; ТЦ";Покупка\r\n06.10.2026;"200 000,00";;Зарплата;Пополнение\r\nкогда-то;;700;Без даты;Покупка\r\n07.10.2026;;"2 000,00";Магазин;Покупка\r\n;;;Итого;\r\n';
  await F.loadCsvStatement({arrayBuffer:async()=>Buffer.from(csv,'utf8')});
  t('load: mapping shown, columns guessed',()=>eq([el('stmt-mapping').hidden,el('map-date').value,el('map-income').value,el('map-expense').value,el('map-desc').value,el('map-type').value,ctx.S().stmtData.length],[false,'0','1','2','3','4',5]));
  t('load: header names escaped into options',()=>assert.ok(el('map-desc').innerHTML.includes('<option value="3">Описание</option>')&&el('map-amount').innerHTML.startsWith('<option value="">')));
  el('map-amount').value='';el('map-bank').value='freedom';
  ctx.TXS=[{type:'expense',date:'2026-10-05',amount:1500,bank:'freedom'},{type:'expense',date:'2026-10-07',amount:2000,bank:'kaspi'}];
  await F.analyzeStatement();
  const S=ctx.S(),html=el('stmt-results').innerHTML;
  t('analyze: bank stored in stmtBank, mode csv',()=>eq([S.stmtBank,S.stmtMode],['freedom','csv']));
  t('analyze: matched freedom tx, kaspi tx not matched, bad date not addable',()=>eq(S.stmtMissed,[{desc:'Зарплата',amount:200000,date:'2026-10-06',type:'income'},{desc:'Магазин',amount:2000,date:'2026-10-07',type:'expense'}]));
  t('analyze: bad-date row red, unchecked, disabled, no id',()=>{const m=html.match(/<div[^>]*title="Дата не распознана"><input type="checkbox" disabled><label style="color:var\(--red\)">[^<]*Без даты/);assert.ok(m,'bad row markup');assert.ok(!/stmt-chk-2/.test(html))});
  t('analyze: statement text escaped',()=>assert.ok(html.includes('ТОО &quot;Тест&quot;; ТЦ')&&!html.includes('ТОО "Тест"')));
  t('analyze: summary counts the bad date',()=>assert.ok(/Дата не распознана: <b>1<\/b>/.test(el('stmt-summary').innerHTML)&&el('stmt-summary').innerHTML.includes('Freedom Bank')));
  el('map-date').value='';await F.analyzeStatement();
  t('analyze: no date column → toast, nothing done',()=>assert.strictEqual(ctx.lastToast,'Выбери столбец даты'));
  console.log(`csv.cjs: ${pass} passed, ${fail} failed`);
  process.exitCode=fail?1:0;
})();
