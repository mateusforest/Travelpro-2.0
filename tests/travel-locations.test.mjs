import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../dist/travel-locations.js',import.meta.url),'utf8'),context);
const locations=context.window.TravelLocations;

test('airport choices resolve accents and labels without choosing among city alternatives',()=>{
  assert.equal(locations.resolveAirport('porto alegre'),'POA');
  assert.equal(locations.resolveAirport('Caxias do Sul'),'CXJ');
  assert.equal(locations.resolveAirport('poa'),'POA');
  assert.equal(locations.resolveAirport('São Paulo'),null);
  assert.equal(locations.resolveAirport('Paris'),null);
  assert.equal(locations.resolveAirport('New York'),null);
  assert.equal(locations.resolveAirport('Lisbon'),'LIS');
  const selection=locations.airportSuggestions('São Paulo').find(item=>item.code==='CGH');
  assert.equal(locations.resolveAirport(selection.label),'CGH');
  assert.equal(locations.resolveAirport('Guarulhos'),null,'partial names require an explicit selection');
  assert.equal(locations.resolveAirport('JNB'),'JNB','explicit codes outside the catalog remain usable');
  assert.equal(locations.resolveAirport('<script>'),null);
});

test('location suggestions are bounded, preserve airport distinctions and accept city spelling variants',()=>{
  assert.deepEqual(Array.from(locations.airportSuggestions('Sao Paulo'),item=>item.code).sort(),['CGH','GRU']);
  assert.equal(locations.airportSuggestions('poa')[0].code,'POA');
  assert.equal(locations.destinationSuggestions('Bento Goncalves')[0].name,'Bento Gonçalves');
  assert.equal(locations.destinationSuggestions('New York')[0].name,'Nova York');
  assert.equal(locations.airportSuggestions('not-a-place').length,0);
  assert.equal(locations.airportSuggestions('',999).length,20);
  assert.equal(locations.airportSuggestions('',NaN).length,8);
  assert.equal(new Set(locations.airports.map(item=>item.code)).size,locations.airports.length);
  assert.ok(locations.airports.every(item=>/^[A-Z]{3}$/.test(item.code)&&item.name&&item.city&&item.country));
  assert.equal(locations.metadata.license,'Public Domain');
});
