/* ============================================================
   Логика страницы бронирования
   ============================================================ */
const {calcPrice, fmt} = window.MishanyaPricing;

// --- состояние ---
const state = {
  view: new Date(),         // показываемый месяц
  checkIn: null,
  checkOut: null,
  adults: 2,
  kids: 0,
  kidAges: [],
  wood:false, chan:false, dog:false, veniki:0,
  pay:"Картой онлайн",
  busy: new Set()           // 'YYYY-MM-DD' занятые даты
};
state.view.setDate(1);

// --- занятые даты ---
// На проде их отдаёт C#-бэкенд: GET /api/availability  ← парсит Циан .ics.
// Здесь — мок + попытка забрать с бэкенда, если он поднят.
function key(d){return d.toISOString().slice(0,10);}
async function loadBusy(){
  // демо-занятость, чтобы было видно как выглядит
  const demo=[];const t=new Date();t.setHours(0,0,0,0);
  [3,4,5,12,13,20,21,22].forEach(off=>{const d=new Date(t);d.setDate(d.getDate()+off);demo.push(key(d));});
  demo.forEach(k=>state.busy.add(k));
  try{
    const r=await fetch('/api/availability');
    if(r.ok){const data=await r.json();state.busy=new Set(data.busy||[]);}
  }catch(e){/* бэкенд не поднят — остаётся демо */}
  renderCal();
}

// --- календарь ---
const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const grid=document.getElementById('calGrid');
const monthLbl=document.getElementById('calMonth');

function sameDay(a,b){return a&&b&&a.toDateString()===b.toDateString();}
function inRange(d){return state.checkIn&&state.checkOut&&d>state.checkIn&&d<state.checkOut;}

function renderCal(){
  const y=state.view.getFullYear(),m=state.view.getMonth();
  monthLbl.textContent=`${MONTHS[m]} ${y}`;
  grid.innerHTML='';
  const first=new Date(y,m,1);
  let lead=(first.getDay()+6)%7; // понедельник=0
  const days=new Date(y,m+1,0).getDate();
  const today=new Date();today.setHours(0,0,0,0);

  for(let i=0;i<lead;i++){grid.insertAdjacentHTML('beforeend','<span class="cal__cell cal__cell--empty"></span>');}
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day);
    const k=key(d);
    const past=d<today;
    const busy=state.busy.has(k);
    let cls='cal__cell';
    if(past||busy) cls+=' cal__cell--off';
    if(busy) cls+=' cal__cell--busy';
    if(sameDay(d,state.checkIn)||sameDay(d,state.checkOut)) cls+=' cal__cell--sel';
    if(inRange(d)) cls+=' cal__cell--range';
    const cell=document.createElement('button');
    cell.className=cls;cell.textContent=day;
    if(!past&&!busy) cell.addEventListener('click',()=>pickDate(d));
    else cell.disabled=true;
    grid.appendChild(cell);
  }
}

function rangeHasBusy(a,b){
  let cur=new Date(a);
  while(cur<b){ if(state.busy.has(key(cur))) return true; cur.setDate(cur.getDate()+1); }
  return false;
}

function pickDate(d){
  if(!state.checkIn||(state.checkIn&&state.checkOut)){
    state.checkIn=d;state.checkOut=null;
  }else if(d<=state.checkIn){
    state.checkIn=d;state.checkOut=null;
  }else{
    if(rangeHasBusy(state.checkIn,d)){ // в диапазоне есть занятые — нельзя
      state.checkIn=d;state.checkOut=null;
    }else{
      state.checkOut=d;
    }
  }
  renderCal();renderDates();renderSummary();
}

document.getElementById('calPrev').onclick=()=>{state.view.setMonth(state.view.getMonth()-1);renderCal();};
document.getElementById('calNext').onclick=()=>{state.view.setMonth(state.view.getMonth()+1);renderCal();};

function renderDates(){
  const f=d=>d?d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'}):'—';
  document.getElementById('inLabel').textContent=f(state.checkIn);
  document.getElementById('outLabel').textContent=f(state.checkOut);
  const n=document.getElementById('nightsLabel');
  if(state.checkIn&&state.checkOut){
    const nights=Math.round((state.checkOut-state.checkIn)/864e5);
    n.textContent=`${nights} ${window.MishanyaPricing.RULES?'':''}${plural(nights,'ночь','ночи','ночей')}`;
  }else n.textContent='';
}
function plural(n,one,few,many){const m10=n%10,m100=n%100;if(m10===1&&m100!==11)return one;if(m10>=2&&m10<=4&&(m100<10||m100>=20))return few;return many;}

// --- счётчики гостей ---
function clampAdults(v){return Math.max(1,Math.min(15,v));}
function clampKids(v){return Math.max(0,Math.min(10,v));}
document.addEventListener('click',e=>{
  const act=e.target.dataset.act;if(!act)return;
  if(act==='adult+')state.adults=clampAdults(state.adults+1);
  if(act==='adult-')state.adults=clampAdults(state.adults-1);
  if(act==='kid+')state.kids=clampKids(state.kids+1);
  if(act==='kid-')state.kids=clampKids(state.kids-1);
  if(act==='venik+')state.veniki=Math.min(20,state.veniki+1);
  if(act==='venik-')state.veniki=Math.max(0,state.veniki-1);
  syncKidAges();renderCounters();renderSummary();
});
function renderCounters(){
  document.getElementById('adults').textContent=state.adults;
  document.getElementById('kids').textContent=state.kids;
  document.getElementById('veniki').textContent=state.veniki;
}

// возраст детей — чтобы определить кто старше 10
function syncKidAges(){
  while(state.kidAges.length<state.kids)state.kidAges.push(5);
  state.kidAges.length=state.kids;
  const box=document.getElementById('kidsAges');
  if(state.kids===0){box.innerHTML='';return;}
  box.innerHTML='<div class="kidsages__t">Возраст детей (до 10 лет — бесплатно):</div>'+
    state.kidAges.map((a,i)=>`<label class="kidage">Ребёнок ${i+1}
      <select data-kid="${i}">${Array.from({length:18},(_,n)=>`<option value="${n}" ${n===a?'selected':''}>${n} ${plural(n,'год','года','лет')}</option>`).join('')}</select>
    </label>`).join('');
  box.querySelectorAll('select').forEach(s=>s.addEventListener('change',ev=>{
    state.kidAges[+ev.target.dataset.kid]=+ev.target.value;renderSummary();
  }));
}

// --- доп. услуги (чекбоксы) ---
document.addEventListener('change',e=>{
  const ex=e.target.dataset.extra;if(!ex)return;
  state[ex]=e.target.checked;renderSummary();
});

// --- чипы: способ оплаты ---
document.addEventListener('click',e=>{
  const chip=e.target.closest('.chip');if(!chip)return;
  if(chip.dataset.pay!==undefined){
    chip.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');state.pay=chip.dataset.pay;
  }
});

// --- расчёт ---
function payingGuests(){
  const paidKids=state.kidAges.filter(a=>a>10).length; // 10 включительно бесплатно
  return state.adults+paidKids;
}
function currentBooking(){
  return {
    checkIn:state.checkIn,checkOut:state.checkOut,
    payingGuests:payingGuests(),
    wood:state.wood,chan:state.chan,veniki:state.veniki,dog:state.dog
  };
}
function renderSummary(){
  const rows=document.getElementById('summaryRows');
  const totalBox=document.getElementById('summaryTotal');
  const btn=document.getElementById('bookBtn');
  if(!state.checkIn||!state.checkOut){
    rows.innerHTML='<p class="summary__empty">Выберите даты, чтобы увидеть стоимость.</p>';
    totalBox.hidden=true;btn.disabled=true;return;
  }
  const r=calcPrice(currentBooking());
  rows.innerHTML=r.lines.map(l=>`<div class="summary__line"><span>${l.label}</span><b>${fmt(l.sum)}</b></div>`).join('');
  document.getElementById('totalSum').textContent=fmt(r.total);
  document.getElementById('prepaySum').textContent=fmt(r.prepay);
  totalBox.hidden=false;btn.disabled=false;
}

// --- кнопка брони ---
document.getElementById('bookBtn').addEventListener('click',openModal);
function openModal(){
  const r=calcPrice(currentBooking());
  const f=d=>d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const name=(document.getElementById('fName').value||'').trim();
  const phone=(document.getElementById('fPhone').value||'').trim();
  const purposeVal=(document.getElementById('fPurpose').value||'').trim();
  const purpose=purposeVal?`<div class="summary__line"><span>Повод</span><b>${purposeVal}</b></div>`:'';
  document.getElementById('modalBody').innerHTML=`
    <p class="modal__dates">${f(state.checkIn)} → ${f(state.checkOut)} · ${r.nightsCount} ${plural(r.nightsCount,'ночь','ночи','ночей')}</p>
    <div class="modal__rows">${r.lines.map(l=>`<div class="summary__line"><span>${l.label}</span><b>${fmt(l.sum)}</b></div>`).join('')}</div>
    ${purpose}
    <div class="summary__line"><span>Заезд / выезд</span><b>с 16:00 / до 12:00</b></div>
    <div class="summary__line"><span>Оплата</span><b>${state.pay}</b></div>
    <div class="summary__line modal__big"><span>Итого</span><b>${fmt(r.total)}</b></div>
    <div class="summary__line modal__big"><span>К оплате сейчас (10%)</span><b style="color:var(--violet)">${fmt(r.prepay)}</b></div>
    ${!name||!phone?'<p style="color:#c0392b;font-size:.9rem;margin-top:12px">Пожалуйста, заполните имя и телефон в форме (раздел 5).</p>':''}
    <button class="btn btn--primary" id="payBtn" style="width:100%;justify-content:center;margin-top:14px" ${!name||!phone?'disabled':''}>Перейти к оплате ${fmt(r.prepay)}</button>
    <p class="summary__legal" style="margin-top:14px">Оплата через защищённый сервис. Предоплата поступает хозяину, бронь закрепляется, в Telegram приходит уведомление.</p>`;
  document.getElementById('modal').hidden=false;
  const pb=document.getElementById('payBtn');
  if(pb&&!pb.disabled) pb.addEventListener('click',submitBooking);
}
document.getElementById('modalX').onclick=()=>document.getElementById('modal').hidden=true;
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')e.target.hidden=true;});

async function submitBooking(){
  const payload={
    checkIn:key(state.checkIn),checkOut:key(state.checkOut),
    adults:state.adults,kidAges:state.kidAges,
    wood:state.wood,chan:state.chan,veniki:state.veniki,dog:state.dog,
    purpose:document.getElementById('fPurpose').value,pay:state.pay,
    checkinTime:"16:00",checkoutTime:"12:00",
    name:document.getElementById('fName').value,
    phone:document.getElementById('fPhone').value,
    email:document.getElementById('fEmail').value,
    comment:document.getElementById('fComment').value
  };
  const btn=document.getElementById('payBtn');btn.textContent='Создаём оплату…';btn.disabled=true;
  try{
    const r=await fetch('/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok)throw new Error();
    const data=await r.json();
    if(data.paymentUrl){location.href=data.paymentUrl;return;} // редирект на ЮKassa
    throw new Error();
  }catch(e){
    btn.disabled=false;btn.textContent='Перейти к оплате';
    document.getElementById('modalBody').insertAdjacentHTML('beforeend',
      '<p style="color:#b54;margin-top:12px;font-size:.9rem">Платёжный сервис пока не подключён. Это сделает C#-бэкенд (см. инструкцию). Сейчас можно забронировать по телефону +7 (968) 969-95-15 или в Telegram @daitlov.</p>');
  }
}

// init
renderCounters();syncKidAges();loadBusy();renderDates();renderSummary();
