// PDF.js renders the original artwork. Only selected text paint operations are
// suppressed; their positioning operations still execute, preserving the rest.
export const MODEL_VERSION=1;
export function adaptDays(original,count){
  if(!Number.isInteger(count)||count<1||count>30)throw Error('Informe entre 1 e 30 dias de programação.');
  const groups=[];for(const page of original.pages)if(page.day){let group=groups.find(g=>g.day===page.day);if(!group){group={day:page.day,pages:[]};groups.push(group);}group.pages.push(page);}
  if(!groups.length)throw Error('O modelo não possui dias reconhecidos. Confira os campos do original.');
  if(count===groups.length)return structuredClone(original);
  const first=original.pages.findIndex(p=>p.day),last=original.pages.findLastIndex(p=>p.day),pages=[...original.pages.slice(0,first)];
  for(let day=1;day<=count;day++){
    const group=day===count&&count>1?groups.at(-1):groups[Math.min(day-1,Math.max(0,groups.length-2))];
    for(const page of group.pages)pages.push({...page,day,fields:page.fields.map(f=>({...f,day}))});
  }
  pages.push(...original.pages.slice(last+1));
  if(pages.length>60)throw Error('Essa sequência ultrapassa 60 páginas. Use menos dias.');
  return {...original,pages:pages.map((p,i)=>({...structuredClone(p),sourceNumber:p.sourceNumber||p.number,number:i+1,fields:p.fields.map((f,j)=>({...structuredClone(f),id:`p${i+1}-f${j}`,page:i+1}))}))};
}
const near=(a,b,t=2)=>Math.abs(a-b)<=t;
const family=name=>String(name||'').replace(/^[A-Z]{6}\+/,'');
const union=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)});
const fixed=/^(?:roteiro(?: de viagem)?|mapa do dia|informações gerais|documentos|avisos importantes|suas anotações|muito obrigado!?|\d{1,3})$/i;

export async function inspectPage(page,canvas,OPS,{registerFont}={}) {
  const viewport=page.getViewport({scale:1}),ctx=canvas.getContext('2d');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const list=await page.getOperatorList(),fontMap=new Map(),opText=new Map();let currentFont='',stack=[];
  for(let i=0;i<list.fnArray.length;i++){
    const fn=list.fnArray[i],args=list.argsArray[i];
    if(fn===OPS.save)stack.push(currentFont);
    if(fn===OPS.restore)currentFont=stack.pop()||currentFont;
    if(fn===OPS.setFont)currentFont=args[0];
    if(fn!==OPS.showText)continue;
    const font=page.commonObjs.get(currentFont);if(!font)continue;
    if(!fontMap.has(currentFont)){
      if(registerFont&&font.data)registerFont(font.data,font.loadedName);
      fontMap.set(currentFont,{name:family(font.name),loadedName:font.loadedName,chars:new Map()});
    }
    const entry=fontMap.get(currentFont),glyphs=args[0].filter(g=>g&&typeof g==='object');
    for(const g of glyphs)if(g.unicode&&g.fontChar)entry.chars.set(g.unicode,g.fontChar);
    opText.set(i,{text:glyphs.map(g=>g.unicode).join(''),font:entry});
  }
  const runs=new Map();let op=-1;
  const proto=Object.getPrototypeOf(ctx),original=proto.fillText;
  proto.fillText=function(text,x,y,...rest){const ctx=this;
    const source=opText.get(op),m=ctx.getTransform(),size=parseFloat(ctx.font.match(/([\d.]+)px/)?.[1]||'12')*Math.hypot(m.c,m.d);
    if(source?.text&&Math.abs(m.b)<.01&&Math.abs(m.c)<.01){
      const metric=ctx.measureText(text),scale=Math.abs(m.a),baseline=m.d*y+m.f;
      const box={x:m.a*x+m.e,y:baseline-(metric.actualBoundingBoxAscent||size*.8)*Math.abs(m.d),right:m.a*x+m.e+metric.width*scale,bottom:baseline+(metric.actualBoundingBoxDescent||size*.2)*Math.abs(m.d)};
      const old=runs.get(op);
      runs.set(op,{...box,...(old?union(old,box):{}),baseline,size,color:String(ctx.fillStyle),family:source.font.name,text:source.text,ops:[op]});
    }
    return original.call(this,text,x,y,...rest);
  };
  try{await page.render({canvasContext:ctx,viewport,operationsFilter:i=>{op=i;return true;}}).promise;}finally{proto.fillText=original;}
  const sorted=[...runs.values()].sort((a,b)=>near(a.baseline,b.baseline)?a.x-b.x:a.baseline-b.baseline),lines=[];
  for(const r of sorted){
    const line=lines.at(-1);
    if(line&&near(line.baseline,r.baseline)&&r.x-line.right<Math.max(90,Math.max(r.size,line.size)*1.4)&&!(line.x<viewport.width*.47&&line.right<viewport.width*.47&&r.x>viewport.width*.47&&r.x-line.right>20)&&r.x>=line.x){
      const gap=r.x-line.right;
      line.text+=(gap>r.size*.24&&!line.text.endsWith(' ')?' ':'')+r.text;line.ops.push(...r.ops);line.weights[r.family]=(line.weights[r.family]||0)+r.text.length;Object.assign(line,union(line,r));
      if(line.weights[r.family]>(line.dominant||0)){line.family=r.family;line.color=r.color;line.size=r.size;line.dominant=line.weights[r.family];}
    }else lines.push({...r,weights:{[r.family]:r.text.length},dominant:r.text.length,lineCount:1});
  }
  // TextContent retains real word spaces (many PDFs encode spaces as movements).
  const content=await page.getTextContent();
  for(const line of lines){
    const items=content.items.filter(t=>typeof t.str==='string'&&t.str&&Math.abs(viewport.convertToViewportPoint(t.transform[4],t.transform[5])[1]-line.baseline)<2&&viewport.convertToViewportPoint(t.transform[4],t.transform[5])[0]>=line.x-2&&viewport.convertToViewportPoint(t.transform[4],t.transform[5])[0]<=line.right+1).sort((a,b)=>a.transform[4]-b.transform[4]);
    if(items.length)line.text=items.map(t=>t.str).join('');
  }
  const groups=[];
  for(const line of lines){
    const prev=groups.findLast(g=>near(g.x,line.x,4)&&near(g.size,line.size,.6)&&g.color===line.color&&line.baseline-g.lastBaseline>line.size*.8&&line.baseline-g.lastBaseline<line.size*1.65),gap=prev?line.baseline-prev.lastBaseline:0;
    if(prev&&near(prev.x,line.x,4)&&near(prev.size,line.size,.6)&&prev.color===line.color&&gap>line.size*.8&&gap<line.size*1.65&&!fixed.test(prev.text)&&!/^Dia\s*\d+/i.test(line.text)){
      prev.text+='\n'+line.text;prev.ops.push(...line.ops);prev.lineCount++;prev.lineHeight=gap;prev.lastBaseline=line.baseline;Object.assign(prev,union(prev,line));
    }else groups.push({...line,lastBaseline:line.baseline,lineHeight:line.size*1.3});
  }
  const fields=groups.filter(g=>g.text.trim()).map((g,i)=>({id:`p${page.pageNumber}-f${i}`,page:page.pageNumber,text:g.text,ops:g.ops,rect:{x:g.x,y:g.y,width:g.right-g.x,height:g.bottom-g.y},baseline:g.baseline,lines:g.lineCount,size:g.size,lineHeight:g.lineHeight,family:g.family,color:/^#[a-f0-9]{3,8}$/i.test(g.color)?g.color:'#222222',label:g.text.split('\n')[0].slice(0,60),editable:!(fixed.test(g.text.trim())||['ROTEIRO','ROTEIRODEVIAGEM'].includes(g.text.replace(/\s/g,''))),role:(fixed.test(g.text.trim())||['ROTEIRO','ROTEIRODEVIAGEM'].includes(g.text.replace(/\s/g,'')))?'fixed':'content',day:0}));
  for(const f of fields)if(/^\d{1,3}$/.test(f.text.trim())&&f.rect.y>viewport.height*.85){f.role='pageNumber';f.editable=false;}
  const heading=fields.find(f=>/^Dia\s*0*\d+$/i.test(f.text.trim()));
  const day=heading?Number(heading.text.match(/\d+/)[0]):0;
  for(const f of fields){f.day=day;if(/^Dia\s*0*\d+$/i.test(f.text.trim()))f.role='day';else if(/^\d{2}\/\d{2}/.test(f.text.trim()))f.role='date';}
  return {page:{number:page.pageNumber,width:viewport.width,height:viewport.height,day,fields},fonts:[...fontMap.values()]};
}

export function validateLayout(layout) {
  if(layout?.version!==MODEL_VERSION||!Array.isArray(layout.pages)||!layout.pages.length||layout.pages.length>60)throw Error('Estrutura visual do PDF inválida.');
  const ids=new Set();let chars=0;
  for(const [i,p]of layout.pages.entries()){
    if(p.number!==i+1||(p.sourceNumber!==undefined&&(!Number.isInteger(p.sourceNumber)||p.sourceNumber<1||p.sourceNumber>60))||!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<50||p.width>3000||p.height<50||p.height>3000||!Array.isArray(p.fields)||p.fields.length>600)throw Error('Página do modelo inválida.');
    for(const f of p.fields){const b=f.rect;chars+=typeof f.text==='string'?f.text.length:0;
      if(!f.id||ids.has(f.id)||f.page!==p.number||typeof f.text!=='string'||f.text.length>15000||!b||![b.x,b.y,b.width,b.height,f.size,f.baseline,f.lineHeight].every(Number.isFinite)||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>p.width+3||b.y+b.height>p.height+3||f.size<1||f.size>200||f.lineHeight<1||!Array.isArray(f.ops)||f.ops.length>25000||f.ops.some(n=>!Number.isInteger(n)||n<0||n>500000)||typeof f.editable!=='boolean'||!Number.isInteger(f.day)||f.day<0||f.day>100)throw Error('Campo do modelo inválido.');
      ids.add(f.id);
    }
  }
  if(chars>180000)throw Error('Use um roteiro com menos texto.');return layout;
}

function glyphFor(char,familyName,fonts){
  for(const font of fonts)if(font.name===familyName&&font.chars.has(char))return {font:font.loadedName,glyph:font.chars.get(char)};
  if(char===' ')return {font:fonts.find(f=>f.name===familyName)?.loadedName,glyph:' '};
  return null;
}
export function textPlan(ctx,field,value,fonts){
  const text=String(value),size=field.size,w=field.rect.width+3,lines=[];
  function width(word){let n=0;for(const char of word){const g=glyphFor(char,field.family,fonts);if(!g?.font)throw Error(`A fonte original não contém o caractere “${char}”. Ajuste o texto do campo ${field.label}.`);ctx.font=`${size}px "${g.font}"`;n+=ctx.measureText(g.glyph).width;}return n;}
  for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){if(width(word)>w)throw Error(`O texto de “${field.label}” é largo demais. Use palavras menores.`);const next=line?line+' '+word:word;if(width(next)>w){lines.push(line);line=word;}else line=next;}lines.push(line);}
  const maxLines=Math.max(1,field.lines||Math.round((field.rect.height-field.size)/field.lineHeight)+1);
  if(lines.length>maxLines)throw Error(`“${field.label}” ultrapassa o espaço original (${maxLines} linha(s)). Encurte o texto ou gere uma versão menor.`);
  return {lines,size,lineHeight:field.lineHeight,width};
}

export async function renderPage(page,canvas,definition,values,fonts,{scale=1.5}={}){
  const effective={...values};for(const f of definition.fields)if(f.role==='pageNumber')effective[f.id]=String(definition.number).padStart(f.text.trim().length,'0');
  const changed=definition.fields.filter(f=>(f.editable||f.role==='pageNumber')&&Object.hasOwn(effective,f.id)&&effective[f.id]!==f.text);
  for(const f of changed)textPlan(canvas.getContext('2d'),f,effective[f.id],fonts);
  const hidden=new Set(changed.flatMap(f=>f.ops)),viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d'),proto=Object.getPrototypeOf(ctx),fill=proto.fillText,stroke=proto.strokeText;let op=-1;const removed=new Set();
  proto.fillText=function(...args){if(hidden.has(op)){removed.add(op);return;}return fill.apply(this,args);};proto.strokeText=function(...args){if(hidden.has(op)){removed.add(op);return;}return stroke.apply(this,args);};
  try{await page.render({canvasContext:ctx,viewport,operationsFilter:i=>{op=i;return true;}}).promise;}finally{proto.fillText=fill;proto.strokeText=stroke;}
  if(changed.some(f=>!f.ops.some(op=>removed.has(op))))throw Error('Este PDF usa texto em curvas. Não foi possível substituir os campos mantendo a arte. Use o arquivo editável original.');
  ctx.save();ctx.scale(scale,scale);
  try{for(const f of changed){const plan=textPlan(ctx,f,effective[f.id],fonts);ctx.fillStyle=f.color;ctx.textBaseline='alphabetic';for(const [i,line]of plan.lines.entries()){let x=f.rect.x;for(const char of line){const g=glyphFor(char,f.family,fonts);ctx.font=`${plan.size}px "${g.font}"`;ctx.fillText(g.glyph,x,f.baseline+i*plan.lineHeight);x+=ctx.measureText(g.glyph).width;}}}}finally{ctx.restore();}
  return canvas;
}
