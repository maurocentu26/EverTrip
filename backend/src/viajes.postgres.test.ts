import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { Pool } from 'pg';

// Run only against a disposable database, never the application's configured database.
describe('Viajes en PostgreSQL: transacción, concurrencia y reinicio', { skip: !process.env.TEST_DATABASE_URL }, () => {
  let child: ChildProcess; let url: string; let pool: Pool;
  async function start() {
    child = spawn(process.execPath, ['--import','tsx','-e',
      "const {app}=require('./src/app.ts'); const {store}=require('./src/db/store.ts'); store.init().then(()=>{const s=app.listen(0,'127.0.0.1',()=>console.log('TEST_PORT:'+s.address().port));}).catch(()=>process.exit(1));"],
      { cwd: process.cwd(), env: { ...process.env, NODE_ENV:'development',DATABASE_URL:process.env.TEST_DATABASE_URL,FORCE_MEMORY_STORE:'false' }, stdio:['ignore','pipe','pipe'] });
    await new Promise<void>((resolve,reject) => {
      const timer = setTimeout(() => reject(new Error('El servidor de prueba no inició.')),10000);
      child.once('exit',() => {clearTimeout(timer);reject(new Error('El servidor de prueba terminó antes de iniciar.'));});
      child.stdout!.on('data',data => {const match=String(data).match(/TEST_PORT:(\d+)/);if(match){url=`http://127.0.0.1:${match[1]}/v1`;clearTimeout(timer);resolve();}});
    });
    const health = await (await fetch(`${url}/health`)).json(); assert.equal(health.data.storage_mode,'postgresql');
  }
  async function stop() { if(child && child.exitCode === null){const exit=once(child,'exit');child.kill();await exit;} }
  before(async () => {
    const dbUrl = new URL(process.env.TEST_DATABASE_URL!);
    assert(dbUrl.pathname.endsWith('_test'),'TEST_DATABASE_URL debe apuntar a una base descartable terminada en _test.');
    pool = new Pool({connectionString:dbUrl.toString()});
    await start();
  });
  after(async () => {await stop();await pool?.end();});
  it('serializa asignaciones concurrentes y persiste viaje/asientos al reiniciar', async () => {
    const routes=await (await fetch(`${url}/rutas`)).json();const vehicles=await (await fetch(`${url}/vehiculos`)).json();
    const input={ruta_id:routes.data[0].id,vehiculo_id:vehicles.data.find((v:{estado:string})=>v.estado==='activo').id,fecha_salida:'2050-11-10T08:00:00-03:00',fecha_llegada:'2050-11-10T12:00:00-03:00',precio_override:19999.99};
    const post=(data:unknown)=>fetch(`${url}/viajes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const results=await Promise.all([post(input),post(input),post(input)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409,409]);
    const viaje=(await results.find(r=>r.status===201)!.json()).data;
    const seats=await pool.query('SELECT numero,estado FROM asientos_viaje WHERE viaje_id=$1',[viaje.id]);
    assert.equal(seats.rowCount,viaje.asientos_totales);assert(seats.rows.every(s=>s.estado==='libre'));
    assert.equal((await post({...input,fecha_salida:input.fecha_llegada,fecha_llegada:'2050-11-10T16:00:00-03:00'})).status,201);
    await stop();await start();
    const listed=await (await fetch(`${url}/viajes?fecha_desde=2050-11-10&fecha_hasta=2050-11-10`)).json();
    assert.equal(listed.data.length,2);assert.equal(listed.data.find((v:{id:string})=>v.id===viaje.id).precio,19999.99);
  });
});
