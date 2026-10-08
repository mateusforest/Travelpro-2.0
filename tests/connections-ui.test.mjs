import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=readFileSync(new URL('../dist/connections.js',import.meta.url),'utf8');
function setup(t,ctx={}) {
  const dom=new JSDOM('<main></main>',{url:'https://travelpro.test/integracoes.html',runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  dom.window.eval(source);
  const root=dom.window.document.querySelector('main');
  root.innerHTML=dom.window.TravelConnections.render(ctx);
  return root;
}

test('agency connections hide technical configuration and explain client WhatsApp and planned channels',t=>{
  const root=setup(t,{services:[]});
  assert.match(root.textContent,/Conexões/);
  assert.equal(root.querySelector('[data-action="backend-integration"]'),null);
  assert.equal(root.querySelector('input,form'),null);
  assert.equal(root.querySelector('[data-action="connection-whatsapp-info"]').textContent,'Como funciona');
  assert.equal(root.querySelector('a[href="#whatsapp"]').textContent.trim(),'Abrir conversas');
  assert.match(root.textContent,/atendimento aos clientes/);
  assert.match(root.textContent,/canal interno.*separado/s);
  assert.match(root.textContent,/planejado e não é ativado nesta tela/);
  assert.match(root.textContent,/Assinatura eletrônica.*Clicksign.*integração em preparação/s);
  assert.match(root.textContent,/Open Finance.*Pluggy.*integração em preparação.*autorização/s);
  assert.match(root.textContent,/Reserva e pagamento continuam no portal da operadora/);
});

test('saved credentials are not shown or described as verified provider access',t=>{
  const services=Object.freeze([
    Object.freeze({service:'openai',configured:true,config:{key:'SECRET-OPENAI'}}),
    Object.freeze({service:'operator',configured:true,config:{key:'SECRET-OPERATOR',endpoint:'https://private.example.test'}}),
    Object.freeze({service:'whatsapp',configured:true,config:{token:'SECRET-WHATSAPP'}})
  ]);
  const root=setup(t,{services});
  assert.equal(root.querySelectorAll('.conn-tag-review').length,3);
  assert.match(root.textContent,/Configuração registrada · não verificada/);
  assert.match(root.textContent,/a conexão com a operadora ainda não foi validada/);
  assert.doesNotMatch(root.innerHTML,/europlus/i);
  assert.doesNotMatch(root.innerHTML,/SECRET-|private\.example|Conectado com sucesso/);
  assert.equal(root.querySelector('[data-action="backend-integration"]'),null);
});

test('only an explicit platformAdmin boolean enables the collapsed technical panel',t=>{
  for(const platformAdmin of [undefined,false,'true',1]) {
    const root=setup(t,{platformAdmin});
    assert.equal(root.querySelector('.conn-admin'),null,String(platformAdmin));
  }
  const admin=setup(t,{platformAdmin:true});
  const details=admin.querySelector('details.conn-admin');
  assert.ok(details);
  assert.equal(details.open,false);
  assert.equal(details.querySelector('summary').textContent,'Administração TravelPro');
  assert.deepEqual(Array.from(details.querySelectorAll('[data-action="backend-integration"]'),button=>button.dataset.id),['openai','operator','whatsapp']);
  assert.equal(details.querySelector('input'),null);
});
