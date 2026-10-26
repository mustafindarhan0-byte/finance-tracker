// Classifier dictionary: new categories (Покупки / Переводы / Наличные), merchants from statements, one-time re-sort of «Другое».
// Samples are made up or generic merchant names — no real people or account numbers. node tests/categories.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
const sl=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error(a);return src.slice(i,j)};
const ctx={learnedMap:{}};vm.createContext(ctx);
vm.runInContext(sl('const CATS={','\n};')+'\n};\n'+sl('const KEYWORDS={','const CUR_SYM')+sl('const CAT_TYPE={};','async function classify(')+sl('async function classify(','\n}\n')+'\n}\nthis.C={classify,recatTx,CATS,CAT_TYPE,KEYWORDS};',ctx);
const C=ctx.C;let pass=0,fail=0;
const ok=(c,n,x)=>{if(c)pass++;else{fail++;console.log('FAIL',n,x!==undefined?JSON.stringify(x):'')}};
(async()=>{
  const E=d=>C.classify(d,'expense');
  ok(['shopping','transfers','cash'].every(id=>C.CAT_TYPE[id]==='expense'),'new expense categories exist');
  ok(C.CATS.expense[C.CATS.expense.length-1].id==='other_exp','«Другое» stays last');
  const cases=[
    ['Иван П.','transfers'],['Перевод с карты на карту','transfers'],['Получатель: 440043******0000','transfers'],['На карту Halyk Bank*0000','transfers'],['400000******0000','transfers'],
    ['Банкомат Magnit','cash'],['Снятие наличных','cash'],
    ['BAS DENT DENTISTRY ASTANA KZ','health'],['ТОО "PRIME MED"','health'],
    ['ISPACE SHOP ALMATY KZ','shopping'],['GOLDAPPLE.KZ ALMATY KZ','shopping'],['TECHNODOM','shopping'],
    ['PAMPUSHKA ASTANA KZ','food'],['DODO PICCA NUR-SULTAN KZ','food'],['STOLOVAYA DINING ROOM ASTANA KZ','food'],['TATTI TATTI CONFECTION ASTANA KZ','food'],
    ['GOMART ASTANA Q. KZ','groceries'],['DARMART G.ASTANA KZ','groceries'],['MAX MART MINIMARKET','groceries'],['Magnum','groceries'],
    ['Астана ЕРЦ','home'],['ESIL STROYMARKET G.ASTANA KZ','home'],
    ['KINOPARK.KZ','fun'],['Topbilet','fun'],
    ['STARS BOUTIQUE ASTANA KZ','clothes'],['MAGAZIN QALAM STORE G. ASTANA','education'],
    ['кофе','food'],['такси','transport']
  ];
  for(const [d,want] of cases){const got=await E(d);ok(got===want,`«${d}» → ${want}`,got)}
  ok(await C.classify('Иван П.','income')==='transfers_in','money from a person is an incoming transfer');
  // statement fallback: nothing stays in «Другое»
  const S=(d,ty,a)=>C.classify(d,ty,a,true);
  ok(await S('ИП НЕИЗВЕСТНЫЙ','expense',1500)==='food'&&await S('TOO \"НЕИЗВЕСТНО\" ASTANA KZ','expense',2900)==='food','an unknown shop up to 3 000 ₸ → Еда');
  ok(await S('ИП НЕИЗВЕСТНЫЙ','expense',12990)==='shopping'&&await S('OKAY,ASTANA,KZ','expense',4000)==='shopping','an unknown shop above 3 000 ₸ → Покупки');
  ok(await S('Иван Петров Сергеевич','expense',5000)==='transfers','a full name → transfer');
  ok(await S('В Kaspi Банкомате','income',220000)==='transfers_in'&&await S('Поступление перевода','income',42500)==='transfers_in'&&await S('Пополнение','income',874)==='transfers_in'&&await S('ИВАН П.,  Freedom Bank','income',10000)==='transfers_in','incoming money from people / banks / cash-in → Переводы');
  ok(await S('Возврат денег','income',24000)==='refund'&&await S('IP ZAMZAM,ASTANA,KZ','income',1000)==='refund','money back from a shop → Возвраты и бонусы');
  ok(await C.classify('ИП НЕИЗВЕСТНЫЙ','expense',1500)===null,'manual input keeps «Другое» for the unknown (fallback is for statements only)');
  ok(await S('Аппарат самообслуживания','expense',870)==='food'&&await S('TOO ZERDE PHARMA,ASTANA','expense',860)==='health','vending → Еда, pharmacy → Здоровье');
  ok(await E('ИП НЕИЗВЕСТНЫЙ')===null,'an unknown merchant stays unclassified');
  ok(await E('STUDENT CARD')!=='health','«student» is not a dentist');
  // re-sort of «Другое»
  ok((await C.recatTx({id:1,type:'expense',category:'other_exp',description:'Банкомат Magnit'})).category==='cash','«Другое» with a now-known description is re-sorted');
  ok(await C.recatTx({id:2,type:'expense',category:'food',description:'Банкомат Magnit'})===null,'a category already set is never touched');
  ok(await C.recatTx({id:3,type:'expense',category:'other_exp',description:'ИП НЕИЗВЕСТНЫЙ'})===null,'still unknown → stays');
  ctx.learnedMap['банкомат magnit']='other_exp';
  ok(await C.recatTx({id:4,type:'expense',category:'other_exp',description:'Банкомат Magnit'})===null,'a description taught by hand is respected');
  console.log(`categories: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
