// Statement parser tests: node tests/statements/run.cjs  (misc helpers: node tests/statements/misc.cjs)
// Fixtures are synthetic or anonymised (names, IIN, IBAN, amounts replaced). Never commit real statements.
const F=require('./load.cjs'),fs=require('fs'),path=require('path');
// cases.cjs + any cases_*.cjs next to it (one file per bank/agent to avoid merge conflicts)
const C=fs.readdirSync(__dirname).filter(f=>/^cases(_[a-z0-9]+)?.cjs$/.test(f)).flatMap(f=>require(path.join(__dirname,f)));
const P={kaspi:F.parseKaspiPdf,forte:F.parseFortePdf,halyk:F.parseHalykPdf,freedom:F.parseFreedomPdf};
let fails=0;const per={};
for(const c of C){const txt=c.L.join('\n')+'\n';const det=F.detectBank(txt);let out=[];try{out=P[c.b](txt)}catch(e){out=[];console.log('THROW',e.message)}
 const prob=[];if(det!==c.b)prob.push('detectBank='+det);
 const used=new Set();
 c.E.forEach(([d,t,a,ds],i)=>{let j=out.findIndex((o,j)=>!used.has(j)&&Math.abs(o.amount-a)<0.005&&o.date===d);
  if(j<0){j=out.findIndex((o,j)=>!used.has(j)&&o.date===d&&o.desc.toLowerCase().includes(ds.toLowerCase()));if(j>=0)prob.push(`WRONG AMOUNT ${a}->${out[j].amount}`);else{const j2=out.findIndex((o,j)=>!used.has(j)&&Math.abs(o.amount-a)<0.005);if(j2>=0){prob.push(`MIS-DATED ${d}->${out[j2].date}`);j=j2}else{prob.push(`LOST ${d} ${a} ${ds}`);return}}}
  used.add(j);const o=out[j];if(o.type!==t)prob.push(`MIS-SIGNED ${a} ${t}->${o.type}`);
  if(!o.desc.toLowerCase().includes(ds.toLowerCase()))prob.push(`DESC "${o.desc}" lacks "${ds}"`);
  if(c.descExact&&c.descExact[i]!=null&&o.desc.replace(/[.\s]+$/,'')!==c.descExact[i])prob.push(`DESC "${o.desc}" != "${c.descExact[i]}"`)});
 out.forEach((o,j)=>{if(!used.has(j))prob.push(`EXTRA ${o.date} ${o.type} ${o.amount} "${o.desc}"`)});
 per[c.b]=per[c.b]||[0,0];per[c.b][0]++;if(prob.length){per[c.b][1]++;fails++;console.log(`[${c.b}] ${c.n}: ${prob.join(' | ')}`)}}
console.log('cases',C.length,'failing',fails,JSON.stringify(per));
process.exitCode=fails?1:0;
