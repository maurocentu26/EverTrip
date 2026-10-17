import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { AsientoViaje, Viaje, ViajeError, ViajeFilters, ViajeInput } from '../viajes';

export interface Ruta {
  id: string;
  origen: string;
  destino: string;
  distancia_km: number;
  precio_base: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilaLayout {
  fila: number;
  asientos: (string | null)[];
}

export interface PisoLayout {
  piso: number;
  filas: FilaLayout[];
}

export interface Vehiculo {
  id: string;
  patente: string;
  tipo: string;
  capacidad_asientos: number;
  estado: string;
  pisos: number;
  layout: PisoLayout[];
  created_at: string;
  updated_at: string;
}

export function generarLayoutDefecto(pisos: number, capacidad: number): PisoLayout[] {
  const layout: PisoLayout[] = [];
  if (pisos === 1) {
    const filasCount = Math.max(1, Math.ceil(capacidad / 4));
    const filas: FilaLayout[] = [];
    let count = 0;
    const cols = ['A', 'B', 'C', 'D'];
    for (let f = 1; f <= filasCount; f++) {
      const asientos: (string | null)[] = [];
      for (let c = 0; c < 4; c++) {
        if (count < capacidad) {
          asientos.push(`${f}${cols[c]}`);
          count++;
        } else {
          asientos.push(null);
        }
      }
      filas.push({ fila: f, asientos });
    }
    layout.push({ piso: 1, filas });
  } else {
    // 2 pisos: piso 1 ejecutivo/cama (ej. 12 asientos, 3 filas de 4 o 4 filas de 3), piso 2 semicama
    const capPiso1 = Math.min(12, Math.floor(capacidad * 0.25) || 8);
    const capPiso2 = Math.max(1, capacidad - capPiso1);
    const cols = ['A', 'B', 'C', 'D'];

    const filas1: FilaLayout[] = [];
    let c1 = 0;
    const f1Count = Math.ceil(capPiso1 / 4);
    for (let f = 1; f <= f1Count; f++) {
      const asientos: (string | null)[] = [];
      for (let c = 0; c < 4; c++) {
        if (c1 < capPiso1) {
          asientos.push(`${f}${cols[c]}`);
          c1++;
        } else {
          asientos.push(null);
        }
      }
      filas1.push({ fila: f, asientos });
    }

    const filas2: FilaLayout[] = [];
    let c2 = 0;
    const f2Count = Math.ceil(capPiso2 / 4);
    for (let f = 1; f <= f2Count; f++) {
      const asientos: (string | null)[] = [];
      for (let c = 0; c < 4; c++) {
        if (c2 < capPiso2) {
          asientos.push(`P${f}${cols[c]}`);
          c2++;
        } else {
          asientos.push(null);
        }
      }
      filas2.push({ fila: f, asientos });
    }

    layout.push({ piso: 1, filas: filas1 });
    layout.push({ piso: 2, filas: filas2 });
  }
  return layout;
}

export function contarAsientosLayout(layout: PisoLayout[]): number {
  if (!Array.isArray(layout)) return 0;
  let total = 0;
  for (const p of layout) {
    if (!p || !Array.isArray(p.filas)) continue;
    for (const f of p.filas) {
      if (!f || !Array.isArray(f.asientos)) continue;
      for (const asiento of f.asientos) {
        if (typeof asiento === 'string' && asiento.trim().length > 0) {
          total++;
        }
      }
    }
  }
  return total;
}

const INITIAL_RUTAS: Ruta[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    origen: 'Buenos Aires',
    destino: 'Rosario',
    distancia_km: 304,
    precio_base: 15000,
    activa: true,
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'a1b2c3d4-58cc-4372-a567-0e02b2c3d480',
    origen: 'Buenos Aires',
    destino: 'Mar del Plata',
    distancia_km: 404,
    precio_base: 20000,
    activa: true,
    created_at: '2026-10-01T10:05:00.000Z',
    updated_at: '2026-10-01T10:05:00.000Z'
  },
  {
    id: 'b2c3d4e5-58cc-4372-a567-0e02b2c3d481',
    origen: 'Córdoba',
    destino: 'Mendoza',
    distancia_km: 670,
    precio_base: 32500,
    activa: true,
    created_at: '2026-10-01T10:10:00.000Z',
    updated_at: '2026-10-01T10:10:00.000Z'
  },
  {
    id: 'c3d4e5f6-58cc-4372-a567-0e02b2c3d482',
    origen: 'San Carlos de Bariloche',
    destino: 'Neuquén',
    distancia_km: 435,
    precio_base: 28000,
    activa: true,
    created_at: '2026-10-01T10:15:00.000Z',
    updated_at: '2026-10-01T10:15:00.000Z'
  },
  {
    id: 'd4e5f6a7-58cc-4372-a567-0e02b2c3d483',
    origen: 'Rosario',
    destino: 'Córdoba',
    distancia_km: 402,
    precio_base: 18500,
    activa: true,
    created_at: '2026-10-01T10:20:00.000Z',
    updated_at: '2026-10-01T10:20:00.000Z'
  },
  {
    id: 'e5f6a7b8-58cc-4372-a567-0e02b2c3d484',
    origen: 'Mendoza',
    destino: 'San Juan',
    distancia_km: 168,
    precio_base: 12000,
    activa: true,
    created_at: '2026-10-01T10:25:00.000Z',
    updated_at: '2026-10-01T10:25:00.000Z'
  }
];

const INITIAL_VEHICULOS: Vehiculo[] = [
  {
    id: '11111111-2222-4333-8444-555555555501',
    patente: 'AB123CD',
    tipo: 'semicama',
    capacidad_asientos: 44,
    estado: 'activo',
    pisos: 2,
    layout: generarLayoutDefecto(2, 44),
    created_at: '2026-10-01T11:00:00.000Z',
    updated_at: '2026-10-01T11:00:00.000Z'
  },
  {
    id: '11111111-2222-4333-8444-555555555502',
    patente: 'AF482JK',
    tipo: 'cama_ejecutivo',
    capacidad_asientos: 36,
    estado: 'activo',
    pisos: 2,
    layout: generarLayoutDefecto(2, 36),
    created_at: '2026-10-01T11:05:00.000Z',
    updated_at: '2026-10-01T11:05:00.000Z'
  },
  {
    id: '11111111-2222-4333-8444-555555555503',
    patente: 'AE901LM',
    tipo: 'semicama',
    capacidad_asientos: 28,
    estado: 'activo',
    pisos: 1,
    layout: generarLayoutDefecto(1, 28),
    created_at: '2026-10-01T11:10:00.000Z',
    updated_at: '2026-10-01T11:10:00.000Z'
  },
  {
    id: '11111111-2222-4333-8444-555555555504',
    patente: 'AA775RT',
    tipo: 'suite_primera',
    capacidad_asientos: 24,
    estado: 'mantenimiento',
    pisos: 1,
    layout: generarLayoutDefecto(1, 24),
    created_at: '2026-10-01T11:15:00.000Z',
    updated_at: '2026-10-01T11:15:00.000Z'
  }
];

class DataStore {
  private pool: Pool | null = null;
  private usePostgres = false;
  private schedulingStorageUnavailable = false;
  private initialization: Promise<void> | null = null;
  private rutas: Ruta[] = [];
  private vehiculos: Vehiculo[] = [];
  private viajes: (Viaje & { asientos: AsientoViaje[] })[] = [];
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(__dirname, '../../.data-cache.json');
    this.resetToSeeds(false);
  }

  public resetToSeeds(persist = false): void {
    this.rutas = JSON.parse(JSON.stringify(INITIAL_RUTAS));
    this.vehiculos = JSON.parse(JSON.stringify(INITIAL_VEHICULOS));
    this.viajes = [];
    if (persist) {
      this.saveLocalSnapshot();
    }
  }

  private saveLocalSnapshot(strict = false): void {
    if (process.env.NODE_ENV === 'test') return;
    try {
      fs.writeFileSync(
        `${this.dataFilePath}.tmp`,
        JSON.stringify({ rutas: this.rutas, vehiculos: this.vehiculos, viajes: this.viajes }, null, 2),
        'utf-8'
      );
      fs.renameSync(`${this.dataFilePath}.tmp`, this.dataFilePath);
    } catch (err) {
      if (strict) throw err;
      // Ignorar si el sistema de archivos es de solo lectura
    }
  }

  private loadLocalSnapshot(): void {
    if (process.env.NODE_ENV === 'test') return;
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.viajes)) this.viajes = parsed.viajes;
        if (Array.isArray(parsed.rutas) && parsed.rutas.length > 0) {
          this.rutas = parsed.rutas;
        }
        if (Array.isArray(parsed.vehiculos) && parsed.vehiculos.length > 0) {
          this.vehiculos = parsed.vehiculos;
        }
      }
    } catch {
      // Fallback a semillas en memoria
    }
  }

  public init(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initialize().catch(err => { this.initialization = null; throw err; });
    }
    return this.initialization;
  }

  private async initialize(): Promise<void> {

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && process.env.FORCE_MEMORY_STORE !== 'true' && process.env.NODE_ENV !== 'test') {
      try {
        const candidatePool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 1500
        });
        await candidatePool.query('SELECT 1');
        this.pool = candidatePool;
        this.usePostgres = true;
        await this.ensurePostgresSchema();
        return;
      } catch {
        this.schedulingStorageUnavailable = true;
        this.usePostgres = false;
        this.pool = null;
      }
    }

    this.loadLocalSnapshot();
  }

  private async ensurePostgresSchema(): Promise<void> {
    if (!this.pool) return;
    for (const migration of ['001_initial_catalog.sql', '002_viajes.sql']) {
      const sqlPath = path.join(__dirname, '../../migrations', migration);
      await this.pool.query(fs.readFileSync(sqlPath, 'utf-8'));
    }
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS cnt FROM vehiculos');
    if (rows[0].cnt === 0) {
      for (const v of INITIAL_VEHICULOS) {
        await this.pool.query(
          `INSERT INTO vehiculos (id, patente, tipo, capacidad_asientos, estado, pisos, layout)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (patente) DO NOTHING`,
          [v.id, v.patente, v.tipo, v.capacidad_asientos, v.estado, v.pisos, JSON.stringify(v.layout)]
        );
      }
    }
  }

  public getEngineMode(): 'postgresql' | 'memory-hybrid' {
    return this.usePostgres ? 'postgresql' : 'memory-hybrid';
  }

  // ==================== VIAJES (EVE-19, EVE-20, EVE-21) ====================
  public async listViajes(filters: ViajeFilters): Promise<Viaje[]> {
    await this.init();
    if (this.schedulingStorageUnavailable) throw new ViajeError(503, 'STORAGE_UNAVAILABLE', 'La base de programación no está disponible. No se usará una copia local desactualizada.');
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `SELECT v.*, v.precio::float AS precio,
           (SELECT COUNT(*)::int FROM asientos_viaje a WHERE a.viaje_id = v.id) AS asientos_totales
         FROM viajes v
         WHERE ($1::timestamptz IS NULL OR fecha_salida >= $1)
           AND ($2::timestamptz IS NULL OR fecha_salida < $2)
           AND ($3::uuid IS NULL OR ruta_id = $3)
           AND ($4::text IS NULL OR estado = $4)
         ORDER BY fecha_salida, id`,
        [filters.desde || null, filters.hasta || null, filters.ruta_id || null, filters.estado || null]
      );
      return rows;
    }
    return this.viajes.filter(v => (!filters.desde || Date.parse(v.fecha_salida) >= Date.parse(filters.desde)) &&
      (!filters.hasta || Date.parse(v.fecha_salida) < Date.parse(filters.hasta)) &&
      (!filters.ruta_id || v.ruta_id === filters.ruta_id) && (!filters.estado || v.estado === filters.estado))
      .sort((a,b) => Date.parse(a.fecha_salida) - Date.parse(b.fecha_salida) || a.id.localeCompare(b.id))
      .map(({ asientos, ...viaje }) => viaje);
  }

  private buildViaje(input: ViajeInput, ruta?: Ruta, vehiculo?: Vehiculo): Viaje & { asientos: AsientoViaje[] } {
    if (!ruta) throw new ViajeError(404, 'RESOURCE_NOT_FOUND', 'La ruta seleccionada no existe.');
    if (!vehiculo) throw new ViajeError(404, 'RESOURCE_NOT_FOUND', 'La unidad seleccionada no existe.');
    if (!ruta.activa) throw new ViajeError(422, 'INACTIVE_ROUTE', 'La ruta seleccionada está inactiva.');
    if (vehiculo.estado !== 'activo') throw new ViajeError(422, 'UNAVAILABLE_VEHICLE', 'La unidad no está disponible para programar viajes.');
    const asientos = vehiculo.layout.flatMap(p => p.filas.flatMap(f => f.asientos
      .filter((n): n is string => typeof n === 'string' && !!n.trim())
      .map(numero => ({ numero: numero.trim(), piso: p.piso, estado: 'libre' as const }))));
    if (!asientos.length || asientos.some(a => ![1,2].includes(a.piso) || a.piso > vehiculo.pisos) || new Set(asientos.map(a => a.numero)).size !== asientos.length) {
      throw new ViajeError(422, 'INVALID_LAYOUT', 'La unidad necesita un mapa de asientos válido, con códigos únicos.');
    }
    const precio = input.precio_override ?? Number(ruta.precio_base);
    if (!Number.isFinite(precio) || precio < 0.01 || precio > 9999999999.99) throw new ViajeError(422, 'VALIDATION_ERROR', 'La tarifa del viaje no es válida.');
    return { id: uuidv4(), ruta_id: ruta.id, vehiculo_id: vehiculo.id,
      fecha_salida: new Date(input.fecha_salida).toISOString(), fecha_llegada: new Date(input.fecha_llegada).toISOString(),
      precio: Math.round(precio * 100) / 100, estado: 'programado',
      ruta: { origen: ruta.origen, destino: ruta.destino }, vehiculo: { patente: vehiculo.patente, tipo: vehiculo.tipo },
      asientos_totales: asientos.length, asientos, created_at: new Date().toISOString() };
  }

  public async createViaje(input: ViajeInput): Promise<Viaje> {
    await this.init();
    if (this.schedulingStorageUnavailable) throw new ViajeError(503, 'STORAGE_UNAVAILABLE', 'La base de programación no está disponible. Intentá nuevamente cuando se restablezca.');
    if (this.usePostgres && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        // Lock the unit before checking schedules: concurrent requests must see the first commit.
        const vehicle = await client.query('SELECT * FROM vehiculos WHERE id = $1 FOR UPDATE', [input.vehiculo_id]);
        const route = await client.query('SELECT * FROM rutas WHERE id = $1 FOR SHARE', [input.ruta_id]);
        const record = this.buildViaje(input, route.rows[0], vehicle.rows[0]);
        const conflict = await client.query(
          `SELECT id FROM viajes WHERE vehiculo_id = $1 AND estado <> 'cancelado'
           AND fecha_salida < $3 AND fecha_llegada > $2 LIMIT 1`,
          [input.vehiculo_id, record.fecha_salida, record.fecha_llegada]);
        if (conflict.rowCount) throw new ViajeError(409, 'VEHICLE_CONFLICT', 'La unidad ya tiene un viaje en ese horario.');
        await client.query(
          `INSERT INTO viajes (id,ruta_id,vehiculo_id,fecha_salida,fecha_llegada,precio,estado,ruta,vehiculo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [record.id, record.ruta_id, record.vehiculo_id, record.fecha_salida, record.fecha_llegada, record.precio, record.estado, JSON.stringify(record.ruta), JSON.stringify(record.vehiculo)]);
        await client.query(
          `INSERT INTO asientos_viaje (viaje_id,numero,piso,estado)
           SELECT $1, a.numero, a.piso, a.estado FROM jsonb_to_recordset($2::jsonb) AS a(numero text,piso smallint,estado text)`,
          [record.id, JSON.stringify(record.asientos)]);
        await client.query('COMMIT');
        const { asientos, ...viaje } = record;
        return viaje;
      } catch (err) { await client.query('ROLLBACK'); throw err; }
      finally { client.release(); }
    }
    // shortcut: Local scheduling requires one server process; use PostgreSQL before running multiple instances.
    // No await between conflict detection and insertion in the single-process local engine.
    const record = this.buildViaje(input, this.rutas.find(r => r.id === input.ruta_id), this.vehiculos.find(v => v.id === input.vehiculo_id));
    if (this.viajes.some(v => v.vehiculo_id === record.vehiculo_id && v.estado !== 'cancelado' &&
      Date.parse(v.fecha_salida) < Date.parse(record.fecha_llegada) && Date.parse(v.fecha_llegada) > Date.parse(record.fecha_salida))) {
      throw new ViajeError(409, 'VEHICLE_CONFLICT', 'La unidad ya tiene un viaje en ese horario.');
    }
    this.viajes.push(record);
    try { this.saveLocalSnapshot(true); } catch (err) { this.viajes.pop(); throw err; }
    const { asientos, ...viaje } = record;
    return viaje;
  }

  // ==================== RUTAS ====================

  public async listRutas(filters: {
    origen?: string;
    destino?: string;
    activa?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<{ items: Ruta[]; total: number; page: number; per_page: number }> {
    await this.init();
    const page = Math.max(1, Number(filters.page) || 1);
    const per_page = Math.max(1, Math.min(100, Number(filters.per_page) || 20));

    if (this.usePostgres && this.pool) {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (filters.activa !== undefined) {
        values.push(filters.activa);
        conditions.push(`activa = $${values.length}`);
      }
      if (filters.origen) {
        values.push(`%${filters.origen.trim()}%`);
        conditions.push(`origen ILIKE $${values.length}`);
      }
      if (filters.destino) {
        values.push(`%${filters.destino.trim()}%`);
        conditions.push(`destino ILIKE $${values.length}`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await this.pool.query(`SELECT COUNT(*)::int AS total FROM rutas ${whereClause}`, values);
      const total = countRes.rows[0].total;
      const offset = (page - 1) * per_page;
      const dataRes = await this.pool.query(
        `SELECT id, origen, destino, distancia_km::float AS distancia_km, precio_base::float AS precio_base, activa, created_at, updated_at
         FROM rutas ${whereClause}
         ORDER BY origen ASC, destino ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, per_page, offset]
      );
      return { items: dataRes.rows, total, page, per_page };
    }

    let result = [...this.rutas];
    if (filters.activa !== undefined) {
      result = result.filter((r) => r.activa === filters.activa);
    }
    if (filters.origen) {
      const q = filters.origen.trim().toLowerCase();
      result = result.filter((r) => r.origen.toLowerCase().includes(q));
    }
    if (filters.destino) {
      const q = filters.destino.trim().toLowerCase();
      result = result.filter((r) => r.destino.toLowerCase().includes(q));
    }

    const total = result.length;
    const start = (page - 1) * per_page;
    const items = result.slice(start, start + per_page);
    return { items, total, page, per_page };
  }

  public async getRutaById(id: string): Promise<Ruta | null> {
    await this.init();
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `SELECT id, origen, destino, distancia_km::float AS distancia_km, precio_base::float AS precio_base, activa, created_at, updated_at
         FROM rutas WHERE id = $1`,
        [id]
      );
      return rows[0] || null;
    }
    return this.rutas.find((r) => r.id === id) || null;
  }

  public async findDuplicateRuta(origen: string, destino: string, excludeId?: string): Promise<Ruta | null> {
    await this.init();
    const normOrigen = origen.trim().toLowerCase();
    const normDestino = destino.trim().toLowerCase();

    if (this.usePostgres && this.pool) {
      const params: unknown[] = [normOrigen, normDestino];
      let extra = '';
      if (excludeId) {
        params.push(excludeId);
        extra = ` AND id != $3`;
      }
      const { rows } = await this.pool.query(
        `SELECT id, origen, destino, distancia_km::float AS distancia_km, precio_base::float AS precio_base, activa, created_at, updated_at
         FROM rutas
         WHERE LOWER(TRIM(origen)) = $1 AND LOWER(TRIM(destino)) = $2 AND activa = true${extra}
         LIMIT 1`,
        params
      );
      return rows[0] || null;
    }

    return (
      this.rutas.find(
        (r) =>
          r.activa &&
          r.origen.trim().toLowerCase() === normOrigen &&
          r.destino.trim().toLowerCase() === normDestino &&
          r.id !== excludeId
      ) || null
    );
  }

  public async createRuta(input: {
    origen: string;
    destino: string;
    distancia_km: number;
    precio_base: number;
  }): Promise<Ruta> {
    await this.init();
    const now = new Date().toISOString();
    const nueva: Ruta = {
      id: uuidv4(),
      origen: input.origen.trim(),
      destino: input.destino.trim(),
      distancia_km: Number(input.distancia_km),
      precio_base: Number(input.precio_base),
      activa: true,
      created_at: now,
      updated_at: now
    };

    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `INSERT INTO rutas (id, origen, destino, distancia_km, precio_base, activa)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, origen, destino, distancia_km::float AS distancia_km, precio_base::float AS precio_base, activa, created_at, updated_at`,
        [nueva.id, nueva.origen, nueva.destino, nueva.distancia_km, nueva.precio_base]
      );
      return rows[0];
    }

    this.rutas.push(nueva);
    this.saveLocalSnapshot();
    return nueva;
  }

  public async updateRuta(
    id: string,
    updates: Partial<Pick<Ruta, 'origen' | 'destino' | 'distancia_km' | 'precio_base' | 'activa'>>
  ): Promise<Ruta | null> {
    await this.init();
    const existing = await this.getRutaById(id);
    if (!existing) return null;

    const updated: Ruta = {
      ...existing,
      origen: updates.origen !== undefined ? updates.origen.trim() : existing.origen,
      destino: updates.destino !== undefined ? updates.destino.trim() : existing.destino,
      distancia_km: updates.distancia_km !== undefined ? Number(updates.distancia_km) : existing.distancia_km,
      precio_base: updates.precio_base !== undefined ? Number(updates.precio_base) : existing.precio_base,
      activa: updates.activa !== undefined ? Boolean(updates.activa) : existing.activa,
      updated_at: new Date().toISOString()
    };

    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `UPDATE rutas
         SET origen = $2, destino = $3, distancia_km = $4, precio_base = $5, activa = $6, updated_at = NOW()
         WHERE id = $1
         RETURNING id, origen, destino, distancia_km::float AS distancia_km, precio_base::float AS precio_base, activa, created_at, updated_at`,
        [id, updated.origen, updated.destino, updated.distancia_km, updated.precio_base, updated.activa]
      );
      return rows[0] || null;
    }

    const idx = this.rutas.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.rutas[idx] = updated;
    this.saveLocalSnapshot();
    return updated;
  }

  // ==================== VEHICULOS ====================

  public async listVehiculos(filters: { estado?: string; tipo?: string }): Promise<Vehiculo[]> {
    await this.init();
    if (this.usePostgres && this.pool) {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (filters.estado) {
        values.push(filters.estado.trim().toLowerCase());
        conditions.push(`LOWER(estado) = $${values.length}`);
      }
      if (filters.tipo) {
        values.push(filters.tipo.trim().toLowerCase());
        conditions.push(`LOWER(tipo) = $${values.length}`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await this.pool.query(
        `SELECT id, patente, tipo, capacidad_asientos, estado, pisos, layout, created_at, updated_at
         FROM vehiculos ${whereClause}
         ORDER BY created_at ASC`,
        values
      );
      return rows;
    }

    let result = [...this.vehiculos];
    if (filters.estado) {
      const e = filters.estado.trim().toLowerCase();
      result = result.filter((v) => v.estado.toLowerCase() === e);
    }
    if (filters.tipo) {
      const t = filters.tipo.trim().toLowerCase();
      result = result.filter((v) => v.tipo.toLowerCase() === t);
    }
    return result;
  }

  public async getVehiculoById(id: string): Promise<Vehiculo | null> {
    await this.init();
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `SELECT id, patente, tipo, capacidad_asientos, estado, pisos, layout, created_at, updated_at
         FROM vehiculos WHERE id = $1`,
        [id]
      );
      return rows[0] || null;
    }
    return this.vehiculos.find((v) => v.id === id) || null;
  }

  public async findVehiculoByPatente(patente: string, excludeId?: string): Promise<Vehiculo | null> {
    await this.init();
    const normPatente = patente.replace(/\s+/g, '').toUpperCase();
    if (this.usePostgres && this.pool) {
      const params: unknown[] = [normPatente];
      let extra = '';
      if (excludeId) {
        params.push(excludeId);
        extra = ` AND id != $2`;
      }
      const { rows } = await this.pool.query(
        `SELECT id, patente, tipo, capacidad_asientos, estado, pisos, layout, created_at, updated_at
         FROM vehiculos WHERE UPPER(REPLACE(patente, ' ', '')) = $1${extra} LIMIT 1`,
        params
      );
      return rows[0] || null;
    }

    return (
      this.vehiculos.find(
        (v) => v.patente.replace(/\s+/g, '').toUpperCase() === normPatente && v.id !== excludeId
      ) || null
    );
  }

  public async createVehiculo(input: {
    patente: string;
    tipo: string;
    capacidad_asientos: number;
    estado?: string;
    pisos?: number;
    layout?: PisoLayout[];
  }): Promise<Vehiculo> {
    await this.init();
    const now = new Date().toISOString();
    const pisos = input.pisos === 2 ? 2 : 1;
    const capacidad = Number(input.capacidad_asientos);
    const layout =
      Array.isArray(input.layout) && input.layout.length > 0
        ? input.layout
        : generarLayoutDefecto(pisos, capacidad);

    const nuevo: Vehiculo = {
      id: uuidv4(),
      patente: input.patente.replace(/\s+/g, '').toUpperCase(),
      tipo: input.tipo.trim().toLowerCase(),
      capacidad_asientos: capacidad,
      estado: input.estado ? input.estado.trim().toLowerCase() : 'activo',
      pisos,
      layout,
      created_at: now,
      updated_at: now
    };

    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `INSERT INTO vehiculos (id, patente, tipo, capacidad_asientos, estado, pisos, layout)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, patente, tipo, capacidad_asientos, estado, pisos, layout, created_at, updated_at`,
        [
          nuevo.id,
          nuevo.patente,
          nuevo.tipo,
          nuevo.capacidad_asientos,
          nuevo.estado,
          nuevo.pisos,
          JSON.stringify(nuevo.layout)
        ]
      );
      return rows[0];
    }

    this.vehiculos.push(nuevo);
    this.saveLocalSnapshot();
    return nuevo;
  }

  public async updateVehiculo(
    id: string,
    updates: Partial<Pick<Vehiculo, 'patente' | 'tipo' | 'capacidad_asientos' | 'estado' | 'pisos' | 'layout'>>
  ): Promise<Vehiculo | null> {
    await this.init();
    const existing = await this.getVehiculoById(id);
    if (!existing) return null;

    const updated: Vehiculo = {
      ...existing,
      patente:
        updates.patente !== undefined
          ? updates.patente.replace(/\s+/g, '').toUpperCase()
          : existing.patente,
      tipo: updates.tipo !== undefined ? updates.tipo.trim().toLowerCase() : existing.tipo,
      capacidad_asientos:
        updates.capacidad_asientos !== undefined
          ? Number(updates.capacidad_asientos)
          : existing.capacidad_asientos,
      estado: updates.estado !== undefined ? updates.estado.trim().toLowerCase() : existing.estado,
      pisos: updates.pisos !== undefined ? Number(updates.pisos) : existing.pisos,
      layout: updates.layout !== undefined ? updates.layout : existing.layout,
      updated_at: new Date().toISOString()
    };

    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(
        `UPDATE vehiculos
         SET patente = $2, tipo = $3, capacidad_asientos = $4, estado = $5, pisos = $6, layout = $7, updated_at = NOW()
         WHERE id = $1
         RETURNING id, patente, tipo, capacidad_asientos, estado, pisos, layout, created_at, updated_at`,
        [
          id,
          updated.patente,
          updated.tipo,
          updated.capacidad_asientos,
          updated.estado,
          updated.pisos,
          JSON.stringify(updated.layout)
        ]
      );
      return rows[0] || null;
    }

    const idx = this.vehiculos.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    this.vehiculos[idx] = updated;
    this.saveLocalSnapshot();
    return updated;
  }

  public async saveVehiculoLayout(
    id: string,
    pisos: number,
    layout: PisoLayout[]
  ): Promise<{ vehiculo: Vehiculo; total_asientos: number } | null> {
    const total_asientos = contarAsientosLayout(layout);
    const updated = await this.updateVehiculo(id, {
      pisos,
      layout,
      capacidad_asientos: total_asientos
    });
    if (!updated) return null;
    return { vehiculo: updated, total_asientos };
  }
}

export const store = new DataStore();
