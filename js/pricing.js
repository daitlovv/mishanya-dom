/* ============================================================
   Расчёт стоимости брони — гостевой дом «Мишаня»
   ВАЖНО: эта же формула продублирована на бэкенде (C#),
   чтобы гость не мог подменить сумму. Менять — синхронно.
   ============================================================ */
(function(){
const TARIFF = {            // цена за СУТКИ по дню недели (0=Пн … 6=Вс)
  mon:18000, tue:18000, wed:18000, thu:18000,
  fri:20000, sat:25000, sun:20000
};
const RULES = {
  baseGuests: 6,            // включено в тариф
  extraGuestPerNight: 1000, // доплата за каждого гостя свыше базы за каждые сутки
  kidFreeUnder: 10,         // дети до 10 включительно бесплатно
  wood: 2000,               // дрова — за сутки
  chan: 1500,               // набор в чан — разово
  venik: 500,               // веник — разово за штуку
  dog: 1000,                // собака — разово
  deposit: 10000,           // возвратный депозит (не в предоплате)
  prepayRate: 0.10
};

/* день недели -> цена тарифа за эту ночь */
function nightPrice(date){
  const d = date.getDay(); // 0=Вс,1=Пн...6=Сб
  if(d===0) return TARIFF.sun;
  if(d===6) return TARIFF.sat;
  if(d===5) return TARIFF.fri;
  return TARIFF.mon; // Пн-Чт
}

/* перечисление ночей между checkIn (вкл) и checkOut (искл) */
function listNights(checkIn, checkOut){
  const nights=[];
  let cur=new Date(checkIn);
  while(cur < checkOut){
    nights.push(new Date(cur));
    cur.setDate(cur.getDate()+1);
  }
  return nights;
}

/*
  booking = {
    checkIn:Date, checkOut:Date,
    payingGuests:int,   // взрослые + дети 10+
    wood:bool, chan:bool, veniki:int, dog:bool
  }
*/
function calcPrice(b){
  const nights = listNights(b.checkIn, b.checkOut);
  const nightsCount = nights.length;

  const lines=[];
  let tariff=0;
  nights.forEach(n=>{ tariff += nightPrice(n); });
  lines.push({label:`Проживание · ${nightsCount} ${plural(nightsCount,'ночь','ночи','ночей')}`, sum:tariff});

  // доплата за гостей свыше базы — за каждые сутки
  const extra = Math.max(0, b.payingGuests - RULES.baseGuests);
  let extraSum=0;
  if(extra>0){
    extraSum = extra * RULES.extraGuestPerNight * nightsCount;
    lines.push({label:`Доп. гости: ${extra} × 1000 ₽ × ${nightsCount} сут.`, sum:extraSum});
  }

  let woodSum=0;
  if(b.wood){ woodSum=RULES.wood*nightsCount; lines.push({label:`Дрова · ${nightsCount} сут.`, sum:woodSum}); }

  let chanSum=0;
  if(b.chan){ chanSum=RULES.chan; lines.push({label:'Набор в чан', sum:chanSum}); }

  let venikSum=0;
  if(b.veniki>0){ venikSum=RULES.venik*b.veniki; lines.push({label:`Веники · ${b.veniki} шт.`, sum:venikSum}); }

  let dogSum=0;
  if(b.dog){ dogSum=RULES.dog; lines.push({label:'Собака', sum:dogSum}); }

  const total = tariff+extraSum+woodSum+chanSum+venikSum+dogSum;
  const prepay = Math.round(total*RULES.prepayRate);

  return {nightsCount, lines, total, prepay, deposit:RULES.deposit};
}

function plural(n,one,few,many){
  const m10=n%10, m100=n%100;
  if(m10===1&&m100!==11) return one;
  if(m10>=2&&m10<=4&&(m100<10||m100>=20)) return few;
  return many;
}
function fmt(n){ return n.toLocaleString('ru-RU')+' ₽'; }

// доступно в браузере
window.MishanyaPricing = {calcPrice, fmt, RULES, listNights, nightPrice};
})();
