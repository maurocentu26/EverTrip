const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/catalogValidation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const scope = { exports: {} };
new Function('exports', compiled)(scope.exports);
const { validateRuta, validateVehiculo } = scope.exports;

test('ruta: acepta tarifa decimal y rechaza ciudades iguales, vacías e importes inválidos', () => {
  const route = { origen: 'Rosario', destino: 'Córdoba', distancia_km: 402, precio_base: 18500.50 };
  assert.equal(validateRuta(route), null);
  assert(validateRuta({ ...route, origen: '  ' }));
  assert(validateRuta({ ...route, destino: ' ROSARIO ' }));
  for (const value of [0, -1, NaN, Infinity]) {
    assert(validateRuta({ ...route, distancia_km: value }));
    assert(validateRuta({ ...route, precio_base: value }));
  }
});

test('vehículo: mantiene ambas longitudes de patente y límites enteros de capacidad', () => {
  const vehicle = { patente: 'AB123CD', tipo: 'semicama', capacidad_asientos: 44 };
  for (const seats of [8, 44, 90]) assert.equal(validateVehiculo({ ...vehicle, capacidad_asientos: seats }), null);
  assert.equal(validateVehiculo({ ...vehicle, patente: 'ABC123' }), null);
  for (const seats of [0, 7, 91, 44.5, NaN, Infinity]) assert(validateVehiculo({ ...vehicle, capacidad_asientos: seats }));
  for (const plate of ['', 'AB123', 'AB123CDE']) assert(validateVehiculo({ ...vehicle, patente: plate }));
});
