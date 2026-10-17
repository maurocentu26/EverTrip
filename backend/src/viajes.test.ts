import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { app } from './app';
import { store } from './db/store';
import { spawnSync } from 'node:child_process';

process.env.NODE_ENV = 'test';
describe('Programación de viajes (EVE-19 a EVE-21)', () => {
  let server: Server; let url: string;
  const input = { ruta_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', vehiculo_id: '11111111-2222-4333-8444-555555555501', fecha_salida: '2030-10-20T08:00:00-03:00', fecha_llegada: '2030-10-20T12:00:00-03:00' };
  before(async () => {
    await store.init();
    await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => { const addr = server.address(); assert(addr && typeof addr !== 'string'); url = `http://127.0.0.1:${addr.port}/v1`; resolve(); }); });
  });
  after(async () => { await new Promise<void>((resolve,reject) => server.close(err => err ? reject(err) : resolve())); });
  beforeEach(() => store.resetToSeeds(false));
  const post = (body: unknown) => fetch(`${url}/viajes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it('crea un viaje y conserva tarifa, recorrido y cantidad de asientos como snapshot', async () => {
    const response = await post(input); assert.equal(response.status,201);
    const { data } = await response.json();
    assert.equal(data.precio,15000); assert.equal(data.estado,'programado'); assert.equal(data.asientos_totales,44);
    assert.equal(data.fecha_salida,'2030-10-20T11:00:00.000Z');
    await store.updateRuta(input.ruta_id,{ precio_base: 20000, origen: 'Otra terminal' });
    await store.saveVehiculoLayout(input.vehiculo_id,1,[{ piso:1, filas:[{ fila:1, asientos:['VIP',null,null,null] }] }]);
    const listed = await (await fetch(`${url}/viajes`)).json();
    assert.equal(listed.meta.total,1); assert.equal(listed.data[0].precio,15000);
    assert.equal(listed.data[0].ruta.origen,'Buenos Aires'); assert.equal(listed.data[0].asientos_totales,44);
  });

  it('rechaza solapamientos concurrentes, incluso con distinta representación de zona horaria', async () => {
    const responses = await Promise.all([post(input),post({ ...input,fecha_salida:'2030-10-20T11:00:00Z',fecha_llegada:'2030-10-20T15:00:00Z' })]);
    assert.deepEqual(responses.map(r => r.status).sort(),[201,409]);
    const conflict = await responses.find(r => r.status === 409)!.json(); assert.equal(conflict.error.code,'VEHICLE_CONFLICT');
    assert.equal((await (await fetch(`${url}/viajes`)).json()).data.length,1);
  });

  it('permite viajes adyacentes y unidades diferentes; rechaza inclusión parcial y total', async () => {
    assert.equal((await post(input)).status,201);
    assert.equal((await post({ ...input,fecha_salida:input.fecha_llegada,fecha_llegada:'2030-10-20T15:00:00-03:00' })).status,201);
    assert.equal((await post({ ...input,vehiculo_id:'11111111-2222-4333-8444-555555555502' })).status,201);
    assert.equal((await post({ ...input,fecha_salida:'2030-10-20T07:00:00-03:00',fecha_llegada:'2030-10-20T09:00:00-03:00' })).status,409);
    assert.equal((await post({ ...input,fecha_salida:'2030-10-20T09:00:00-03:00',fecha_llegada:'2030-10-20T10:00:00-03:00' })).status,409);
    assert.equal((await post({ ...input,fecha_salida:'2030-10-20T06:00:00-03:00',fecha_llegada:'2030-10-20T17:00:00-03:00' })).status,409);
  });

  it('valida fechas reales con zona, orden, IDs y precio monetario antes de insertar', async () => {
    for (const override of [{ruta_id:'incorrecto'}, {fecha_salida:'2030-02-30T08:00:00-03:00'}, {fecha_salida:'2030-10-20T08:00'}, {fecha_salida:'2030-10-20T24:00:00-03:00'}, {fecha_llegada:input.fecha_salida}, {precio_override:0}, {precio_override:-1}, {precio_override:'100'}, {precio_override:1.005}, {precio_override:1e12}]) {
      const res = await post({ ...input,...override }); assert.equal(res.status,422,JSON.stringify(override));
    }
    assert.equal((await (await fetch(`${url}/viajes`)).json()).data.length,0);
    const override = await post({ ...input,precio_override:19.99 }); assert.equal(override.status,201); assert.equal((await override.json()).data.precio,19.99);
  });

  it('rechaza recursos inexistentes, ruta inactiva, unidad no disponible y mapa ambiguo', async () => {
    assert.equal((await post({ ...input,ruta_id:'00000000-0000-0000-0000-000000000000' })).status,404);
    await store.updateRuta(input.ruta_id,{activa:false});
    assert.equal((await post(input)).status,422);
    await store.updateRuta(input.ruta_id,{activa:true});
    await store.updateVehiculo(input.vehiculo_id,{estado:'mantenimiento'});
    assert.equal((await post(input)).status,422);
    await store.updateVehiculo(input.vehiculo_id,{estado:'activo',layout:[{piso:1,filas:[{fila:1,asientos:['1A','1A']}]}]});
    const res = await post(input); assert.equal(res.status,422); assert.equal((await res.json()).error.code,'INVALID_LAYOUT');
  });

  it('filtra días completos de Argentina, ruta y estado, ordenando por salida', async () => {
    assert.equal((await post({ ...input,fecha_salida:'2030-10-20T00:00:00-03:00',fecha_llegada:'2030-10-20T02:00:00-03:00' })).status,201);
    assert.equal((await post({ ...input,fecha_salida:'2030-10-20T23:00:00-03:00',fecha_llegada:'2030-10-21T01:00:00-03:00' })).status,201);
    assert.equal((await post({ ...input,fecha_salida:'2030-10-21T02:00:00-03:00',fecha_llegada:'2030-10-21T04:00:00-03:00' })).status,201);
    const body = await (await fetch(`${url}/viajes?fecha_desde=2030-10-20&fecha_hasta=2030-10-20&ruta_id=${input.ruta_id}&estado=programado`)).json();
    assert.equal(body.data.length,2); assert(body.data[0].fecha_salida < body.data[1].fecha_salida);
    assert.equal((await (await fetch(`${url}/viajes?estado=cancelado`)).json()).data.length,0);
    for (const qs of ['fecha_desde=2030-02-30','fecha_desde=2030-10-21&fecha_hasta=2030-10-20','estado=otro','ruta_id=mal','fecha_desde=2030-10-20&fecha_desde=2030-10-21']) assert.equal((await fetch(`${url}/viajes?${qs}`)).status,422);
  });

  it('no agenda contra una copia local cuando PostgreSQL configurado está caído', () => {
    const result = spawnSync(process.execPath, ['--import','tsx','-e',
      "const assert=require('node:assert/strict');const {store}=require('./src/db/store.ts');(async()=>{await assert.rejects(()=>store.listViajes({}),e=>e.code==='STORAGE_UNAVAILABLE');await assert.rejects(()=>store.createViaje({}),e=>e.code==='STORAGE_UNAVAILABLE');})().then(()=>process.exit(0)).catch(()=>process.exit(1));"],
      { cwd:process.cwd(),timeout:10000,env:{...process.env,NODE_ENV:'development',FORCE_MEMORY_STORE:'false',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/unavailable_test'} });
    assert.equal(result.status,0,result.error?.message);
  });
});
