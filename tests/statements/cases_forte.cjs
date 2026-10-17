// ForteBank, synthetic only. Row shape from the parser verified on a real export; F1.5 edge cases are synthetic.
const S='   ';
const FH=['АО "ForteBank"','Выписка по счету KZ1296503F0001234567','Валюта счета: KZT','Дата   Сумма   Валюта   Операция   Детализация'];
const f=(d,a,op,det,cur='KZT')=>`${d}${S}${a}${S}${cur}${S}${op}${det?S+det:''}`;
module.exports=[
{b:'forte',n:'plus sign + space thousands',L:[...FH,f('06.10.2026','+15 000.00','Пополнение счета','Иванов И.')],E:[['2026-10-06','income',15000,'Иванов']]},
{b:'forte',n:'million with comma thousands',L:[...FH,f('06.10.2026','-1,250,000.00','Покупка','TECHNODOM')],E:[['2026-10-06','expense',1250000,'TECHNODOM']]},
{b:'forte',n:'Unicode minus',L:[...FH,f('06.10.2026','−900.00','Покупка','SMALL')],E:[['2026-10-06','expense',900,'SMALL']]},
{b:'forte',n:'zero rows (0.00 / -0.00) not imported',L:[...FH,f('05.10.2026','-0.00','Покупка','Проверка карты'),f('05.10.2026','0.00','Пополнение счета','Проверка'),f('05.10.2026','-100.00','Покупка','A')],E:[['2026-10-05','expense',100,'A']]},
{b:'forte',n:'3-line centred cell (before/inline/after) does not leak',L:[...FH,'ИП ДЛИННОЕ',f('05.10.2026','-900.00','Покупка','МАГАЗИН, MCC: 5'),'411',f('05.10.2026','-300.00','Покупка','B')],E:[['2026-10-05','expense',900,'ИП ДЛИННОЕ'],['2026-10-05','expense',300,'B']],descExact:{0:'ИП ДЛИННОЕ МАГАЗИН, MCC: 5411',1:'B'}},
{b:'forte',n:'4-line cell then a row without detail',L:[...FH,'ИП ДЛИННОЕ ИМЯ','МАГАЗИН, MCC: 5',f('05.10.2026','-900.00','Покупка',''),'411','Kaspi Bank',f('05.10.2026','-300.00','Покупка','')],E:[['2026-10-05','expense',900,'Kaspi Bank'],['2026-10-05','expense',300,'Покупка']],descExact:{0:'ИП ДЛИННОЕ ИМЯ МАГАЗИН, MCC: 5411 Kaspi Bank',1:'Покупка'}},
{b:'forte',n:'USD row with wrapped detail does not pollute the next row',L:[...FH,'NETFLIX.COM, MCC: 4',f('05.10.2026','-10.00','Покупка','','USD'),'899',f('05.10.2026','-300.00','Покупка','')],E:[['2026-10-05','expense',300,'Покупка']],descExact:{0:'Покупка'}},
{b:'forte',n:'prefix before page-2 header survives',L:[...FH,f('04.10.2026','-100.00','Покупка','A'),'SMALL, ТОО, MCC: 5','Страница 1 из 2','Выписка по счету KZ1296503F0001234567',...FH.slice(3),f('05.10.2026','-900.00','Покупка',''),'411'],E:[['2026-10-04','expense',100,'A'],['2026-10-05','expense',900,'SMALL']],descExact:{0:'A',1:'SMALL, ТОО, MCC: 5411'}},
{b:'forte',n:'own in AND out skipped (между своими / собственный)',L:[...FH,f('05.10.2026','30000.00','Пополнение счета','Перевод между своими счетами'),f('05.10.2026','-30000.00','Перевод','На собственный счет'),f('05.10.2026','-500.00','Перевод','Иванов И.')],E:[['2026-10-05','expense',500,'Иванов']],own:1},
{b:'forte',n:'summary section after table is not attached',L:[...FH,f('05.10.2026','-900.00','Покупка',''),'Задолженность','Сумма задолженности 0.00'],E:[['2026-10-05','expense',900,'Покупка']],descExact:{0:'Покупка'}},
{b:'forte',n:'Kazakh two-word op',L:['АО "ForteBank"','Шот бойынша үзінді KZ1296503F0001234567','Күні   Сомасы   Валюта   Операция',f('05.10.2026','-1500.00','Сатып алу','MAGNUM')],E:[['2026-10-05','expense',1500,'MAGNUM']],descExact:{0:'MAGNUM'}},
{b:'forte',n:'detect: HSBKKZKX / Kaspi Gold / 551D in details stay forte',L:[...FH,f('05.10.2026','-1000.00','Перевод','На Kaspi Gold HSBKKZKX KZ12551D000000000KZT')],E:[['2026-10-05','expense',1000,'Kaspi Gold']]},
];
