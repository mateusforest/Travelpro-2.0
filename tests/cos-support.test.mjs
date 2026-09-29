import test from 'node:test';
import assert from 'node:assert/strict';
import {cosSupport,cosContext} from '../backend/cos-support.mjs';
const state={agency:'Exemplo',clients:[{id:'1',name:'Cliente',documentNumber:'private'}],trips:[],events:[{id:'1',completed:true},{id:'2'}]};
test('COS routes operational requests to review and gives actual product support',()=>{
 assert.equal(cosSupport('Quero cadastrar este pedido pelo print',state).action,'assistant-intake');
 assert.equal(cosSupport('Como alterar minha senha?',state).action,'support-security');
 assert.equal(cosSupport('Como conciliar o Granatum?',state).action,'support-finance');
 assert.equal(cosSupport('Anexar passaporte',state).action,'new-document');
 assert.match(cosSupport('Como fazer roteiro?',state).text,/depois.*pagamento/);
 assert.doesNotMatch(JSON.stringify(cosContext(state)),/private/);assert.equal(cosContext(state).events.length,1);
});
