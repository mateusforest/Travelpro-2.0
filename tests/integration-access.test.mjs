import test from 'node:test';
import assert from 'node:assert/strict';
import {isPlatformAdmin, requirePlatformAdmin, integrationView} from '../backend/integration-access.mjs';

test('platform administration denies access by default and does not infer agency ownership', () => {
  const agencyOwner = {id:'agency-owner-id', email:'owner@example.test', role:'owner'};
  assert.equal(isPlatformAdmin(agencyOwner.id, {}), false);
  assert.equal(isPlatformAdmin(agencyOwner.id, {TRAVELPRO_PLATFORM_ADMIN_IDS:''}), false);
  assert.equal(isPlatformAdmin(agencyOwner.id, {TRAVELPRO_PLATFORM_ADMIN_IDS:' , , '}), false);
  assert.equal(isPlatformAdmin(agencyOwner.id, {TRAVELPRO_PLATFORM_ADMIN_IDS:'owner@example.test,owner'}), false);
  assert.equal(isPlatformAdmin(agencyOwner, {TRAVELPRO_PLATFORM_ADMIN_IDS:agencyOwner.id}), false);
  assert.equal(isPlatformAdmin(agencyOwner.id, {TRAVELPRO_PLATFORM_ADMIN_IDS:['agency-owner-id']}), false);
  assert.equal(isPlatformAdmin('', {TRAVELPRO_PLATFORM_ADMIN_IDS:' , '}), false);
  assert.equal(isPlatformAdmin(null, {}), false);
  assert.equal(isPlatformAdmin(undefined, {}), false);
});

test('platform administration matches complete case-sensitive IDs from the trimmed allowlist', () => {
  const env = {TRAVELPRO_PLATFORM_ADMIN_IDS:' platform-A , ,platform-B, platform-A '};
  assert.equal(isPlatformAdmin('platform-A', env), true);
  assert.equal(isPlatformAdmin('platform-B', env), true);
  assert.equal(isPlatformAdmin('platform', env), false);
  assert.equal(isPlatformAdmin('platform-a', env), false);
  assert.equal(isPlatformAdmin(' platform-A ', env), false);
  assert.equal(isPlatformAdmin('platform-A,platform-B', env), false);
  assert.equal(requirePlatformAdmin('platform-B', env), true);
  assert.throws(() => requirePlatformAdmin('agency-owner-id', env), error => {
    assert.equal(error.status, 403);
    assert.match(error.message, /gerenciada pela equipe TravelPro/);
    return true;
  });
});

test('agency integration views expose status only and platform management includes WhatsApp', () => {
  const services = ['openai','whatsapp','operator','email','payments','signature','studio'].map(service => ({
    service, configured:false, mode:'pending', verified:false,
    missing:['key','endpoint'],
    config:{model:'private-model', endpoint:'https://adapter.example.test', phoneId:'12345', version:'v99.0', key:'secret-key', token:'secret-token'},
    endpoint:'https://private.example.test', model:'private-model', token:'secret-token', appSecret:'secret-app',
    secret:{key:'secret-key'}
  }));
  const original = structuredClone(services);
  const view = integrationView(services, false);
  assert.notEqual(view, services);
  assert.deepEqual(view, services.map(source => ({service:source.service, configured:false, mode:'pending', verified:false, management:'platform'})));
  for (let index = 0; index < view.length; index++) assert.notEqual(view[index], services[index]);
  for (const item of view) for (const forbidden of ['missing','config','endpoint','model','token','appSecret','secret']) {
    assert.equal(Object.hasOwn(item, forbidden), false, forbidden + ' must not leak to agencies');
  }
  for (const value of ['secret-key','private-model','private.example.test']) assert.equal(JSON.stringify(view).includes(value), false);
  assert.deepEqual(services, original);
  assert.deepEqual(integrationView(services, 'owner'), view);
  assert.deepEqual(integrationView(services, undefined), view);
});

test('platform administrators retain copied configuration metadata without secrets or mutation', () => {
  const source = Object.freeze({
    service:'whatsapp', configured:true, mode:'configured', verified:false,
    missing:Object.freeze(['verifyToken']),
    config:Object.freeze({phoneId:'12345', version:'v99.0', model:'approved-model', endpoint:'https://adapter.example.test', key:'secret-key', token:'secret-token', appSecret:'secret-app', verifyToken:'secret-verify'}),
    key:'secret-key', token:'secret-token', secret:{token:'secret-token'}
  });
  const services = Object.freeze([source]);
  const [view] = integrationView(services, true);
  assert.deepEqual(view, {
    service:'whatsapp', configured:true, mode:'configured', verified:false, management:'platform',
    missing:['verifyToken'],
    config:{model:'approved-model', endpoint:'https://adapter.example.test', phoneId:'12345', version:'v99.0'}
  });
  assert.notEqual(view, source);
  assert.notEqual(view.missing, source.missing);
  assert.notEqual(view.config, source.config);
  assert.equal(JSON.stringify(view).includes('secret-'), false);
  view.config.phoneId = '67890';
  view.missing.push('version');
  assert.equal(source.config.phoneId, '12345');
  assert.deepEqual(source.missing, ['verifyToken']);
});
