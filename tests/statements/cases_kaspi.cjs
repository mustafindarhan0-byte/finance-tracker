// Kaspi Gold, synthetic only (no real export available: layout from the existing parser, F1.5 wording is a guess).
const S='   ';
const KH=['АО «Kaspi Bank», БИК CASPKZKA, www.kaspi.kz','ВЫПИСКА','по Kaspi Gold за период с 01.10.25 по 15.10.25','Доступно на 15.10.25:   + 10 000,00 ₸','Дата   Сумма   Операция   Детали'];
const KZ=['АО «Kaspi Bank», БИК CASPKZKA','Kaspi Gold бойынша үзінді көшірме','Күні   Сомасы   Операция   Толығырақ'];
const k=(d,s,a,op,det)=>`${d}${S}${s}${S}${a} ₸${S}${op}${S}${det}`;
module.exports=[
{b:'kaspi',n:'glued plus sign "+150 000,00"',L:[...KH,'06.10.25   +150 000,00 ₸   Пополнение   ТОО Работодатель'],E:[['2025-10-06','income',150000,'Работодатель']]},
{b:'kaspi',n:'4-digit year + glued Unicode minus',L:[...KH,'05.10.2025   −2 500,00 ₸   Покупка   MAGNUM'],E:[['2025-10-05','expense',2500,'MAGNUM']]},
{b:'kaspi',n:'two glued-sign rows merged on one line',L:[...KH,'05.10.25   -500,00 ₸   Покупка   COFFEE   05.10.2025   +700,00 ₸   Пополнение   Иванов И.'],E:[['2025-10-05','expense',500,'COFFEE'],['2025-10-05','income',700,'Иванов']],descExact:{0:'COFFEE',1:'Иванов И'}},
{b:'kaspi',n:'wrap: 2 detail lines appended, footer is not',L:[...KH,k('05.10.25','-','3 000,00','Покупка','ИП ОЧЕНЬ ДЛИННОЕ'),'НАЗВАНИЕ МАГАЗИНА','ПРОДУКТЫ 24','Страница 1 из 2',...KH.slice(4),k('04.10.25','-','200,00','Покупка','B')],E:[['2025-10-05','expense',3000,'ПРОДУКТЫ 24'],['2025-10-04','expense',200,'B']],descExact:{0:'ИП ОЧЕНЬ ДЛИННОЕ НАЗВАНИЕ МАГАЗИНА ПРОДУКТЫ 24',1:'B'}},
{b:'kaspi',n:'wrap stops at the bank footer line',L:[...KH,k('05.10.25','-','100,00','Покупка','A'),'АО «Kaspi Bank», БИК CASPKZKA, www.kaspi.kz'],E:[['2025-10-05','expense',100,'A']],descExact:{0:'A'}},
{b:'kaspi',n:'repeated summary w/o colon on page 2 is not a row',L:[...KH,k('05.10.25','-','100,00','Покупка','A'),'Доступно на 15.10.25   + 10 000,00 ₸',...KH.slice(4),k('04.10.25','-','200,00','Покупка','B')],E:[['2025-10-05','expense',100,'A'],['2025-10-04','expense',200,'B']]},
{b:'kaspi',n:'own: Перевод С Kaspi Депозита (guess wording)',L:[...KH,k('05.10.25','+','50 000,00','Перевод','С Kaspi Депозита')],E:[],own:1},
{b:'kaspi',n:'own: Пополнение Kaspi Депозита (guess wording)',L:[...KH,k('05.10.25','-','50 000,00','Пополнение','Kaspi Депозита')],E:[],own:1},
{b:'kaspi',n:'own: wording wrapped onto 2nd line',L:[...KH,k('05.10.25','-','50 000,00','Перевод','На Kaspi'),'Депозит'],E:[],own:1},
{b:'kaspi',n:'own: Перевод между своими счетами',L:[...KH,k('05.10.25','-','5 000,00','Перевод','Между своими счетами')],E:[],own:1},
{b:'kaspi',n:'transfer to a person is kept',L:[...KH,k('05.10.25','-','5 000,00','Перевод','Иванов И.')],E:[['2025-10-05','expense',5000,'Иванов']]},
{b:'kaspi',n:'Kazakh: 4-digit year, two-word op (guess)',L:[...KZ,k('05.10.2025','-','2 500,00','Сатып алу','MAGNUM')],E:[['2025-10-05','expense',2500,'MAGNUM']],descExact:{0:'MAGNUM'}},
{b:'kaspi',n:'Kazakh own top-up from deposit (guess)',L:[...KZ,k('05.10.25','+','50 000,00','Толықтыру','Kaspi Депозиттен')],E:[],own:1},
{b:'kaspi',n:'detect: Forte name + Freedom IBAN + HSBKKZKX in details stay kaspi',L:[...KH,k('05.10.25','-','1 000,00','Перевод','На карту Forte Bank KZ12551D000000000KZT HSBKKZKX')],E:[['2025-10-05','expense',1000,'Forte Bank']]},
];
