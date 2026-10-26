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
    c.fillStyle='#fff';c.font='700 190px Handjet,monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,W/2,H/2);
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

// A1 — заставка: картинка (boot.jpg) плавно проявляется из размытия, затем рассыпается на «пиксели»,
// которые разлетаются влево и вправо от центра; сквозь них проявляется приложение. Тап / клавиша — пропустить.
window.fxBoot=function(){
  return new Promise(resolve=>{
    if(RM()){resolve();return}
    const ov=mk('boot');
    ov.innerHTML='<img class="boot-img" src="boot.jpg" alt="" decoding="async"><canvas class="boot-cv" aria-hidden="true"></canvas>';
    const img=ov.querySelector('.boot-img'),cv=ov.querySelector('.boot-cv'),ctx=cv.getContext('2d');
    let done=false,raf=0;
    const finish=fast=>{
      if(done)return;done=true;cancelAnimationFrame(raf);
      ov.animate([{opacity:1},{opacity:0}],{duration:fast?220:420,easing:'ease-out',fill:'forwards'}).onfinish=()=>{ov.remove();resolve()};
    };
    const skip=()=>finish(true);
    ov.addEventListener('click',skip);addEventListener('keydown',skip,{once:true});
    setTimeout(()=>{if(!done)finish(true)},7000); // страховка: заставка не должна держать приложение
    const ready=img.decode?img.decode().catch(()=>{}):new Promise(r=>{img.onload=img.onerror=r});
    (async()=>{
      await ready;if(done)return;
      // 1) проявление: из размытия и чуть крупнее — к резкой картинке
      await img.animate([{opacity:0,filter:'blur(22px) brightness(1.4)',transform:'scale(1.06)'},{opacity:1,filter:'blur(0) brightness(1)',transform:'scale(1)'}],
        {duration:1150,easing:'cubic-bezier(.2,.9,.2,1)',fill:'forwards'}).finished.catch(()=>{});
      if(done)return;
      await sleep(380);if(done)return;
      // 2) картинка → сетка «пикселей» того же вида (серый уровень каждой клетки)
      const dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;
      cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      const r=img.getBoundingClientRect(),cell=W>=1024?4:5,cols=Math.round(r.width/cell),rows=Math.round(r.height/cell);
      const sc=document.createElement('canvas');sc.width=cols;sc.height=rows;const sx=sc.getContext('2d',{willReadFrequently:true});
      sx.imageSmoothingQuality='high';sx.drawImage(img,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const cw=r.width/cols,chh=r.height/rows,cx=r.left+r.width/2,n=cols*rows;
      const X=new Float32Array(n),Y=new Float32Array(n),D=new Float32Array(n),DL=new Float32Array(n),VY=new Float32Array(n),G=new Uint8Array(n),order=new Uint32Array(n);
      for(let i=0;i<n;i++){
        const c=i%cols,rr=(i/cols)|0;X[i]=r.left+c*cw;Y[i]=r.top+rr*chh;G[i]=px[i*4]>>3;
        const off=(X[i]+cw/2-cx)/(r.width/2);D[i]=off<0?-1:1;
        DL[i]=.12*(1-Math.abs(off))+.42*Math.random();           // центр трогается чуть раньше, края подхватывают
        VY[i]=(Math.random()-.5)*2;order[i]=i;
      }
      order.sort((a,b)=>G[a]-G[b]); // рисуем пачками одного серого — 32 смены цвета на кадр вместо тысяч
      const lvl=Array.from({length:32},(_,g)=>`rgb(${g*8+4},${g*8+4},${g*8+4})`);
      img.style.visibility='hidden';
      ov.animate([{backgroundColor:'rgba(0,0,0,1)'},{backgroundColor:'rgba(0,0,0,0)'}],{duration:1500,delay:250,easing:'ease-in-out',fill:'forwards'});
      const t0=performance.now(),dur=1.25,reach=Math.max(W,H)*.75;
      const frame=now=>{
        if(done)return;
        const t=(now-t0)/1000;let alive=0,cur=-1;
        ctx.clearRect(0,0,W,H);
        for(let k=0;k<n;k++){
          const i=order[k],p=Math.min(1,Math.max(0,(t-DL[i])/dur));
          if(p>=1)continue;alive++;
          const e=p*p*(3-2*p),ee=p*p*p,s=Math.max(.2,1-ee*.8);
          const x=X[i]+D[i]*reach*ee+Math.sin(i*.7+t*3)*6*e,y=Y[i]+VY[i]*60*ee;
          if(G[i]!==cur){cur=G[i];ctx.fillStyle=lvl[cur]}
          ctx.globalAlpha=1-ee;
          ctx.fillRect(x,y,cw*s+.4,chh*s+.4);
        }
        ctx.globalAlpha=1;
        if(alive)raf=requestAnimationFrame(frame);else finish(false);
      };
      raf=requestAnimationFrame(frame);
    })();
  });
};
// G3 — фигура из частиц. sampleParticles — чистая функция (тест tests/glow.cjs): точки по яркости картинки, детерминированно по seed
function sampleParticles(lum,w,h,n,seed,thr){
  thr=thr==null?.16:thr;
  let s=(seed>>>0)||1;
  const rnd=()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const cand=[];let total=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=lum[y*w+x];if(v>thr){const wg=Math.pow(v,1.6);cand.push(x,y,v,wg);total+=wg}}
  if(!cand.length||!(n>0))return[];
  const out=[],step=total/n;let acc=0,next=rnd()*step;
  for(let k=0;k<cand.length&&out.length<n;k+=4){
    acc+=cand[k+3];
    while(next<acc&&out.length<n){out.push({x:cand[k]+rnd()-.5,y:cand[k+1]+rnd()-.5,b:cand[k+2]});next+=step}
  }
  return out;
}
window.fxSampleParticles=sampleParticles;

const HP={wrap:null,cv:null,gl:null,ctx:null,gctx:null,img:null,buf:null,src:'',key:'',run:false,ready:false,assembleAt:0,mx:-1e5,my:-1e5,W:0,H:0,dpr:1,n:0,nf:0};
const fine=()=>!!(window.matchMedia&&matchMedia('(pointer:fine)').matches);
const wide=()=>!!(window.matchMedia&&matchMedia('(min-width:1024px)').matches);
function hpLoad(src){return new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src})}
async function hpBuild(src){
  const tok=HP.tok=(HP.tok||0)+1,W=HP.W,H=HP.H,im=await hpLoad(src);
  if(tok!==HP.tok||!W||!H)return false; // пока грузилась картинка, началась новая сборка — побеждает новая
  const NF=wide()?12000:3400,NT=wide()?2600:800,NS=wide()?120:60;
  // фигура: высота 96 % окна, по центру, низом к низу; выборка на сетке ≤ 220 px высотой
  let fig=[];
  if(im){
    const sh=Math.min(360,Math.round(H*.85)),sw=Math.max(1,Math.round(sh*im.width/im.height));
    const c=document.createElement('canvas');c.width=sw;c.height=sh;const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(im,0,0,sw,sh);const d=x.getImageData(0,0,sw,sh).data,lum=new Float32Array(sw*sh);
    const ss=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
    const def=/figure\.jpg$/.test(src);
    // своё фото на светлом фоне: человек темнее фона — берём темноту, а не яркость, чтобы точки легли на человека
    let edge=0,en=0;
    for(let i=0,p=0;i<sw*sh;i++,p+=4){const u=(i%sw)/sw,v=Math.floor(i/sw)/sh;if(u<.06||u>.94||v<.06){edge+=(.2126*d[p]+.7152*d[p+1]+.0722*d[p+2])/255;en++}}
    const invert=!def&&en>0&&edge/en>.5;
    for(let i=0,p=0;i<lum.length;i++,p+=4){
      const u=(i%sw)/sw,v=Math.floor(i/sw)/sh,l=(.2126*d[p]+.7152*d[p+1]+.0722*d[p+2])/255;
      if(def){
        // контровой свет даёт контур, а тело (по яркости как туман) заполняем редко по форме головы и корпуса
        const head=Math.hypot((u-.47)/.11,(v-.34)/.14)<1,neck=Math.abs(u-.5)<.07&&v>.42&&v<.56,torso=Math.hypot((u-.5)/.31,(v-.86)/.36)<1&&v>.54;
        const inside=head||neck||torso;
        lum[i]=Math.max(ss(.3,.72,l)*(v>.76?.55:1),inside?.3*ss(.06,.14,l):0)*(u>.12&&u<.88?1:0);
      }else{
        const ex=(u-.5)/.42,ey=(v-.55)/.52,mask=Math.max(0,1-Math.sqrt(ex*ex+ey*ey));
        lum[i]=Math.min(1,Math.max(0,((invert?1-l:l)-.1)/.75))*Math.min(1,mask*1.8);
      }
    }
    const scale=H*.96/sh,ox=W/2-sw*scale/2,oy=H-sh*scale;
    fig=sampleParticles(lum,sw,sh,NF,7).map(p=>({x:ox+p.x*scale,y:oy+p.y*scale,b:.5+.5*p.b,k:0}));
  }
  // «холмы» из частиц: 3 гребня, плотнее у гребня, медленно текут
  let s=99;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647};
  const gauss=()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return u-2};
  const ter=[];
  for(let i=0;i<NT;i++){
    const r=i%3,x=rnd()*W,ry=H*(.8+.075*r)+Math.sin(x/W*Math.PI*(1.3+r*.55)+r*1.7)*H*.05,dy=Math.abs(gauss())*H*(.025+.02*r);
    ter.push({x,y:ry+dy*(rnd()<.8?1:-1),b:.18+.55*Math.exp(-dy/(H*.03)),k:1+r});
  }
  const stars=[];for(let i=0;i<NS;i++)stars.push({x:rnd()*W,y:rnd()*H*.55,b:.15+.6*rnd(),k:9});
  const all=fig.concat(ter,stars),n=all.length;
  const A=k=>new Float32Array(n);
  HP.n=n;HP.nf=fig.length;HP.hx=A();HP.hy=A();HP.x=A();HP.y=A();HP.vx=A();HP.vy=A();HP.b=A();HP.ph=A();HP.kind=new Uint8Array(n);HP.sx=A();HP.sy=A();HP.dl=A();
  for(let i=0;i<n;i++){
    const p=all[i];HP.hx[i]=p.x;HP.hy[i]=p.y;HP.b[i]=p.b;HP.kind[i]=p.k;HP.ph[i]=rnd()*6.283;
    const a=rnd()*6.283,rr=Math.max(W,H)*(.25+rnd()*.6);HP.sx[i]=W/2+Math.cos(a)*rr;HP.sy[i]=H*.55+Math.sin(a)*rr*.6;
    HP.dl[i]=p.k===0?(1-p.y/H)*.55+rnd()*.25:rnd()*.5;
    HP.x[i]=HP.sx[i];HP.y[i]=HP.sy[i];
  }
  HP.ready=true;HP.ok=fig.length>50;
  return true;
}
function hpSize(host){
  const r=host.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),W=Math.round(r.width),H=Math.round(r.height);
  if(!W||!H)return false;
  const changed=W!==HP.W||H!==HP.H||dpr!==HP.dpr;
  HP.W=W;HP.H=H;HP.dpr=dpr;
  if(changed){
    HP.cv.width=W*dpr;HP.cv.height=H*dpr;HP.gl.width=Math.ceil(W/4);HP.gl.height=Math.ceil(H/4);
    HP.img=HP.ctx.createImageData(HP.cv.width,HP.cv.height);HP.buf=new Uint32Array(HP.img.data.buffer);
  }
  return changed;
}
function hpFrame(now){
  if(!HP.run)return;
  const vis=HP.wrap.isConnected&&HP.wrap.offsetParent!==null&&!document.hidden;
  // герой в странице, но не виден (другой экран, фон) — заглянуть позже, а не остановиться навсегда
  if(!vis){HP.run=false;if(HP.wrap.isConnected)setTimeout(()=>{if(!HP.run&&HP.wrap.isConnected&&!RM()){HP.run=true;requestAnimationFrame(hpFrame)}},500);return}
  if(HP.ready)hpDraw(now);
  requestAnimationFrame(hpFrame);
}
function hpDraw(now){
  const {W,H,dpr,n}=HP,cw=HP.cv.width,ch=HP.cv.height,buf=HP.buf,t=now*.001,since=(now-HP.assembleAt)/1000,still=RM();
  buf.fill(0);
  const mx=HP.mx,my=HP.my,R=wide()?90:60,R2=R*R;
  const add=(j,vv)=>{const c=buf[j]&255,nv=Math.min(255,c+vv);buf[j]=(255<<24)|(nv<<16)|(nv<<8)|nv};
  for(let i=0;i<n;i++){
    const k=HP.kind[i];let tx=HP.hx[i],ty=HP.hy[i],a=HP.b[i];
    if(k>=1&&k<=3){tx=((tx+t*(4+k*3))%(W+20)+W+20)%(W+20)-10;ty+=Math.sin(t*.4+tx*.01+k)*1.2}
    else if(k===9){a*=.55+.45*Math.sin(t*(1.2+HP.ph[i])+HP.ph[i]*3)}
    else{tx+=Math.sin(t*1.1+HP.ph[i])*.3;ty+=Math.cos(t*1.3+HP.ph[i])*.3}
    let x,y;
    const p=still?1:Math.min(1,Math.max(0,(since-HP.dl[i])/1.15));
    if(p<1){const e=1-Math.pow(1-p,4);x=HP.sx[i]+(tx-HP.sx[i])*e;y=HP.sy[i]+(ty-HP.sy[i])*e;HP.x[i]=x;HP.y[i]=y;HP.vx[i]=0;HP.vy[i]=0;a*=.3+.7*p}
    else if(k===0){
      x=HP.x[i];y=HP.y[i];
      const dx=x-mx,dy=y-my,d2=dx*dx+dy*dy;
      if(d2<R2&&d2>.01){const d=Math.sqrt(d2),f=(1-d/R)*2.6;HP.vx[i]+=dx/d*f;HP.vy[i]+=dy/d*f}
      HP.vx[i]=(HP.vx[i]+(tx-x)*.05)*.86;HP.vy[i]=(HP.vy[i]+(ty-y)*.05)*.86;
      x+=HP.vx[i];y+=HP.vy[i];HP.x[i]=x;HP.y[i]=y;
    }else{x=tx;y=ty}
    const px=(x*dpr)|0,py=(y*dpr)|0;
    if(px<0||py<0||px>=cw-1||py>=ch-1)continue;
    const v=Math.min(255,(a*255)|0),o=py*cw+px;
    add(o,v);
    // фигура — чёткие точки в один CSS-пиксель (на ретине 2×2), без размазывания; холмы и звёзды — с мягким краем
    if(dpr>1.4){add(o+1,v);add(o+cw,v);add(o+cw+1,v)}else if(k!==0&&a>.7){add(o+1,v>>1);add(o+cw,v>>1)}
  }
  HP.ctx.putImageData(HP.img,0,0);
  HP.gctx.clearRect(0,0,HP.gl.width,HP.gl.height);HP.gctx.drawImage(HP.cv,0,0,HP.gl.width,HP.gl.height);
}
document.addEventListener('pointermove',e=>{
  if(!HP.wrap||!HP.run||!fine())return;
  const r=HP.wrap.getBoundingClientRect();HP.mx=e.clientX-r.left;HP.my=e.clientY-r.top;
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&HP.wrap&&HP.wrap.isConnected&&!HP.run&&!RM()){HP.run=true;requestAnimationFrame(hpFrame)}});
window.addEventListener('resize',()=>{if(HP.wrap&&HP.wrap.isConnected&&HP.wrap.parentNode)window.fxHeroMount(HP.wrap.parentNode,HP.src,{})});
// Монтирует (или переносит) холст фигуры в окно героя. assemble — точки слетаются заново (открытие Статуса)
window.fxHeroMount=async function(host,src,opts){
  if(!host)return;opts=opts||{};
  if(!HP.wrap){
    HP.wrap=document.createElement('div');HP.wrap.className='hero-pts';HP.wrap.setAttribute('aria-hidden','true');
    HP.gl=document.createElement('canvas');HP.gl.className='pts-glow';HP.cv=document.createElement('canvas');HP.cv.className='pts-main';
    HP.wrap.append(HP.gl,HP.cv);HP.ctx=HP.cv.getContext('2d');HP.gctx=HP.gl.getContext('2d');
    HP.wrap.addEventListener('pointerleave',()=>{HP.mx=HP.my=-1e5});
  }
  if(HP.wrap.parentNode!==host)host.appendChild(HP.wrap);
  if(HP.ok)host.classList.add('pts-on'); // фото-запасной вариант прячется, только когда точки уже есть
  const changed=hpSize(host);
  if(!HP.W||!HP.H){ // окно героя ещё без размера (Статус скрыт / приложение в фоне) — попробовать позже
    const n=(opts.tries||0)+1;
    if(n<40)setTimeout(()=>{if(host.isConnected)window.fxHeroMount(host,src,{...opts,tries:n})},250);
    return;
  }
  const key=src+'|'+HP.W+'x'+HP.H;
  if(key!==HP.key||changed){HP.key=key;HP.src=src;HP.ready=false;HP.ok=false;if(!(await hpBuild(src)))return;opts.assemble=opts.assemble!==false}
  if(HP.wrap.parentNode)HP.wrap.parentNode.classList.toggle('pts-on',!!HP.ok);
  if(opts.assemble)HP.assembleAt=performance.now();
  if(RM()){hpDraw(performance.now()+1e6);return}
  if(!HP.run){HP.run=true;requestAnimationFrame(hpFrame)}
};

// G4 — вход экрана: блоки по очереди поднимаются, проявляются и наводятся на резкость (только при смене раздела)
const ENTER_SEL='.header,.q-tabs,.money-tabs,.body-seg,.period-tabs,.marquee,.hero,.xpbar,.bento,.st-plaques,.card,.wk-grid,.wa-strip,.task-section-title,.task-item,.q-side,.balance-card,.stat-cards,.sk-head,.kg-cap';
window.fxEnterView=function(view){
  if(!view||RM())return;
  const run=()=>{
    const vh=innerHeight;let i=0;
    view.querySelectorAll(ENTER_SEL).forEach(el=>{
      if(el.dataset.entered||i>=18)return;
      if(el.parentElement&&el.parentElement.closest('.card,.q-side,.wk-grid,.bento'))return;
      const r=el.getBoundingClientRect();if(!r.height||r.top>vh)return;
      el.dataset.entered='1';el.style.setProperty('--i',i++);el.classList.add('fx-enter');
      el.addEventListener('animationend',()=>el.classList.remove('fx-enter'),{once:true});
    });
  };
  run();
  // экраны дорисовываются после загрузки данных — анимируем и новые блоки, но не дольше 700 мс
  const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(run,24)});
  mo.observe(view,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),700);
};

// G4 — стекло отвечает на курсор: свет следует за мышью; главные кнопки чуть притягиваются; фон смещается (параллакс)
const GLASS_SEL='.card,.tile,.wk-stat,.q-side,.balance-card,.stat-card,.cmd-box,.sheet';
const MAG_SEL='.save-btn.primary,.nav-btn.nav-add,.period-tab,.settings-btn,.cmd-bank,.cmd-date';
let glassEl=null,magEl=null;
const desk=()=>!!(window.matchMedia&&matchMedia('(min-width:1024px) and (pointer:fine)').matches);
document.addEventListener('pointermove',e=>{
  if(RM()||e.pointerType!=='mouse')return;
  const g=e.target.closest&&e.target.closest(GLASS_SEL);
  if(glassEl&&glassEl!==g){glassEl.style.removeProperty('--gx');glassEl.style.removeProperty('--gy')}
  glassEl=g;
  if(g){const r=g.getBoundingClientRect();g.style.setProperty('--gx',(e.clientX-r.left)+'px');g.style.setProperty('--gy',(e.clientY-r.top)+'px')}
  if(!desk())return;
  const m=e.target.closest&&e.target.closest(MAG_SEL);
  if(magEl&&magEl!==m){magEl.style.translate='';magEl=null}
  if(m){const r=m.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/r.width,dy=(e.clientY-r.top-r.height/2)/r.height;
    m.style.translate=`${(dx*6).toFixed(1)}px ${(dy*5).toFixed(1)}px`;magEl=m}
  const bg=document.querySelector('.bg-photo');
  if(bg){bg.style.setProperty('--px',((e.clientX/innerWidth-.5)*-24).toFixed(1)+'px');bg.style.setProperty('--py',((e.clientY/innerHeight-.5)*-16).toFixed(1)+'px')}
},{passive:true});
document.addEventListener('pointerleave',()=>{if(magEl){magEl.style.translate='';magEl=null}},{passive:true});

})();
