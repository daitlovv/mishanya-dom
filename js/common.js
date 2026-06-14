/* ===== Общие компоненты: шапка и футер ===== */
const NAV_LINKS = [
  ["index.html","Главная"],
  ["photos.html","Фотографии"],
  ["amenities.html","Удобства"],
  ["prices.html","Цены"],
  ["rules.html","Правила"],
  ["guests.html","Отзывы"],
  ["booking.html","Бронирование"],
  ["contacts.html","Контакты"],
];

function buildNav(active){
  const links = NAV_LINKS.filter(([h])=>h!=="booking.html")
    .map(([h,t])=>`<a href="${h}" class="${h===active?'active':''}">${t}</a>`).join("");
  return `
  <nav class="nav">
    <div class="wrap nav__inner">
      <a href="index.html" class="brand">
        <span class="brand__mark">М</span>
        <span>Мишаня<small>гостевой дом</small></span>
      </a>
      <div class="nav__links" id="navLinks">
        ${links}
        <a href="booking.html" class="btn btn--primary nav__cta">Забронировать</a>
      </div>
      <button class="burger" id="burger" aria-label="Меню"><span></span><span></span><span></span></button>
    </div>
  </nav>`;
}

function buildFooter(){
  return `
  <footer class="footer">
    <div class="wrap footer__grid">
      <div>
        <h4>Гостевой дом «Мишаня»</h4>
        <p style="color:#a99ed1;max-width:40ch">Двухэтажный дом 180 м² в Ногинске, Подмосковье. Банный чан «Добрыня Никитич», баня-бочка, бассейн, зона очага. Для отдыха компанией и семейных праздников.</p>
      </div>
      <div>
        <h4>Навигация</h4>
        ${NAV_LINKS.map(([h,t])=>`<div style="margin:8px 0"><a href="${h}">${t}</a></div>`).join("")}
      </div>
      <div>
        <h4>Связаться</h4>
        <div style="margin:8px 0"><a href="tel:+79689699515">+7 (968) 969-95-15</a></div>
        <div style="margin:8px 0"><a href="https://t.me/daitlov" target="_blank" rel="noopener">Telegram @daitlov</a></div>
        <div style="margin:18px 0 0"><a class="btn btn--ghost" style="color:#fff" href="booking.html">Проверить даты</a></div>
      </div>
    </div>
    <div class="wrap footer__bottom">
      <span>© ${new Date().getFullYear()} Гостевой дом «Мишаня». Все права защищены.</span>
      <span>Заезд с 16:00 · выезд до 12:00 · возраст гостей от 25 лет</span>
    </div>
  </footer>`;
}

function mountChrome(active){
  const h=document.getElementById("site-header");
  const f=document.getElementById("site-footer");
  if(h) h.innerHTML=buildNav(active);
  if(f) f.innerHTML=buildFooter();
  const burger=document.getElementById("burger");
  const links=document.getElementById("navLinks");
  if(burger) burger.addEventListener("click",()=>links.classList.toggle("open"));
}

/* ===== Скролл-появление (fade/scale + задержки) ===== */
function initReveal(){
  const els=document.querySelectorAll(".reveal,.reveal-scale");
  if(!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion:reduce)").matches){
    els.forEach(e=>e.classList.add("in"));return;
  }
  const io=new IntersectionObserver((ents)=>{
    ents.forEach(en=>{if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target);}});
  },{threshold:.15,rootMargin:"0px 0px -8% 0px"});
  els.forEach(e=>io.observe(e));
}

document.addEventListener("DOMContentLoaded",()=>{
  mountChrome(document.body.dataset.page||"");
  initReveal();
});
