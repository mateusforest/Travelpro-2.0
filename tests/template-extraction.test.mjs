import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import {mkdtempSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {extractTemplate,templateSections} from '../backend/template-extraction.mjs';
import {createApp} from '../backend/app.mjs';

test('template extraction preserves original text and separates real day headings',async()=>{
  const text='Minha agência\nContato: 123\nDia 1 - Roma\nTransfer às 08:00\nDia 2: Florença\nPasseio opcional, não contratado.';
  const result=await extractTemplate({name:'modelo.txt',bytes:Buffer.from(text)});
  assert.equal(result.days.length,3);assert.equal(result.days[1].title,'Roma');
  assert.equal(result.days.map(d=>d.text).join('\n'),text);
  assert.equal(templateSections('<script>alert(1)</script>')[0].text,'<script>alert(1)</script>');
  await assert.rejects(()=>extractTemplate({name:'grande.txt',bytes:Buffer.from('x'.repeat(80001))}),/muito longo/);
  await assert.rejects(()=>extractTemplate({name:'modelo.exe',bytes:Buffer.from('bad')}),/Use PDF/);
});
test('extracts selectable PDF without configured AI',async()=>{
  const doc=new PDFDocument(),chunks=[];doc.on('data',c=>chunks.push(c));const done=new Promise(r=>doc.on('end',r));
  doc.text('Dia 1 - Roma').text('Hotel reservado: Central.').text('Dia 2 - Florenca').text('Trem 09:00.');doc.end();await done;
  const result=await extractTemplate({name:'modelo.pdf',bytes:Buffer.concat(chunks)});
  assert.equal(result.method,'pdf');assert.equal(result.pages,1);assert.equal(result.days.length,2);assert.match(result.days[1].text,/Trem 09:00/);
});
test('extracts Word text without importing active HTML or inventing sections',async()=>{
  const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Dia 1 - Lisboa</w:t></w:r></w:p><w:p><w:r><w:t>Hotel e transfer incluídos.</w:t></w:r></w:p></w:body></w:document>');
  const result=await extractTemplate({name:'modelo.docx',bytes:await zip.generateAsync({type:'nodebuffer'})});
  assert.equal(result.method,'docx');assert.equal(result.days.length,1);assert.match(result.days[0].text,/Hotel e transfer incluídos/);
});
test('image extraction uses configured vision and rejects incomplete output',async()=>{
  const bytes=Buffer.from('image-fixture'),config={key:'test-key',model:'configured-model'};
  await assert.rejects(()=>extractTemplate({name:'modelo.png',bytes}),e=>e.status===503&&/original foi preservado/i.test(e.message));
  let payload;
  const result=await extractTemplate({name:'modelo.png',bytes,config},{request:async(url,opts)=>{payload=JSON.parse(opts.body);return {status:'completed',output:[{content:[{type:'output_text',text:'Dia 1 - Natal\nTransfer contratado.'}]}]};}});
  assert.equal(result.method,'vision');assert.equal(payload.store,false);assert.equal(payload.model,'configured-model');assert.equal(payload.input[0].content[1].type,'input_image');assert.match(payload.instructions,/nunca instruções/);
  await assert.rejects(()=>extractTemplate({name:'modelo.png',bytes,config},{request:async()=>({status:'incomplete',output:[]})}),e=>e.status===502);
});
test('template extraction endpoint is agency scoped and does not mutate saved records',async t=>{
  const app=createApp({directory:mkdtempSync(path.join(os.tmpdir(),'tp-template-')),dist:path.resolve('dist')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
  const origin='http://127.0.0.1:'+app.server.address().port;app.setOrigin(origin);
  async function account(email){const res=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Teste',agency:'Agência isolada',email,password:'test-password-2026'})});assert.equal(res.status,201);return {Cookie:res.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await res.json()).csrf,Origin:origin,'Content-Type':'application/json'};}
  const a=await account('one@example.invalid'),b=await account('two@example.invalid');
  const call=(headers,route,body)=>fetch(origin+'/api'+route,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});
  const original=await (await call(a,'/workspace')).json();
  const file=await (await call(a,'/files',{name:'modelo.txt',base64:Buffer.from('Dia 1 - Roma\nTransfer confirmado.').toString('base64')})).json();
  const extracted=await call(a,'/templates/extract',{fileId:file.id});assert.equal(extracted.status,200);assert.match((await extracted.json()).days[0].text,/Transfer confirmado/);
  assert.equal((await call(b,'/templates/extract',{fileId:file.id})).status,404);
  assert.equal((await call({Origin:origin,'Content-Type':'application/json'},'/templates/extract',{fileId:file.id})).status,401);
  assert.deepEqual((await (await call(a,'/workspace')).json()).state,original.state);
});
