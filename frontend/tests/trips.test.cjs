const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname,'../src/utils/trips.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const scope={exports:{}}; new Function('exports',compiled)(scope.exports);
const { toArgentinaTimestamp,formatTripDate }=scope.exports;
test('horarios argentinos independientes de la zona del dispositivo, sin normalizar fechas inválidas', () => {
  assert.equal(toArgentinaTimestamp('2030-10-20T08:30'),'2030-10-20T08:30:00-03:00');
  assert.equal(Date.parse(toArgentinaTimestamp('2030-10-20T08:30')),Date.parse('2030-10-20T11:30Z'));
  for(const value of ['', '2030-02-30T08:00', '2030-10-20T24:00', '2030-10-20T08:70', '2030-10-20']) assert.equal(toArgentinaTimestamp(value),null,value);
  assert.equal(toArgentinaTimestamp('2032-02-29T00:00'),'2032-02-29T00:00:00-03:00');
  assert(formatTripDate('2030-10-21T02:00:00Z').includes('20'));
  assert(formatTripDate('2030-10-21T02:00:00Z').includes('23:00'));
});
