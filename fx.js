/* fx.js — эффекты «Системы». Чистый WAAPI/rAF/canvas, без зависимостей. Анимируем только transform/opacity/filter.
   Все функции деградируют при prefers-reduced-motion. Экраны только вызывают fx*(). */
(function(){
'use strict';
const RM=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const ease=t=>1-Math.pow(1-t,3);
const raf=fn=>requestAnimationFrame(fn);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const mk=(cls,html,parent)=>{const d=document.createElement('div');if(cls)d.className=cls;if(html!=null)d.innerHTML=html;(parent||document.body).appendChild(d);return d};
window.fxRM=RM;

// Пауза бесконечных анимаций, пока вкладка скрыта
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('fx-paused',document.hidden));

// A2 — text scramble (~300 мс)
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
    for(let i=0;i<target.length;i++){const c=target[i];out+=(i<fixed||c===' ')?c:GLYPHS[(Math.random()*GLYPHS.length)|0]}
    el.textContent=out;
    if(p<1)raf(step);else el.textContent=target;
  })(t0);
};

// A3 — number ticker (600 мс)
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

// A13 — flash: белая вспышка обёртки 200 мс
window.fxFlash=function(el){
  if(!el||RM())return;
  el.classList.remove('fx-flash');void el.offsetWidth;el.classList.add('fx-flash');
  setTimeout(()=>el.classList.remove('fx-flash'),240);
};

// A5 — квест выполнен: галочка рисуется → пиксели → «+N XP»
window.fxQuestDone=function(el,xp){
  if(!el||!el.getBoundingClientRect)return Promise.resolve();
  const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  vib(12);
  el.classList.add('fx-done');
  el.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>';
  const p=el.querySelector('path');
  if(p)p.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:RM()?1:180,fill:'forwards',easing:'ease-out'});
  if(RM())return Promise.resolve();
  const n=10+((Math.random()*5)|0);
  for(let i=0;i<n;i++){
    const d=mk('fx-px');d.style.left=cx-2+'px';d.style.top=cy-2+'px';
    const a=Math.random()*Math.PI*2,dist=34+Math.random()*34;
    d.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*dist}px,${Math.sin(a)*dist}px) scale(.3)`,opacity:0}],{duration:300,delay:150,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}).onfinish=()=>d.remove();
  }
  if(xp){
    const l=mk('fx-xp','+'+xp+' XP');l.style.left=cx+'px';l.style.top=cy+'px';
    l.animate([{transform:'translate(-50%,0)',opacity:0},{transform:'translate(-50%,-14px)',opacity:1,offset:.25},{transform:'translate(-50%,-34px)',opacity:0}],{duration:600,delay:200,easing:'ease-out',fill:'both'}).onfinish=()=>l.remove();
  }
  return sleep(260);
};

// Полёт чипа в иконку вкладки (Flip-подобный)
window.fxFly=function(fromEl,toEl){
  if(!fromEl||!toEl||RM())return;
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();
  const c=mk('fx-fly',fromEl.innerHTML);c.style.left=a.left+'px';c.style.top=a.top+'px';c.style.width=a.width+'px';
  const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2);
  c.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.18)`,opacity:0}],{duration:520,easing:'cubic-bezier(.65,0,.35,1)',fill:'both'}).onfinish=()=>c.remove();
};

// A8 — draw on open
window.fxDraw=function(path,dur){
  if(!path||!path.getTotalLength)return;
  path.setAttribute('pathLength','1');path.style.strokeDasharray='1';
  if(RM()){path.style.strokeDashoffset='0';return}
  path.style.strokeDashoffset='1';
  path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:dur||1100,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
};

// A4 — spotlight и A12 — tilt: делегированные слушатели
let spotEl=null;
document.addEventListener('pointermove',e=>{
  if(RM())return;
  const s=e.target.closest&&e.target.closest('.spot');
  if(spotEl&&spotEl!==s){spotEl.classList.remove('spot-on')}
  spotEl=s;
  if(s){const r=s.getBoundingClientRect();s.style.setProperty('--sx',(e.clientX-r.left)+'px');s.style.setProperty('--sy',(e.clientY-r.top)+'px');s.classList.add('spot-on')}
  const t=e.target.closest&&e.target.closest('.tilt');
  if(t&&(e.pressure>0||e.pointerType==='mouse')){
    const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
    t.style.transition='transform 60ms linear';
    t.style.transform=`perspective(500px) rotateX(${(-py*16).toFixed(1)}deg) rotateY(${(px*16).toFixed(1)}deg)`;
  }
},{passive:true});
function untilt(e){
  document.querySelectorAll('.tilt').forEach(t=>{if(t.style.transform){t.style.transition='transform 400ms cubic-bezier(.34,1.56,.64,1)';t.style.transform=''}});
  if(spotEl){const s=spotEl;setTimeout(()=>s.classList.remove('spot-on'),0)}
}
document.addEventListener('pointerup',untilt,{passive:true});
document.addEventListener('pointercancel',untilt,{passive:true});
document.addEventListener('pointerleave',untilt,{passive:true});

// A7 — marquee: бесконечная лента 40 px/с, пауза при касании
window.fxMarquee=function(el,html){
  if(!el)return;
  el.innerHTML='<div class="mq-track"><span>'+html+'</span><span aria-hidden="true">'+html+'</span></div>';
  const tr=el.firstChild,w=tr.firstChild.getBoundingClientRect().width||300;
  tr.style.animationDuration=(w/40)+'s';
  el.onpointerdown=()=>tr.style.animationPlayState='paused';
  el.onpointerup=el.onpointerleave=()=>tr.style.animationPlayState='';
};

// A6 — level up: полноэкранный слой ~2,2 с
let lvlBusy=false;
const lvlQueue=[];
window.fxLevelUp=function(info,lv){
  lvlQueue.push({info,lv});
  if(!lvlBusy)runLevel();
};
async function runLevel(){
  const job=lvlQueue.shift();if(!job){lvlBusy=false;return}
  lvlBusy=true;
  const {info,lv}=job,to=info.to,from=info.from;
  const title=info.kind==='all'?'Уровень '+to:(window.SPHERES?SPHERES[info.kind]:info.kind)+': уровень '+to;
  let sub='';
  if(info.kind==='all'&&window.nextRankAt){const nx=nextRankAt(to);if(nx){const nm=nx>=50?'Lead':nx>=30?'Tier 3':nx>=15?'Tier 2':'Tier 1';sub='До '+nm+' — '+(nx-to)+' ур.'}}
  vib([20,40,20]);
  const ov=mk('lvl'),rays=mk('lvl-rays','',ov),num=mk('lvl-num disp',String(from),ov),t=mk('lvl-title',title,ov),s=mk('lvl-sub',sub,ov);
  t.style.opacity=s.style.opacity=0;
  ov.animate([{opacity:0},{opacity:1}],{duration:200,fill:'forwards'});
  const close=()=>{if(ov._closed)return;ov._closed=true;ov.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}).onfinish=()=>{ov.remove();runLevel()}};
  ov.addEventListener('click',close);
  if(RM()){num.textContent=String(to);t.style.opacity=s.style.opacity=1;setTimeout(close,2200);return}
  await sleep(260);
  // глитч старой цифры: 3 кадра сдвига каналов
  const frames=['-5px 0 #ff2a4d,5px 0 #00e5ff','4px -2px #ff2a4d,-4px 2px #00e5ff','-7px 1px #ff2a4d,7px -1px #00e5ff'];
  for(const f of frames){num.style.textShadow=f;await sleep(70)}
  num.style.textShadow='none';
  // рассыпание → сборка новой цифры из пикселей (canvas)
  const cv=mk('lvl-cv','',ov),W=cv.width=Math.min(window.innerWidth,420),H=cv.height=260,ctx=cv.getContext('2d');
  function sample(txt){
    const o=document.createElement('canvas');o.width=W;o.height=H;const c=o.getContext('2d');
    c.fillStyle='#fff';c.font='700 190px Tektur,Unbounded,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,W/2,H/2);
    const d=c.getImageData(0,0,W,H).data,pts=[];
    for(let y=0;y<H;y+=5)for(let x=0;x<W;x+=5)if(d[(y*W+x)*4+3]>128)pts.push([x,y]);
    return pts;
  }
  const A=sample(String(from)),B=sample(String(to));
  const n=Math.max(A.length,B.length),P=[];
  for(let i=0;i<n;i++){const a=A[i%A.length],b=B[i%B.length];const ang=Math.random()*Math.PI*2,r=60+Math.random()*180;P.push({ax:a[0],ay:a[1],bx:b[0],by:b[1],sx:W/2+Math.cos(ang)*r,sy:H/2+Math.sin(ang)*r})}
  num.style.opacity=0;
  const t0=performance.now(),T=1100;
  await new Promise(res=>{
    (function f(now){
      const p=Math.min(1,(now-t0)/T);ctx.clearRect(0,0,W,H);ctx.fillStyle='#F2F2EF';
      for(const q of P){
        let x,y;
        if(p<.4){const k=ease(p/.4);x=q.ax+(q.sx-q.ax)*k;y=q.ay+(q.sy-q.ay)*k}
        else{const k=ease((p-.4)/.6);x=q.sx+(q.bx-q.sx)*k;y=q.sy+(q.by-q.sy)*k}
        ctx.fillRect(x,y,4,4);
      }
      if(p<1)raf(f);else res();
    })(t0);
  });
  cv.remove();num.textContent=String(to);num.style.opacity=1;
  rays.animate([{opacity:0,transform:'translate(-50%,-50%) rotate(0deg) scale(.6)'},{opacity:1,transform:'translate(-50%,-50%) rotate(90deg) scale(1)'}],{duration:700,fill:'forwards',easing:'ease-out'});
  t.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:260,fill:'forwards'});
  s.animate([{opacity:0},{opacity:1}],{duration:260,delay:120,fill:'forwards'});
  await sleep(1000);close();
}

// Достижение: короткая плашка
window.fxAchievement=function(a){
  if(RM())return;
  const b=mk('fx-ach','<span class="fx-ach-k">Достижение</span>'+String(a.name).replace(/[<>&]/g,''));
  b.animate([{transform:'translate(-50%,-20px)',opacity:0},{transform:'translate(-50%,0)',opacity:1,offset:.15},{transform:'translate(-50%,0)',opacity:1,offset:.85},{transform:'translate(-50%,-10px)',opacity:0}],{duration:2600,fill:'both'}).onfinish=()=>b.remove();
};

// A1 — экран загрузки «световое кольцо» (~3 с), тап пропускает. При каждом открытии приложения.
window.fxBoot=function(){
  return new Promise(resolve=>{
    if(RM()){resolve();return}
    const ov=mk('boot');
    ov.innerHTML='<div class="boot-stage"><div class="boot-ring"></div><svg class="boot-arcs" viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" fill="none" stroke="#E6EEFF" stroke-width="3" stroke-linecap="round" stroke-dasharray="48 28"/><circle cx="100" cy="100" r="70" fill="none" stroke="#9EBBFF" stroke-width="2" stroke-linecap="round" stroke-dasharray="26 40"/></svg><div class="boot-core"></div><div class="boot-drop"></div></div><div class="boot-word disp">СИСТЕМА</div>';
    const ring=ov.querySelector('.boot-ring'),arcs=ov.querySelector('.boot-arcs'),core=ov.querySelector('.boot-core'),drop=ov.querySelector('.boot-drop'),word=ov.querySelector('.boot-word');
    let done=false;
    const finish=()=>{if(done)return;done=true;ov.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'}).onfinish=()=>{ov.remove();resolve()}};
    ov.addEventListener('click',finish);
    setTimeout(()=>{if(!ov.isConnected)return;done=true;ov.remove();resolve()},6000); // страховка: оверлей не должен блокировать приложение
    ring.style.transform='rotateX(88deg)';arcs.style.opacity=0;word.style.opacity=0;drop.style.opacity=0;
    (async()=>{
      await ring.animate([{transform:'rotateX(88deg)'},{transform:'rotateX(0deg)'}],{duration:900,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'}).finished.catch(()=>{});
      if(done)return;
      await drop.animate([{transform:'translateY(0) scale(.6)',opacity:1},{transform:'translateY(70px) scale(1)',opacity:0}],{duration:600,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
      if(done)return;
      ring.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});
      arcs.animate([{opacity:0,transform:'rotate(0deg)'},{opacity:1,transform:'rotate(180deg)'}],{duration:700,fill:'forwards',easing:'ease-out'});
      await sleep(700);if(done)return;
      word.style.opacity=1;fxScramble(word,'СИСТЕМА',420);
      await sleep(700);if(done)return;
      const g=ov.querySelector('.boot-stage');
      g.animate([{transform:'scale(1)',opacity:1},{transform:'scale(2.4)',opacity:0}],{duration:500,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
      word.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});
      await sleep(420);finish();
    })();
  });
};
})();
