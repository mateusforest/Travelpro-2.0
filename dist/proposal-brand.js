(() => {
  const defaults={primary:'#244638',secondary:'#cf9960',logo:''};
  function normalize(value={}) {
    const b={...defaults,...value};
    for(const k of ['primary','secondary'])if(!/^#[a-f0-9]{6}$/i.test(b[k]))throw Error('Escolha uma cor válida para a proposta.');
    if(typeof b.logo!=='string'||b.logo.length>380000||b.logo&&!/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(b.logo))throw Error('Use um logo PNG válido e otimizado.');
    if(b.logo){const header=atob(b.logo.split(',')[1].slice(0,44));const n=offset=>((header.charCodeAt(offset)*16777216)+(header.charCodeAt(offset+1)<<16)+(header.charCodeAt(offset+2)<<8)+header.charCodeAt(offset+3));if(!header.startsWith('\x89PNG\r\n\x1a\n')||n(16)<1||n(20)<1||n(16)>2048||n(20)>2048)throw Error('Reduza o logo para até 2.048 pixels por lado.');}
    return {primary:b.primary,secondary:b.secondary,logo:b.logo};
  }
  function palette(pixels) {
    const bins=new Map();
    for(let i=0;i<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a<180||Math.min(r,g,b)>235)continue;const key=[r,g,b].map(v=>Math.round(v/24)*24).join(',');const bin=bins.get(key)||{n:0,r:0,g:0,b:0};bin.n++;bin.r+=r;bin.g+=g;bin.b+=b;bins.set(key,bin);}
    const all=[...bins.values()].sort((a,b)=>b.n-a.n).map(b=>({n:b.n,rgb:[b.r,b.g,b.b].map(v=>Math.round(v/b.n))}));
    const color=all.filter(b=>Math.max(...b.rgb)-Math.min(...b.rgb)>35);const list=color.length?color:all;
    if(!list.length)return ['#244638'];const first=list[0];
    const second=list.find(b=>b.n>=first.n*.18&&Math.hypot(...b.rgb.map((v,i)=>v-first.rgb[i]))>95);
    return [first,second].filter(Boolean).map(b=>'#'+b.rgb.map(v=>v.toString(16).padStart(2,'0')).join(''));
  }
  function ink(hex){const values=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722>.179?'#14251e':'#ffffff';}
  const mix=(a,b,t)=>'#'+a.slice(1).match(/../g).map((v,i)=>Math.round(parseInt(v,16)*(1-t)+parseInt(b.slice(1+i*2,3+i*2),16)*t).toString(16).padStart(2,'0')).join('');
  function theme(value){const b=normalize(value);let from=b.primary,to=b.secondary===b.primary?mix(b.primary,'#000000',.24):b.secondary;for(let i=0;i<18&&(ink(from)!=='#ffffff'||ink(mix(from,'#ffffff',.06))!=='#ffffff');i++)from=mix(from,'#000000',.08);for(let i=0;i<18&&(ink(to)!=='#ffffff'||ink(mix(to,'#ffffff',.06))!=='#ffffff');i++)to=mix(to,'#000000',.08);return {from,to,ink:'#ffffff',tint:mix(b.primary,'#ffffff',.93)};}
  async function prepareLogo(file){
    if(file.size>20*1024*1024)throw Error('Use uma imagem de até 20 MB.');
    if(!/^image\//i.test(file.type||'')&&!/\.(png|jpe?g|jfif|webp|gif|bmp|svg|avif|ico)$/i.test(file.name||''))throw Error('Escolha um arquivo de imagem.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Este formato não pôde ser lido pelo navegador. Exporte como PNG, JPG, WebP ou SVG.'));img.src=url;});
      if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>50000000)throw Error('Reduza a imagem para até 50 megapixels.');
      const source=document.createElement('canvas'),scale=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight));source.width=Math.max(1,Math.round(img.naturalWidth*scale));source.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,source.width,source.height);
      const pixels=ctx.getImageData(0,0,source.width,source.height).data,colors=palette(pixels);
      // Remove only empty/white outer margins, preserving colored backgrounds and aspect ratio.
      let x0=source.width,y0=source.height,x1=-1,y1=-1;
      for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const k=(y*source.width+x)*4;if(pixels[k+3]>20&&!(pixels[k]>245&&pixels[k+1]>245&&pixels[k+2]>245)){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
      if(x1<0){x0=0;y0=0;x1=source.width-1;y1=source.height-1;}
      const pad=8;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(source.width-1,x1+pad);y1=Math.min(source.height-1,y1+pad);
      const w=x1-x0+1,h=y1-y0+1,canvas=document.createElement('canvas');let edge=720,logo='';
      do{const ratio=Math.min(1,edge/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));canvas.getContext('2d').drawImage(source,x0,y0,w,h,0,0,canvas.width,canvas.height);logo=canvas.toDataURL('image/png');edge=Math.floor(edge*.8);}while(logo.length>375000&&edge>=80);
      normalize({logo});return {logo,colors};
    }finally{URL.revokeObjectURL(url);}
  }
  globalThis.TravelProposalBrand={normalize,palette,ink,defaults,theme,prepareLogo};
})();
