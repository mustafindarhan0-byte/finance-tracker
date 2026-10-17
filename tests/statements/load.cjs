// Loads the app's real parser functions out of index.html (read-only) into a sandbox.
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('slice '+a);return src.slice(i,j)}
const code=[
  slice('function parseAmt(','\n'),
  slice('function detectBank(','function missRow('),
  slice('function extractBalanceKaspiForte(','function renderBalanceBanner('),
  slice('function stmtKey(','async function showPdfResults('),
  slice('function parseStmtAmount(','async function analyzeStatement('),
].join('\n');
const ctx={console};vm.createContext(ctx);
vm.runInContext(code+'\n;this.F={parseAmt,detectBank,parseKaspiPdf,parseFortePdf,parseHalykPdf,parseFreedomPdf,extractStatementBalance,stmtKey,buildTxIndex,takeMatch,parseStmtAmount,parseStmtDate};',ctx);
module.exports=ctx.F;
