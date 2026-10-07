import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['dist/pdf-template-core.mjs','dist/pdf-template-ui.mjs','server.mjs','dist/api.js','dist/itinerary-models.js','dist/portal-fields.js','dist/auth.js','dist/portal.js','dist/reports.js','dist/portal-workflow.js','dist/finance.js','dist/operations.js','dist/intake.js','dist/connections.js','dist/sales-flow.js','dist/sales-flow-ui.js','dist/proposal-brand.js','dist/proposal-ui.js'];
function walk(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const file=directory+'/'+entry.name;if(entry.isDirectory())walk(file);else if(file.endsWith('.mjs'))files.push(file);}}
files.push('dist/proposta-imersiva.js','dist/portal-chrome.js');
walk('backend');walk('api');
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.error)throw result.error;if(result.status)process.exit(result.status);}
JSON.parse(readFileSync('vercel.json','utf8'));
console.log('Sintaxe validada em '+files.length+' arquivos e vercel.json.');
