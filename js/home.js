/* Лёгкий параллакс орбов в hero (средняя интенсивность) */
(function(){
  if(matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const orbs=document.querySelectorAll("[data-parallax]");
  let ticking=false;
  function update(){
    const y=window.scrollY;
    orbs.forEach(o=>{
      const k=parseFloat(o.dataset.parallax)||.1;
      o.style.transform=`translateY(${y*k}px)`;
    });
    ticking=false;
  }
  window.addEventListener("scroll",()=>{
    if(!ticking){requestAnimationFrame(update);ticking=true;}
  },{passive:true});
})();

/* Смена фото в hero */
(function(){
  const photos=document.querySelectorAll(".hero__photo");
  if(photos.length<2) return;
  let i=0;
  setInterval(()=>{
    photos[i].classList.remove("is-active");
    i=(i+1)%photos.length;
    photos[i].classList.add("is-active");
  },5000);
})();

/* Горизонтальный скролл ленты образов:
   когда секция в фокусе, вертикальная прокрутка листает фото вбок,
   затем разблокирует обычный скролл вниз. */
(function(){
  const moods=document.querySelector(".moods");
  const track=document.getElementById("moodTrack");
  if(!moods||!track) return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  if(matchMedia("(max-width:760px)").matches) return; // на мобильном — обычный свайп

  let locked=false;
  function maxScroll(){return track.scrollWidth-track.clientWidth;}

  window.addEventListener("wheel",(e)=>{
    const rect=moods.getBoundingClientRect();
    // секция занимает экран по центру
    const centered = rect.top<=1 && rect.bottom>=window.innerHeight-1;
    if(!centered) return;
    const atStart=track.scrollLeft<=0;
    const atEnd=track.scrollLeft>=maxScroll()-1;
    // листаем вбок, пока не дошли до края в направлении прокрутки
    if((e.deltaY>0 && !atEnd) || (e.deltaY<0 && !atStart)){
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    }
  },{passive:false});
})();
