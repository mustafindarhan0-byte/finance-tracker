/* fx.js — эффекты «Системы». Чистый WAAPI/rAF, без зависимостей. Анимируем только transform/opacity/filter.
   Все функции безопасно деградируют при prefers-reduced-motion. Экраны только вызывают fx*(). */
(function(){
'use strict';
const RM=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const ease=t=>1-Math.pow(1-t,3);
const raf=(fn)=>requestAnimationFrame(fn);

// Пауза бесконечных анимаций, пока вкладка скрыта
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('fx-paused',document.hidden));

// A2 — text scramble: заголовок «расшифровывается» ~300 мс
const GLYPHS='▓▒░<>/\\|=+-#%@0123456789';
window.fxScramble=function(el,text,dur){
  if(!el)return;
  const target=text!=null?String(text):(el.dataset.scrTarget||el.textContent);
  el.dataset.scrTarget=target;
  if(RM()||target.length>40){el.textContent=target;return}
  const token=(el._scr=(el._scr||0)+1),t0=performance.now(),d=dur||300;
  (function step(now){
    if(el._scr!==token)return;
    const p=Math.min(1,(now-t0)/d),fixed=Math.floor(p*target.length);
    let out='';
    for(let i=0;i<target.length;i++){
      const c=target[i];
      out+=(i<fixed||c===' ')?c:GLYPHS[(Math.random()*GLYPHS.length)|0];
    }
    el.textContent=out;
    if(p<1)raf(step);else el.textContent=target;
  })(t0);
};

// A3 — number ticker: плавный счёт к значению (600 мс). fmt(n) — форматтер, по умолчанию целое
window.fxTicker=function(el,to,fmt,dur){
  if(!el)return;
  const f=fmt||(n=>String(Math.round(n)));
  const from=el.dataset.v!=null&&el.dataset.v!==''?parseFloat(el.dataset.v):to;
  el.dataset.v=to;
  el.style.fontVariantNumeric='tabular-nums';
  if(RM()||from===to||!isFinite(from)){el.textContent=f(to);return}
  const token=(el._tk=(el._tk||0)+1),t0=performance.now(),d=dur||600;
  (function step(now){
    if(el._tk!==token)return;
    const p=Math.min(1,(now-t0)/d);
    el.textContent=f(from+(to-from)*ease(p));
    if(p<1)raf(step);else el.textContent=f(to);
  })(t0);
};
window.fxRM=RM;
})();
