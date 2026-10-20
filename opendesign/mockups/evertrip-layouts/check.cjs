const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({Intl});
vm.runInContext(fs.readFileSync(__dirname+'/data.js','utf8').replaceAll('export ', '')+'\nglobalThis.data={trips,passengers,money,occupied,filterTrips}', context);
const {trips,passengers,money,occupied,filterTrips} = context.data;
assert.equal(new Set(trips.map(t=>t.id)).size,trips.length);
for(const t of trips){
  assert(t.sold<t.capacity && t.capacity%2===0);
  assert.equal(Array.from({length:t.capacity},(_,i)=>i+1).filter(n=>!occupied(t,n)).length,t.capacity-t.sold);
}
assert.equal(filterTrips(trips,'cÓrDoBa').length,2);
assert.equal(filterTrips(trips,'sin coincidencias').length,0);
assert(passengers.every(p=>occupied(trips[0],p.seat)));
assert(money(32500).includes('32.500'));
assert(fs.statSync(__dirname+'/prototype.js').size>1000);
console.log('OK: disponibilidad, capacidad de ambos pisos, pasajeros, filtros y bundle.');
