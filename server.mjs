import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import http from 'node:http';
const root=path.dirname(fileURLToPath(import.meta.url));
if(existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
const origin=process.env.PUBLIC_ORIGIN||`http://${host}:${port}`;
if(process.env.NODE_ENV==='production'&&!origin.startsWith('https://'))throw new Error('Produção exige PUBLIC_ORIGIN HTTPS e proxy TLS.');
const configured=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].filter(key=>process.env[key]);
if(configured.length&&configured.length!==3)throw new Error('Preencha as três variáveis do Supabase ou remova as três para usar o SQLite local.');
let app;
if(configured.length===3){
  const {default:api}=await import('./backend/supabase/node-handler.mjs');
  const dist=path.join(root,'dist'),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,origin).pathname;
    if(pathname.startsWith('/api/'))return api(req,res);
    try{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
      const file=path.resolve(dist,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(dist+path.sep)||!types[path.extname(file)]||!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
      res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:await readFile(file));
    }catch{res.writeHead(404);res.end('Não encontrado.');}
  });
  app={server,close:()=>new Promise(resolve=>server.close(resolve))};
}else{
  const {createApp}=await import('./backend/app.mjs');
  app=createApp({directory:process.env.DATA_DIR||path.join(root,'data'),dist:path.join(root,'dist'),env:process.env,origin});
}
app.server.listen(port,host,()=>console.log('TravelPro: '+origin+' ('+(configured.length?'Supabase':'SQLite')+')'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
