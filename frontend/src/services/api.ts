// ============================================================================
// EverTrip — API Client & Synchronized Local Store (Rutas, Flota, Layouts)
// Connects to /v1/rutas and /v1/vehiculos with transparent local fallback
// ============================================================================

export interface Ruta {
  id: string;
  origen: string;
  destino: string;
  distancia_km: number;
  precio_base: number;
  activa: boolean;
  created_at?: string;
}

export interface RutaInput {
  origen: string;
  destino: string;
  distancia_km: number;
  precio_base: number;
  activa?: boolean;
}

export type TipoServicioVehiculo = 'semicama' | 'cama_ejecutivo' | 'suite_primera';
export type EstadoVehiculo = 'activo' | 'mantenimiento' | 'inactivo';

export interface FilaLayout {
  fila: number;
  /** 4 slots per row: [leftWindow, leftAisle, rightAisle, rightWindow]. Empty string "" means aisle/empty slot */
  asientos: string[];
}

export interface PisoLayout {
  piso: 1 | 2;
  filas: FilaLayout[];
}

export interface VehiculoLayoutPayload {
  pisos: 1 | 2;
  layout: PisoLayout[];
}

export interface Vehiculo {
  id: string;
  patente: string;
  tipo: string; // 'semicama' | 'cama' | 'cama_ejecutivo' | 'suite_primera'
  capacidad_asientos: number;
  estado: EstadoVehiculo;
  interno?: string;
  marca_modelo?: string;
  pisos?: 1 | 2;
  layout_configurado?: boolean;
  layout_data?: VehiculoLayoutPayload;
}

export interface VehiculoInput {
  patente: string;
  tipo: string;
  capacidad_asientos: number;
  estado?: EstadoVehiculo;
  interno?: string;
  marca_modelo?: string;
  pisos?: 1 | 2;
}

export interface Viaje {
  id: string; ruta_id: string; vehiculo_id: string;
  fecha_salida: string; fecha_llegada: string; precio: number;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
  ruta: { origen: string; destino: string };
  vehiculo: { patente: string; tipo: string };
  asientos_totales: number; created_at: string;
}
export interface ViajeInput {
  ruta_id: string; vehiculo_id: string; fecha_salida: string; fecha_llegada: string;
  precio_override?: number | null;
}
export interface ViajeFilters { fecha_desde?: string; fecha_hasta?: string; ruta_id?: string; estado?: string; }

export async function getViajes(filters: ViajeFilters = {}): Promise<Viaje[]> {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(filters)) if (value) params.set(key,value);
  try { return await requestApi<Viaje[]>(`/viajes?${params}`); }
  catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(503, 'CONNECTION_ERROR', 'No se pudieron consultar los viajes. Revisá la conexión e intentá nuevamente.');
  }
}

export async function createViaje(input: ViajeInput): Promise<Viaje> {
  try { return await requestApi<Viaje>('/viajes', { method: 'POST', body: JSON.stringify(input) }); }
  catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(503, 'CONNECTION_ERROR', 'No se pudo confirmar el alta. Actualizá los viajes antes de reintentar para comprobar si se guardó.');
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const STORAGE_KEYS = {
  RUTAS: 'evertrip_rutas_v1',
  VEHICULOS: 'evertrip_vehiculos_v1',
};

// Helper to build standard 4-column bus floor rows
export function buildStandardFloor(
  piso: 1 | 2,
  rowCount: number,
  prefix: string = piso === 2 ? 'P' : ''
): PisoLayout {
  const filas: FilaLayout[] = [];
  for (let r = 1; r <= rowCount; r++) {
    filas.push({
      fila: r,
      asientos: [
        `${prefix}${r}A`,
        `${prefix}${r}B`,
        `${prefix}${r}C`,
        `${prefix}${r}D`,
      ],
    });
  }
  return { piso, filas };
}

export const LAYOUT_TEMPLATES: Record<
  string,
  {
    id: string;
    nombre: string;
    subtitulo: string;
    butacas: number;
    pisos: 1 | 2;
    tipo_sugerido: string;
    build: () => VehiculoLayoutPayload;
  }
> = {
  semicama_doble_44: {
    id: 'semicama_doble_44',
    nombre: 'Semicama Doble Piso - 44 butacas',
    subtitulo: 'Piso 1 (3 filas / 12 pax) + Piso 2 (8 filas / 32 pax)',
    butacas: 44,
    pisos: 2,
    tipo_sugerido: 'semicama',
    build: () => ({
      pisos: 2,
      layout: [buildStandardFloor(1, 3, ''), buildStandardFloor(2, 8, 'P')],
    }),
  },
  cama_ejecutivo_32: {
    id: 'cama_ejecutivo_32',
    nombre: 'Cama Ejecutivo - 32 butacas',
    subtitulo: 'Doble Piso Confort: Piso 1 (3 filas, 3x1) + Piso 2 (6 filas)',
    butacas: 32,
    pisos: 2,
    tipo_sugerido: 'cama_ejecutivo',
    build: () => ({
      pisos: 2,
      layout: [
        {
          piso: 1,
          filas: [
            { fila: 1, asientos: ['1A', '1B', '', '1C'] },
            { fila: 2, asientos: ['2A', '2B', '', '2C'] },
            { fila: 3, asientos: ['3A', '3B', '', '3C'] },
          ],
        },
        {
          piso: 2,
          filas: [
            { fila: 1, asientos: ['P1A', 'P1B', 'P1C', 'P1D'] },
            { fila: 2, asientos: ['P2A', 'P2B', 'P2C', 'P2D'] },
            { fila: 3, asientos: ['P3A', 'P3B', 'P3C', 'P3D'] },
            { fila: 4, asientos: ['P4A', 'P4B', 'P4C', 'P4D'] },
            { fila: 5, asientos: ['P5A', 'P5B', 'P5C', 'P5D'] },
            { fila: 6, asientos: ['P6A', '', 'P6C', 'P6D'] },
          ],
        },
      ],
    }),
  },
  unidad_simple_36: {
    id: 'unidad_simple_36',
    nombre: 'Unidad Simple - 36 butacas',
    subtitulo: 'Piso Único de 9 filas estándar (2+2 con pasillo central)',
    butacas: 36,
    pisos: 1,
    tipo_sugerido: 'semicama',
    build: () => ({
      pisos: 1,
      layout: [buildStandardFloor(1, 9, '')],
    }),
  },
};

const INITIAL_RUTAS: Ruta[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    origen: 'Buenos Aires (Retiro)',
    destino: 'Rosario (Terminal Mariano Moreno)',
    distancia_km: 304,
    precio_base: 24500,
    activa: true,
    created_at: '2026-09-12T10:00:00Z',
  },
  {
    id: 'c81d4e2e-bcf2-11e6-869b-7df92533d2db',
    origen: 'Buenos Aires (Retiro)',
    destino: 'Mar del Plata',
    distancia_km: 404,
    precio_base: 34800,
    activa: true,
    created_at: '2026-09-14T14:30:00Z',
  },
  {
    id: 'a92e5f1a-31c4-4821-9b12-6e11d8a92c01',
    origen: 'Buenos Aires (Retiro)',
    destino: 'Córdoba Capital',
    distancia_km: 702,
    precio_base: 52000,
    activa: true,
    created_at: '2026-09-18T08:15:00Z',
  },
  {
    id: 'b73f1c8d-92a1-4c3e-8d44-1f90c2b3e411',
    origen: 'Rosario (Terminal Mariano Moreno)',
    destino: 'Córdoba Capital',
    distancia_km: 401,
    precio_base: 31200,
    activa: true,
    created_at: '2026-09-20T11:45:00Z',
  },
  {
    id: 'd14a9b2c-67e8-4f10-9a23-8c72e1f04b99',
    origen: 'Córdoba Capital',
    destino: 'Mendoza (Terminal del Sol)',
    distancia_km: 618,
    precio_base: 48500,
    activa: true,
    created_at: '2026-09-22T16:20:00Z',
  },
  {
    id: 'e55b8c3d-19f2-4a88-b311-9d81a2c3f522',
    origen: 'Buenos Aires (Liniers)',
    destino: 'San Carlos de Bariloche',
    distancia_km: 1580,
    precio_base: 118000,
    activa: true,
    created_at: '2026-09-25T09:00:00Z',
  },
  {
    id: '791c2d4e-81b3-4e92-a700-3c41b5d6e789',
    origen: 'Mar del Plata',
    destino: 'Bahía Blanca',
    distancia_km: 462,
    precio_base: 36000,
    activa: false,
    created_at: '2026-08-10T12:00:00Z',
  },
];

const INITIAL_VEHICULOS: Vehiculo[] = [
  {
    id: 'veh-101-marcopolo',
    patente: 'AG482KM',
    tipo: 'semicama',
    capacidad_asientos: 44,
    estado: 'activo',
    interno: 'INT-104',
    marca_modelo: 'Marcopolo Paradiso G8 1800 DD',
    pisos: 2,
    layout_configurado: true,
    layout_data: LAYOUT_TEMPLATES.semicama_doble_44.build(),
  },
  {
    id: 'veh-102-scania',
    patente: 'AF910LP',
    tipo: 'cama_ejecutivo',
    capacidad_asientos: 32,
    estado: 'activo',
    interno: 'INT-208',
    marca_modelo: 'Scania K440EB / Busscar Vissta Buss DD',
    pisos: 2,
    layout_configurado: true,
    layout_data: LAYOUT_TEMPLATES.cama_ejecutivo_32.build(),
  },
  {
    id: 'veh-103-volvo',
    patente: 'AE305TR',
    tipo: 'suite_primera',
    capacidad_asientos: 28,
    estado: 'activo',
    interno: 'INT-301',
    marca_modelo: 'Volvo B450R 6x2 / Niccolo Concept',
    pisos: 2,
    layout_configurado: false,
  },
  {
    id: 'veh-104-mercedes',
    patente: 'AD729ZX',
    tipo: 'semicama',
    capacidad_asientos: 36,
    estado: 'mantenimiento',
    interno: 'INT-112',
    marca_modelo: 'Mercedes-Benz O500RS / Metalsur Starbus',
    pisos: 1,
    layout_configurado: true,
    layout_data: LAYOUT_TEMPLATES.unidad_simple_36.build(),
  },
  {
    id: 'veh-105-scania',
    patente: 'AA841QW',
    tipo: 'cama_ejecutivo',
    capacidad_asientos: 44,
    estado: 'inactivo',
    interno: 'INT-119',
    marca_modelo: 'Scania K400 / Marcopolo G7 1800 DD',
    pisos: 2,
    layout_configurado: false,
  },
];

function loadLocalRutas(): Ruta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RUTAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RUTAS, JSON.stringify(INITIAL_RUTAS));
      return [...INITIAL_RUTAS];
    }
    return JSON.parse(raw) as Ruta[];
  } catch {
    return [...INITIAL_RUTAS];
  }
}

function saveLocalRutas(rutas: Ruta[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RUTAS, JSON.stringify(rutas));
  } catch {
    // ignore storage quota errors
  }
}

function loadLocalVehiculos(): Vehiculo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VEHICULOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(INITIAL_VEHICULOS));
      return [...INITIAL_VEHICULOS];
    }
    return JSON.parse(raw) as Vehiculo[];
  } catch {
    return [...INITIAL_VEHICULOS];
  }
}

function saveLocalVehiculos(vehiculos: Vehiculo[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VEHICULOS, JSON.stringify(vehiculos));
  } catch {
    // ignore storage quota errors
  }
}

export function normalizePatente(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function formatPatenteMercosur(raw: string): string {
  const clean = normalizePatente(raw);
  if (clean.length === 7) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)}`;
  }
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`;
  }
  return clean;
}

export function countActiveSeatsInLayout(payload?: VehiculoLayoutPayload): number {
  if (!payload || !payload.layout) return 0;
  let total = 0;
  for (const piso of payload.layout) {
    for (const fila of piso.filas) {
      for (const s of fila.asientos) {
        if (s && s.trim() !== '') total++;
      }
    }
  }
  return total;
}

// Connection state tracker so the UI can display live API vs Synchronized Local Engine badge
type ConnectionSource = 'api' | 'local_sync';
let lastConnectionSource: ConnectionSource = 'local_sync';
const listeners = new Set<(source: ConnectionSource) => void>();

function setConnectionSource(source: ConnectionSource) {
  if (lastConnectionSource !== source) {
    lastConnectionSource = source;
    listeners.forEach((cb) => cb(source));
  }
}

export function getConnectionSource(): ConnectionSource {
  return lastConnectionSource;
}

export function subscribeConnectionSource(cb: (source: ConnectionSource) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function requestApi<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);

  try {
    const res = await fetch(`/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('NON_JSON_RESPONSE');
    }

    const body = await res.json();

    if (!res.ok || body.success === false) {
      const code = body?.error?.code || (res.status === 409 ? 'CONFLICT' : 'API_ERROR');
      const message = body?.error?.message || `Error HTTP ${res.status}`;
      throw new ApiError(res.status, code, message, body?.error?.details);
    }

    setConnectionSource('api');
    return body.data as T;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ApiError) {
      setConnectionSource('api');
      throw err;
    }
    throw err;
  }
}

// ============================================================================
// MÓDULO 1: RUTAS (/v1/rutas)
// ============================================================================

export async function getRutas(filters?: { origen?: string; destino?: string }): Promise<Ruta[]> {
  try {
    const params = new URLSearchParams();
    params.set('activa', 'all');
    if (filters?.origen) params.set('origen', filters.origen);
    if (filters?.destino) params.set('destino', filters.destino);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const remoteRutas = await requestApi<Ruta[]>(`/rutas${qs}`);
    if (Array.isArray(remoteRutas)) {
      saveLocalRutas(remoteRutas);
      return remoteRutas;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }

  let local = loadLocalRutas();
  if (filters?.origen) {
    const q = filters.origen.toLowerCase();
    local = local.filter((r) => r.origen.toLowerCase().includes(q));
  }
  if (filters?.destino) {
    const q = filters.destino.toLowerCase();
    local = local.filter((r) => r.destino.toLowerCase().includes(q));
  }
  return local;
}

export async function createRuta(input: RutaInput): Promise<Ruta> {
  const cleanOrigen = input.origen.trim();
  const cleanDestino = input.destino.trim();

  try {
    const created = await requestApi<Ruta>('/rutas', {
      method: 'POST',
      body: JSON.stringify({
        origen: cleanOrigen,
        destino: cleanDestino,
        distancia_km: Number(input.distancia_km),
        precio_base: Number(input.precio_base),
      }),
    });
    const current = loadLocalRutas();
    saveLocalRutas([created, ...current.filter((r) => r.id !== created.id)]);
    return created;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }

  // Local fallback with strict 409 DUPLICATE_ROUTE validation
  const current = loadLocalRutas();
  const duplicate = current.find(
    (r) =>
      r.origen.trim().toLowerCase() === cleanOrigen.toLowerCase() &&
      r.destino.trim().toLowerCase() === cleanDestino.toLowerCase()
  );

  if (duplicate) {
    throw new ApiError(
      409,
      'DUPLICATE_ROUTE',
      `Ya existe una ruta registrada con origen "${cleanOrigen}" y destino "${cleanDestino}".`
    );
  }

  const newRuta: Ruta = {
    id: crypto.randomUUID ? crypto.randomUUID() : `ruta-${Date.now()}`,
    origen: cleanOrigen,
    destino: cleanDestino,
    distancia_km: Number(input.distancia_km),
    precio_base: Number(input.precio_base),
    activa: input.activa ?? true,
    created_at: new Date().toISOString(),
  };

  const updated = [newRuta, ...current];
  saveLocalRutas(updated);
  return newRuta;
}

export async function updateRuta(id: string, input: Partial<RutaInput>): Promise<Ruta> {
  try {
    const updatedRemote = await requestApi<Ruta>(`/rutas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    const current = loadLocalRutas();
    saveLocalRutas(current.map((r) => (r.id === id ? { ...r, ...updatedRemote } : r)));
    return updatedRemote;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }

  const current = loadLocalRutas();
  const existing = current.find((r) => r.id === id);
  if (!existing) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'La ruta solicitada no existe.');
  }

  const nextOrigen = (input.origen ?? existing.origen).trim();
  const nextDestino = (input.destino ?? existing.destino).trim();

  const duplicate = current.find(
    (r) =>
      r.id !== id &&
      r.origen.trim().toLowerCase() === nextOrigen.toLowerCase() &&
      r.destino.trim().toLowerCase() === nextDestino.toLowerCase()
  );

  if (duplicate) {
    throw new ApiError(
      409,
      'DUPLICATE_ROUTE',
      `Conflicto de traza: ya existe otra ruta entre "${nextOrigen}" y "${nextDestino}".`
    );
  }

  const updatedRuta: Ruta = {
    ...existing,
    ...input,
    origen: nextOrigen,
    destino: nextDestino,
    distancia_km: input.distancia_km !== undefined ? Number(input.distancia_km) : existing.distancia_km,
    precio_base: input.precio_base !== undefined ? Number(input.precio_base) : existing.precio_base,
  };

  saveLocalRutas(current.map((r) => (r.id === id ? updatedRuta : r)));
  return updatedRuta;
}

export async function toggleRutaActiva(id: string, activa: boolean): Promise<Ruta> {
  if (!activa) {
    try {
      await requestApi<unknown>(`/rutas/${id}`, {
        method: 'DELETE',
      });
      const current = loadLocalRutas();
      const target = current.find((r) => r.id === id);
      if (target) {
        const updated = { ...target, activa: false };
        saveLocalRutas(current.map((r) => (r.id === id ? updated : r)));
        return updated;
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      setConnectionSource('local_sync');
    }
  }
  return updateRuta(id, { activa });
}

// ============================================================================
// MÓDULO 2 & 3: VEHÍCULOS Y LAYOUT (/v1/vehiculos)
// ============================================================================

export async function getVehiculos(): Promise<Vehiculo[]> {
  const local = loadLocalVehiculos();
  try {
    const remote = await requestApi<Vehiculo[]>('/vehiculos');
    if (Array.isArray(remote)) {
      // Merge rich local metadata (layout_data, marca_modelo, interno) with remote records
      const merged = remote.map((rem) => {
        const match = local.find(
          (l) => l.id === rem.id || normalizePatente(l.patente) === normalizePatente(rem.patente)
        );
        return {
          ...match,
          ...rem,
          pisos: rem.pisos ?? match?.pisos ?? 2,
          layout_configurado: rem.layout_configurado ?? match?.layout_configurado ?? Boolean(match?.layout_data),
          layout_data: rem.layout_data ?? match?.layout_data,
          interno: rem.interno ?? match?.interno ?? `INT-${Math.floor(100 + Math.random() * 899)}`,
          marca_modelo: rem.marca_modelo ?? match?.marca_modelo ?? 'Chasis de Larga Distancia',
        };
      });
      saveLocalVehiculos(merged);
      return merged;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }
  return local;
}

export async function createVehiculo(input: VehiculoInput): Promise<Vehiculo> {
  const cleanPatente = normalizePatente(input.patente);

  try {
    const created = await requestApi<Vehiculo>('/vehiculos', {
      method: 'POST',
      body: JSON.stringify({
        patente: cleanPatente,
        tipo: input.tipo,
        capacidad_asientos: Number(input.capacidad_asientos),
        estado: input.estado || 'activo',
      }),
    });
    const current = loadLocalVehiculos();
    const enriched: Vehiculo = {
      ...created,
      patente: cleanPatente,
      estado: created.estado || input.estado || 'activo',
      interno: input.interno || `INT-${100 + current.length + 1}`,
      marca_modelo: input.marca_modelo || 'Marcopolo Paradiso G8 / Scania',
      pisos: input.pisos || 2,
      layout_configurado: false,
    };
    saveLocalVehiculos([enriched, ...current.filter((v) => v.id !== enriched.id)]);
    return enriched;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }

  const current = loadLocalVehiculos();
  const duplicate = current.find((v) => normalizePatente(v.patente) === cleanPatente);
  if (duplicate) {
    throw new ApiError(
      409,
      'CONFLICT',
      `Ya existe una unidad en flota registrada con el dominio ${formatPatenteMercosur(cleanPatente)}.`
    );
  }

  const nuevo: Vehiculo = {
    id: crypto.randomUUID ? crypto.randomUUID() : `veh-${Date.now()}`,
    patente: cleanPatente,
    tipo: input.tipo,
    capacidad_asientos: Number(input.capacidad_asientos),
    estado: input.estado || 'activo',
    interno: input.interno?.trim() || `INT-${105 + current.length}`,
    marca_modelo: input.marca_modelo?.trim() || 'Marcopolo Paradiso G8 1800 DD',
    pisos: input.pisos || 2,
    layout_configurado: false,
  };

  saveLocalVehiculos([nuevo, ...current]);
  return nuevo;
}

export async function updateVehiculo(id: string, input: Partial<VehiculoInput>): Promise<Vehiculo> {
  const current = loadLocalVehiculos();
  const existing = current.find((v) => v.id === id);
  if (!existing) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'La unidad solicitada no existe.');
  }

  const nextPatente = input.patente ? normalizePatente(input.patente) : existing.patente;
  const duplicate = current.find((v) => v.id !== id && normalizePatente(v.patente) === nextPatente);
  if (duplicate) {
    throw new ApiError(
      409,
      'CONFLICT',
      `Otra unidad de la flota ya utiliza la patente ${formatPatenteMercosur(nextPatente)}.`
    );
  }

  try {
    await requestApi<Vehiculo>(`/vehiculos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        patente: nextPatente,
        tipo: input.tipo ?? existing.tipo,
        capacidad_asientos:
          input.capacidad_asientos !== undefined
            ? Number(input.capacidad_asientos)
            : existing.capacidad_asientos,
        estado: input.estado ?? existing.estado,
      }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) throw err;
    setConnectionSource('local_sync');
  }

  const updated: Vehiculo = {
    ...existing,
    ...input,
    patente: nextPatente,
    capacidad_asientos:
      input.capacidad_asientos !== undefined
        ? Number(input.capacidad_asientos)
        : existing.capacidad_asientos,
  };

  saveLocalVehiculos(current.map((v) => (v.id === id ? updated : v)));
  return updated;
}

export interface SaveLayoutResponse {
  vehiculo_id: string;
  total_asientos: number;
  layout_guardado: boolean;
}

export async function saveVehiculoLayout(
  vehiculoId: string,
  payload: VehiculoLayoutPayload
): Promise<SaveLayoutResponse> {
  const totalSeats = countActiveSeatsInLayout(payload);

  // Format payload for API (filtering empty strings if backend expects only active seat codes, while keeping full matrix in local store)
  const apiPayload: VehiculoLayoutPayload = {
    pisos: payload.pisos,
    layout: payload.layout.map((p) => ({
      piso: p.piso,
      filas: p.filas.map((f) => ({
        fila: f.fila,
        asientos: f.asientos.filter((s) => s.trim() !== ''),
      })),
    })),
  };

  let apiResult: SaveLayoutResponse | null = null;
  try {
    apiResult = await requestApi<SaveLayoutResponse>(`/vehiculos/${vehiculoId}/layout`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    setConnectionSource('local_sync');
  }

  const current = loadLocalVehiculos();
  const updated = current.map((v) => {
    if (v.id !== vehiculoId) return v;
    return {
      ...v,
      pisos: payload.pisos,
      capacidad_asientos: totalSeats > 0 ? totalSeats : v.capacidad_asientos,
      layout_configurado: true,
      layout_data: payload,
    };
  });
  saveLocalVehiculos(updated);

  return (
    apiResult || {
      vehiculo_id: vehiculoId,
      total_asientos: totalSeats,
      layout_guardado: true,
    }
  );
}
