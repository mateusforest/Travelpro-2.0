import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {getDocument,OPS} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {inspectPage,renderPage,textPlan,validateLayout,adaptDays} from '../dist/pdf-template-core.mjs';
import {visualItinerary} from '../backend/visual-itinerary.mjs';

test('original artwork and unrelated text remain pixel identical when a field is replaced',async()=>{
  const pdf=new PDFDocument({size:[400,500],margin:30}),chunks=[];pdf.on('data',c=>chunks.push(c));const done=new Promise(r=>pdf.on('end',r));
  pdf.rect(0,0,400,500).fill('#eeeeee').roundedRect(20,20,360,100,15).fill('#eb3154');
  pdf.fillColor('white').fontSize(20).text('Roteiro original',40,40);pdf.fillColor('#222222').fontSize(14).text('Destino: Paris',40,160);pdf.text('Dia 01',40,200);pdf.text('Marca fixa da agencia',40,430);pdf.end();await done;
  const doc=await getDocument({data:new Uint8Array(Buffer.concat(chunks)),disableFontFace:false,fontExtraProperties:true}).promise;
  try{const page=await doc.getPage(1),a=createCanvas(1,1),b=createCanvas(1,1);
    const inspected=await inspectPage(page,a,OPS,{registerFont:(data,name)=>GlobalFonts.register(data,name)}),layout={version:1,pages:[inspected.page]};validateLayout(layout);
    const field=inspected.page.fields.find(f=>f.text.includes('Destino'));assert.ok(field);assert.ok(field.ops.length);
    await renderPage(page,a,inspected.page,{},inspected.fonts,{scale:1});
    await renderPage(page,b,inspected.page,{[field.id]:'Paris'},inspected.fonts,{scale:1});
    const original=a.getContext('2d').getImageData(0,0,400,500).data,edited=b.getContext('2d').getImageData(0,0,400,500).data;let changed=0,outside=0;
    for(let y=0;y<500;y++)for(let x=0;x<400;x++){const i=(y*400+x)*4;if(original[i]!==edited[i]||original[i+1]!==edited[i+1]||original[i+2]!==edited[i+2]){changed++;if(x<field.rect.x-3||x>field.rect.x+field.rect.width+3||y<field.rect.y-4||y>field.rect.y+field.rect.height+4)outside++;}}
    assert.ok(changed>50);assert.equal(outside,0,'fixed artwork must not move');
    assert.throws(()=>textPlan(b.getContext('2d'),field,'Paris '.repeat(100),inspected.fonts),/ultrapassa/);
    assert.throws(()=>validateLayout({version:1,pages:[{...inspected.page,width:1}]}),/inválida/);
  }finally{await doc.destroy();}
});

test('day adaptation preserves covers, continuation pages and source coordinates',()=>{
  const page=(number,day)=>({number,day,width:400,height:500,fields:[{id:`p${number}-f0`,page:number,text:'Dia '+day,ops:[12],rect:{x:10,y:20,width:50,height:20},baseline:35,size:15,lineHeight:20,lines:1,editable:true,day}]});
  const original={version:1,pages:[page(1,0),page(2,1),page(3,1),page(4,2),page(5,3),page(6,0)]};
  const result=adaptDays(original,5);validateLayout(result);assert.equal(new Set(result.pages.filter(p=>p.day).map(p=>p.day)).size,5);assert.equal(result.pages[0].sourceNumber,1);assert.equal(result.pages.at(-1).sourceNumber,6);assert.equal(result.pages.filter(p=>p.day===1).length,2);assert.equal(original.pages.length,6);assert.deepEqual(result.pages[1].fields[0].rect,original.pages[1].fields[0].rect);
});

test('AI returns only known fields, uses configured model and cannot inject layout',async()=>{
  const input={mode:'fill',brief:'Nova viagem: Ana, Lisboa. Demais dados a confirmar.',fields:[{id:'p1-f0',text:'Familia exemplo',lines:1,day:0}]};let payload;
  const request=async(_url,options)=>{payload=JSON.parse(options.body);return {status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({fields:[{id:'p1-f0',value:'Ana'}]})}]}]};};
  assert.deepEqual(await visualItinerary({key:'fixture',model:'configured'},input,{request}),{fields:[{id:'p1-f0',value:'Ana'}]});
  assert.equal(payload.store,false);assert.equal(payload.model,'configured');assert.equal(payload.text.format.strict,true);assert.match(payload.instructions,/não reutilize nomes/);
  await assert.rejects(()=>visualItinerary({},input),e=>e.status===503);
  const wrong=async()=>({status:'completed',output:[{content:[{type:'output_text',text:'{"fields":[{"id":"p1-f99","value":"bad"}]}'}]}]});
  await assert.rejects(()=>visualItinerary({key:'fixture',model:'configured'},input,{request:wrong}),e=>e.status===502);
  await assert.rejects(()=>visualItinerary({key:'fixture',model:'configured'},{...input,fields:[...input.fields,...input.fields]},{request}),e=>e.status===422);
});
