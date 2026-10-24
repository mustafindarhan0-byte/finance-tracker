// SPEC_glow: quest glow curve, particle sampling, fonts / assets, motion rules. node tests/glow.cjs
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8').replace(/\r\n/g,'\n');
const src=rd('index.html'),fx=rd('fx.js'),css=rd('theme.css'),sw=rd('sw.js');
const fnSrc=(text,name)=>{const i=text.indexOf('function '+name+'(');if(i<0)throw new Error('fn '+name);let d=0,j=text.indexOf('{',i);for(;j<text.length;j++){if(text[j]==='{')d++;else if(text[j]==='}'&&--d===0)break}return text.slice(i,j+1)};
let pass=0,fail=0;
const ok=(c,n,x)=>{if(c)pass++;else{fail++;console.log('FAIL',n,x!==undefined?JSON.stringify(x).slice(0,300):'')}};
const ctx={};vm.createContext(ctx);
vm.runInContext(fnSrc(src,'questGlow')+';'+fnSrc(src,'questGlowCss')+';'+fnSrc(fx,'sampleParticles')+';this.Q=questGlow;this.C=questGlowCss;this.S=sampleParticles',ctx);

// G2 — glow curve (reference: Shadow 1 / 2 / 3)
const g=p=>JSON.stringify(ctx.Q(p));
ok(g(0)==='{"blur":0,"spread":0}','0 % — no glow',g(0));
ok(g(1/3)==='{"blur":8,"spread":0}','⅓ — Shadow 1 (blur 8, spread 0)',g(1/3));
ok(g(2/3)==='{"blur":32,"spread":8}','⅔ — Shadow 2 (blur 32, spread 8)',g(2/3));
ok(g(1)==='{"blur":128,"spread":32}','100 % — Shadow 3 (blur 128, spread 32)',g(1));
ok(g(.5)==='{"blur":20,"spread":4}','linear between the points (½ → blur 20, spread 4)',g(.5));
ok(g(-1)===g(0)&&g(7)===g(1)&&g('x')===g(0),'clamped outside [0,1] and on garbage');
let mono=true,prev=-1;for(let p=0;p<=1.0001;p+=.01){const b=ctx.Q(p).blur;if(b<prev)mono=false;prev=b}
ok(mono,'glow never decreases as more is done');
ok(/scaleX\(1\.000\)/.test(ctx.C(1))&&/128px 32px/.test(ctx.C(1))&&/scaleX\(0\.000\)/.test(ctx.C(0)),'css: fill width + shadow from the curve');

// G3 — particle sampling
const w=40,h=40,lum=new Float32Array(w*h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)lum[y*w+x]=x<20?.9:(x<30?.3:.05);
const a=ctx.S(lum,w,h,800,7),b=ctx.S(lum,w,h,800,7),c=ctx.S(lum,w,h,800,8);
ok(a.length>0&&a.length<=800,'returns at most n points',a.length);
ok(a.every(p=>lum[Math.min(h-1,Math.max(0,Math.round(p.y)))*w+Math.min(w-1,Math.max(0,Math.round(p.x)))]>.16||p.x>29.4),'points only where brightness is above the threshold');
ok(!a.some(p=>p.x>30.5),'nothing in the dark part');
ok(JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(a)!==JSON.stringify(c),'deterministic for one seed, different for another');
const bright=a.filter(p=>p.x<19.5).length,mid=a.filter(p=>p.x>20.5&&p.x<29.5).length;
ok(bright>mid*2.5,'denser where the image is brighter',{bright,mid});
ok(ctx.S(new Float32Array(16),4,4,100,1).length===0&&ctx.S(lum,w,h,0,1).length===0,'empty image or n=0 → no points');

// G1 — fonts and assets
for(const [fam,file] of [['Handjet','handjet'],['Geist','geist'],['Geist Mono','geistmono']]){
  ok(new RegExp(`font-family:'${fam}';[^}]*fonts/${file}-cyrillic\\.woff2`).test(css)&&new RegExp(`font-family:'${fam}';[^}]*fonts/${file}-latin\\.woff2`).test(css),fam+': cyrillic + latin @font-face');
  ok(sw.includes(`./fonts/${file}-cyrillic.woff2`)&&sw.includes(`./fonts/${file}-latin.woff2`)&&fs.existsSync(path.join(ROOT,'fonts',file+'-cyrillic.woff2')),fam+': files exist and are cached by the SW');
}
ok(/--font-display:'Handjet'/.test(css)&&/--font-text:'Geist'/.test(css)&&/--font-mono:'Geist Mono'/.test(css),'font tokens');
ok(!/Tektur|Golos/.test(css+sw+fx),'old fonts are gone');
ok(!fs.existsSync(path.join(ROOT,'bg.jpg'))||sw.includes("'./bg.jpg'"),'bg.jpg, when present, is cached by the SW');

// G4 — motion rules of the glow section touch only transform / opacity / filter / box-shadow; reduced motion is handled
const glow=css.slice(css.indexOf('/* ── Glow: частицы, стекло, свет (SPEC_glow) ── */'));
const kf=[...glow.matchAll(/@keyframes\s+[\w-]+\{([\s\S]*?\})\s*\}/g)].map(m=>m[1]);
const props=new Set(kf.flatMap(k=>[...k.matchAll(/([a-z-]+)\s*:/g)].map(m=>m[1])));
ok(kf.length>=4&&[...props].every(p=>['transform','opacity','filter','box-shadow'].includes(p)),'keyframes animate only transform/opacity/filter/box-shadow',[...props]);
ok(/prefers-reduced-motion:reduce\)\{\.fx-enter/.test(glow)&&/prefers-reduced-motion:reduce\)\{\.bg-lights i/.test(glow),'reduced motion switches the new motion off');
ok(/function fxEnterView|window\.fxEnterView=function/.test(fx)&&/if\(!view\|\|RM\(\)\)return/.test(fx),'entrance choreography skips reduced motion');
ok(/hpFrame[\s\S]*offsetParent!==null&&!document\.hidden/.test(fx),'particles stop when the hero is not visible or the tab is hidden');

console.log(`glow: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
