import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['server.mjs','dist/api.js','dist/auth.js','dist/portal.js','dist/finance.js'];
function walk(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const file=directory+'/'+entry.name;if(entry.isDirectory())walk(file);else if(file.endsWith('.mjs'))files.push(file);}}
walk('backend');walk('api');
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.error)throw result.error;if(result.status)process.exit(result.status);}
JSON.parse(readFileSync('vercel.json','utf8'));
console.log('Sintaxe validada em '+files.length+' arquivos e vercel.json.');
