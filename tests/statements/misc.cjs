const F=require('./load.cjs');
const det=[
 ['freedom w/ payment to Halyk IBAN+BIC in details','АО "Фридом Банк Казахстан"\nБИК KSNVKZKA\n01.10.2026   -5,000.00 ₸   KZT   Платеж   Получатель ИП X, KZ12601A000, HSBKKZKX\n','freedom'],
 ['kaspi w/ "Forte Bank" in details','АО «Kaspi Bank», БИК CASPKZKA\nДата   Сумма   Операция   Детали\n05.10.25   -   1 000,00 ₸   Перевод   На карту Forte Bank\n','kaspi'],
 ['kaspi w/ Freedom IBAN in details','АО «Kaspi Bank», БИК CASPKZKA\n05.10.25   -   1 000,00 ₸   Перевод   KZ12551D000000000KZT\n','kaspi'],
 ['jusan statement mentioning Kaspi Gold','АО "Jusan Bank" БИК TSESKZKA\n05.10.2026 -1 000,00 KZT Перевод на Kaspi Gold\n',null],
 ['forte w/ HSBKKZKX in details','АО "ForteBank" KZ1296503F0001234567\n05.10.2026   -1000.00   KZT   Перевод   HSBKKZKX\n','forte'],
];
for(const[n,t,e]of det){const d=F.detectBank(t);if(d!==e)console.log('DETECT',n,':',d,'expected',e)}
// balances
const bal=[
 ['kaspi','Доступно на 15.10.25:   + 10 000,00 ₸',10000],['kaspi','Доступно на 15.10.25   + 10 000,00 ₸',10000],
 ['forte','Доступно на 15.10.2026:   -5 000,00 KZT',-5000],['freedom','KZ00551D000000000KZT   KZT   -5,000.00 ₸',-5000],
 ['freedom','KZ01551D1KZT   KZT   1,000.00 ₸\nKZ02551D2KZT   KZT   2,000.00 ₸\nДата Сумма\n01.10.2026   -1.00 ₸   KZT   Покупка',null],
 ['halyk','Исходящий остаток: -124,11 KZT; 0,00 USD;',-124.11],
];
for(const[b,t,e]of bal){const v=F.extractStatementBalance(b,t);if(v!==e)console.log('BAL',b,JSON.stringify(t.split('\n')[0]),'->',v,'expected',e)}
// CSV helpers
const amt=[['-1 500,00',-1500],['1 500,00-',-1500],['(1 500,00)',-1500],['−1 500',-1500],['1.500',1500],['1,500',1500],['1,50',1.5],['1.500,50',1500.5],['1,500.50',1500.5],['KZT -2 000',-2000],['-2 000 ₸',-2000]];
for(const[s,e]of amt){const v=F.parseStmtAmount(s);if(v!==e)console.log('AMT',JSON.stringify(s),'->',v,'expected',e)}
const dt=[['05.10.2026','2026-10-05'],['5.10.2026','2026-10-05'],['05.10.26','2026-10-05'],['2026-10-05 14:22','2026-10-05'],['10/05/2026','2026-10-05 (if US) or 2026-05-10'],['45935','2025-10-05 (Excel serial)'],['05.10.2026 23:59','2026-10-05']];
for(const[s,e]of dt){const v=F.parseStmtDate(s);if(v.iso!==e)console.log('DATE',JSON.stringify(s),'->',JSON.stringify(v),'expected',e)}
// matching
const txs=[{type:'expense',date:'2026-10-05',amount:1500,bank:'kaspi'},{type:'expense',date:'2026-10-04',amount:2000,bank:'freedom'},{type:'expense',date:'2026-10-05',amount:900},{type:'expense',date:'2025-10-05',amount:700,bank:'freedom'}];
const idx=F.buildTxIndex(txs,'freedom');
const q=[['manual on kaspi (wrong lastBank), stmt freedom','expense','2026-10-05',1500],['posted next day','expense','2026-10-05',2000],['legacy tx w/o bank','expense','2026-10-05',900],['last year same day (CSV short key)','expense','2026-10-05',700]];
for(const[n,t,d,a]of q)console.log('MATCH',n,'->',F.takeMatch(idx,F.stmtKey(t,d,a)));
const sidx=F.buildTxIndex(txs,'',true);console.log('MATCH short key, 05.10 w/o year vs 2025 tx ->',F.takeMatch(sidx,'expense|10-05|70000'));
