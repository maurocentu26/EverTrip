import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from './app';
import { store } from './db/store';

process.env.NODE_ENV = 'test';

describe('EverTrip API v1 - Catálogo de Rutas, Flota y Layout de Asientos', () => {
  let server: http.Server;
  let baseUrl = '';

  before(async () => {
    await store.init();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}/v1`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    store.resetToSeeds(false);
  });

  it('GET /v1/health devuelve estado ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  });

  // ==================== RUTAS (EVE-3, EVE-4) ====================
  it('GET /v1/rutas lista las rutas activas con meta de paginación y soporta filtros', async () => {
    const res = await fetch(`${baseUrl}/rutas?origen=Buenos`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 2);
    assert.equal(body.meta.total, 2);
  });

  it('POST /v1/rutas crea una nueva ruta válida (201) y rechaza duplicados (409 DUPLICATE_ROUTE)', async () => {
    const createRes = await fetch(`${baseUrl}/rutas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origen: 'Salta',
        destino: 'San Miguel de Tucumán',
        distancia_km: 308,
        precio_base: 19500
      })
    });
    assert.equal(createRes.status, 201);
    const createdBody = await createRes.json();
    assert.equal(createdBody.success, true);
    assert.equal(createdBody.data.origen, 'Salta');
    assert.equal(createdBody.data.activa, true);

    // Intento duplicado
    const dupRes = await fetch(`${baseUrl}/rutas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origen: 'salta',
        destino: 'san miguel de tucumán',
        distancia_km: 310,
        precio_base: 21000
      })
    });
    assert.equal(dupRes.status, 409);
    const dupBody = await dupRes.json();
    assert.equal(dupBody.success, false);
    assert.equal(dupBody.error.code, 'DUPLICATE_ROUTE');
  });

  it('POST /v1/rutas retorna 422 VALIDATION_ERROR cuando faltan campos o son inválidos', async () => {
    const res = await fetch(`${baseUrl}/rutas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origen: 'Rosario',
        destino: 'Rosario',
        distancia_km: -10,
        precio_base: 0
      })
    });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('PUT /v1/rutas/:id y DELETE /v1/rutas/:id actualizan y aplican soft-delete', async () => {
    const rutaId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const putRes = await fetch(`${baseUrl}/rutas/${rutaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precio_base: 17500 })
    });
    assert.equal(putRes.status, 200);
    const putBody = await putRes.json();
    assert.equal(putBody.data.precio_base, 17500);

    const delRes = await fetch(`${baseUrl}/rutas/${rutaId}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);
    const delBody = await delRes.json();
    assert.equal(delBody.data.activa, false);
  });

  // ==================== VEHÍCULOS Y LAYOUT (EVE-7, EVE-8, EVE-11, EVE-12) ====================
  it('GET /v1/vehiculos lista unidades con layout y soporta filtros', async () => {
    const res = await fetch(`${baseUrl}/vehiculos?estado=activo`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 3);
    assert.ok(Array.isArray(body.data[0].layout));
  });

  it('POST /v1/vehiculos registra nueva unidad y rechaza patente duplicada (409 DUPLICATE_VEHICLE)', async () => {
    const res = await fetch(`${baseUrl}/vehiculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patente: 'AG 999 ZZ',
        tipo: 'cama_ejecutivo',
        capacidad_asientos: 32,
        pisos: 2
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.patente, 'AG999ZZ');
    assert.equal(body.data.capacidad_asientos, 32);

    const dupRes = await fetch(`${baseUrl}/vehiculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patente: 'ag999zz',
        tipo: 'semicama',
        capacidad_asientos: 40
      })
    });
    assert.equal(dupRes.status, 409);
    const dupBody = await dupRes.json();
    assert.equal(dupBody.error.code, 'DUPLICATE_VEHICLE');
  });

  it('POST /v1/vehiculos/:id/layout guarda layout visual de asientos y recalcula total_asientos', async () => {
    const vehiculoId = '11111111-2222-4333-8444-555555555501';
    const customLayout = {
      pisos: 2,
      layout: [
        {
          piso: 1,
          filas: [
            { fila: 1, asientos: ['1A', '1B', null, '1C'] },
            { fila: 2, asientos: ['2A', '2B', null, '2C'] }
          ]
        },
        {
          piso: 2,
          filas: [
            { fila: 1, asientos: ['P1A', 'P1B', 'P1C', 'P1D'] },
            { fila: 2, asientos: ['P2A', 'P2B', 'P2C', 'P2D'] }
          ]
        }
      ]
    };

    const res = await fetch(`${baseUrl}/vehiculos/${vehiculoId}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customLayout)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.vehiculo_id, vehiculoId);
    assert.equal(body.data.total_asientos, 14);
    assert.equal(body.data.layout_guardado, true);

    // Verificar persistencia con GET /v1/vehiculos/:id/layout
    const getRes = await fetch(`${baseUrl}/vehiculos/${vehiculoId}/layout`);
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.data.total_asientos, 14);
    assert.equal(getBody.data.layout.length, 2);
  });
});
