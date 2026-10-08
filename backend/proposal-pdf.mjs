import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import '../dist/proposal-brand.js';
import '../dist/sales-flow.js';
const B=globalThis.TravelProposalBrand,F=globalThis.TravelSalesFlow;
const asset=name=>fileURLToPath(new URL('../dist/assets/'+name,import.meta.url));
export const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const date=v=>!v?'Não informada; confirmar com a operadora':/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (Brasília)';
export function proposalTotal(b){return b.items.reduce((n,i)=>n+Math.round(i.qty*i.unit*100),0)/100-b.discount;}
export async function proposalPDF(state,b){
 const brand=B.normalize(b.brand||state.proposalBrand),client=state.clients.find(c=>c.id===b.client),details=b.details?F.normalizeDetails(b.details):{services:[],paymentTerms:[]};
 const paper=b.appearance==='warm'?'#f2efe9':'#eef1f3',ink='#233b36',muted='#536861',accent=B.theme(brand).from,theme=B.theme(brand);
 const doc=new PDFDocument({size:'A4',margin:46,bufferPages:true,info:{Title:b.name,Author:state.agency,Subject:'Proposta de viagem'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',v=>chunks.push(v));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 let y=46;const left=46,width=503,bottom=731;
 function paint(){doc.rect(0,0,596,842).fill(paper);}paint();
 function soft(x,y,w,h,inset=false){
  doc.save();for(let n=5;n>0;n--){doc.opacity(.025).roundedRect(x+n*1.6,y+n*1.8,w,h,18).fill('#657a8d');doc.opacity(.15).roundedRect(x-n*.8,y-n*.9,w,h,18).fill('#ffffff');}doc.opacity(1).roundedRect(x,y,w,h,18).fill(paper);if(inset){doc.opacity(.12).roundedRect(x+1,y+1,w-2,h-2,17).lineWidth(1).strokeColor('#718695').stroke();}doc.restore();
 }
 function write(text,x,yy,w,size=11,bold=false,color=ink){doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(color);doc.text(String(text||'').replaceAll('→',' para ').replaceAll('↔',' / '),x,yy,{width:w,lineGap:5});return doc.y;}
 function height(text,w,size=11,bold=false){return doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).heightOfString(String(text||'').replaceAll('→',' para ').replaceAll('↔',' / '),{width:w,lineGap:5});}
 function next(){doc.addPage();paint();write(b.destination+'  /  '+state.agency,left,35,width,9,false,muted);doc.roundedRect(left,65,30,3,1.5).fill(brand.secondary);y=91;}
 function ensure(h){if(y+h>bottom)next();}
 function paragraph(value,size=11){
  doc.font('Helvetica').fontSize(size);const words=[];for(const raw of String(value||'').split(/\s+/)){let word=raw;while(doc.widthOfString(word)>width){let k=word.length;while(k>1&&doc.widthOfString(word.slice(0,k))>width)k--;words.push(word.slice(0,k));word=word.slice(k);}if(word)words.push(word);}
  let line='';for(const word of words){doc.font('Helvetica').fontSize(size);const trial=line?line+' '+word:word;if(doc.widthOfString(trial)>width&&line){ensure(size+16);y=write(line,left,y,width,size)+4;line=word;}else line=trial;}if(line){ensure(size+16);y=write(line,left,y,width,size)+(size<=10?3:15);}
 }
 function heading(number,title){ensure(75);write(number,left,y,32,10,true,muted);y=write(title,left+35,y-3,width-35,19,true)+12;}
 function card(label,title,lines){
  // Split lengthy operator conditions into small cards instead of clipping or shrinking text.
  const wrapped=[];for(const value of lines){const chunks=String(value).match(/.{1,170}(?:\s|$)|.{1,170}/g)||[''];wrapped.push(...chunks.map(v=>v.trim()));}
  for(let offset=0;offset<Math.max(1,wrapped.length);){let group=[],used=55+height(title,width-40,14,true);while(offset<wrapped.length&&group.length<8){const line=wrapped[offset],h=height(line,width-40,10)+9;if(used+h>535&&group.length)break;used+=h;group.push(line);offset++;}if(!wrapped.length)offset=1;ensure(used+20);soft(left,y,width,used);let yy=y+18;write(label.toUpperCase(),left+20,yy,width-40,8,true,muted);yy+=20;yy=write(title,left+20,yy,width-40,14,true)+12;for(const line of group)yy=write(line,left+20,yy,width-40,10,false,muted)+9;y+=used+22;}
 }
 if(brand.logo){try{doc.image(Buffer.from(brand.logo.split(',')[1],'base64'),left,29,{fit:[195,77],align:'left',valign:'center'});}catch{throw Object.assign(Error('Não foi possível ler o logo. Carregue um PNG válido.'),{status:422});}}
 else write(state.agency,left,47,350,15,true);
 write('PROPOSTA DE VIAGEM',400,50,149,8,true,muted);
 soft(left,119,width,218);const heroGradient=doc.linearGradient(left,119,left+width,337).stop(0,theme.from).stop(1,theme.to);doc.roundedRect(left,119,width,218,18).fill(heroGradient);doc.save().opacity(.7).roundedRect(left+24,144,34,3,1.5).fill('#ffffff').restore();write('SUA PRÓXIMA VIAGEM',left+24,162,width-48,9,true,theme.ink);
 let size=44;doc.font('Times-Roman').fontSize(size);while(doc.heightOfString(b.destination,{width:width-48})>68&&size>12){size-=2;doc.fontSize(size);}doc.fillColor(theme.ink).text(b.destination,left+24,188,{width:width-48});let yy=doc.y+14;
 yy=write('Preparada para '+client.name,left+24,yy,width-48,client.name.length>70?10:12,false,theme.ink)+12;
 if(b.badge)write(b.badge,left+24,Math.min(yy,309),width-48,9,true,theme.ink);
 y=361;soft(left,y,326,69,true);soft(left+344,y,159,69,true);write('PERÍODO',left+16,y+13,285,8,true,muted);write(date(b.start)+'  -  '+date(b.end),left+16,y+32,285,12,true);write('VIAJANTES',left+360,y+13,128,8,true,muted);write(b.travelers+' pessoas',left+360,y+32,125,12,true);y+=96;
 paragraph(b.introduction||'Uma viagem pensada para você, com os serviços e o cuidado da nossa agência.',12);
 heading('01','Sua viagem, em detalhes');
 if(details.services.length){for(const s of details.services)card(({stay:'Hospedagem',flight:'Aéreo',transfer:'Traslado',other:'Serviço'})[s.kind],s.title,s.lines);}
 else card('Serviços inclusos','O que faz parte da sua viagem',b.inclusions||[]);
 ensure(220);heading('02','Investimento');
 const p=details.price,subtotal=proposalTotal(b)+b.discount,breakdown=p&&Math.round((p.products+p.fees+p.taxes)*100)===Math.round(subtotal*100);
 if(breakdown){
  for(const [label,value]of [['Produtos',p.products],['Taxas',p.fees],['Impostos',p.taxes]]){write(label,left,y,300,10,false,muted);write(money(value),390,y,159,11,true);y+=21;}
 }else for(const item of b.items)paragraph(item.name+'  ·  '+item.qty+' × '+money(item.unit),10);
 ensure(160);soft(left,y,width,108);doc.roundedRect(left,y,width,108,18).fill(theme.tint);doc.roundedRect(left,y,4,108,2).fill(theme.from);
 write('TOTAL DO GRUPO'+(breakdown?' · COM TAXAS':''),left+22,y+19,280,8,true,muted);write(money(proposalTotal(b)),left+22,y+40,290,29,true,accent);
 doc.moveTo(left+325,y+25).lineTo(left+325,y+80).strokeColor('#cdd5d2').stroke();write('POR VIAJANTE',left+345,y+26,140,8,true,muted);write(money(proposalTotal(b)/b.travelers),left+345,y+47,140,17,true,accent);
 if(b.discount)write('Desconto de '+money(b.discount)+' incluído',left+22,y+84,280,8,false,muted);y+=152;
 if(details.paymentTerms.length)card('Pagamento','Escolha como seguir',details.paymentTerms);
 ensure(130);heading('03','Condições e próximos passos');
 if(b.sourceReference)paragraph('Referência da cotação: '+b.sourceReference,10);
 paragraph('Validade: '+date(b.validUntil||b.valid),10);
 if(b.notes)for(const line of b.notes.split('\n'))paragraph(line,10);
 paragraph('Para aprovar ou solicitar ajustes, fale com sua agência. A aprovação não confirma reserva, pagamento ou emissão. Valores e disponibilidade devem ser reconfirmados com a operadora.',9);
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){
  doc.switchToPage(i);doc.save();doc.rect(0,752,596,90).fill(paper);doc.moveTo(left,750).lineTo(549,750).strokeColor('#d6dfde').stroke();
  doc.save().opacity(.08).roundedRect(left+3,770,239,58,12).fill('#50666c').restore();doc.roundedRect(left,767,239,58,12).fill('#faf9f6');
  write('TECNOLOGIA',left+14,776,100,7,false,muted);doc.image(asset('travelpro-assinatura-transparente.png'),left+8,787,{fit:[187,35],align:'left',valign:'center'});
  doc.font('Helvetica').fontSize(8).fillColor(muted).text(`${i+1} / ${pages.count}`,511,798,{lineBreak:false});doc.restore();
 }
 doc.end();return done;
}
