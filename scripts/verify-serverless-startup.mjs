import {spawnSync} from 'node:child_process';

// Match Vercel's default: CommonJS dependencies cannot require ES modules.
const result=spawnSync(process.execPath,[
  '--no-experimental-require-module','--input-type=module','-e',
  "const api=await import('./api/index.mjs');if(typeof api.default!=='function')throw new Error('Missing API handler');"
],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:20000});
if(result.error||result.status!==0){
  console.error('A API não inicializa com a configuração padrão da Vercel.');
  console.error(result.error?.message||result.stderr);
  process.exit(1);
}
console.log('API inicializada com a configuração padrão da Vercel.');
