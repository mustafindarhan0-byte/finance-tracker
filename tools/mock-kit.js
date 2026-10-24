// Mockup kit: a static page that looks exactly like the app because it uses the app's own CSS.
// In a mockup (served by the dev server, e.g. /assets_src/mockups/x.html):
//   <body data-nav="status|quests|body|money" data-scroll="0"> <div class="view active"><div class="container">…real classes…</div></div>
//   <script src="/tools/mock-kit.js"></script>
// The kit copies index.html's inline <style>, links theme.css, adds the grid/vignette layers and the real bottom nav.
(async function(){
  const html=await (await fetch('/index.html',{cache:'no-store'})).text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('head style').forEach(s=>document.head.appendChild(s.cloneNode(true)));
  const link=document.createElement('link');link.rel='stylesheet';link.href='/theme.css?mock='+Date.now();
  document.head.appendChild(link);
  await new Promise(r=>{link.onload=r;link.onerror=r});
  document.body.insertAdjacentHTML('afterbegin','<div class="fx-grid" aria-hidden="true"></div><div class="fx-vignette" aria-hidden="true"></div>');
  const nav=doc.getElementById('bottom-nav'),want=document.body.dataset.nav;
  if(nav&&want){
    nav.hidden=false;nav.querySelectorAll('[onclick]').forEach(b=>b.removeAttribute('onclick'));
    nav.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===want));
    document.body.appendChild(document.importNode(nav,true));
  }
  await document.fonts.ready;await new Promise(r=>setTimeout(r,300));
  const btn=document.querySelector('.nav-btn.active'),bar=document.querySelector('.bottom-nav');
  if(btn&&bar)bar.style.setProperty('--lx',(btn.offsetLeft+btn.offsetWidth/2-28)+'px');
  if(document.body.dataset.scroll)scrollTo(0,+document.body.dataset.scroll);
  document.documentElement.dataset.mockReady='1';
})();
