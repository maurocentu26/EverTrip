export const ESTADOS_VIAJE = ['programado', 'en_curso', 'finalizado', 'cancelado'] as const;
export interface ViajeInput {
  ruta_id: string;
  vehiculo_id: string;
  fecha_salida: string;
  fecha_llegada: string;
  precio_override?: number | null;
}
export interface AsientoViaje { numero: string; piso: number; estado: 'libre'; }
export interface Viaje {
  id: string; ruta_id: string; vehiculo_id: string;
  fecha_salida: string; fecha_llegada: string; precio: number;
  estado: typeof ESTADOS_VIAJE[number];
  ruta: { origen: string; destino: string };
  vehiculo: { patente: string; tipo: string };
  asientos_totales: number; created_at: string;
}
export interface ViajeFilters { desde?: string; hasta?: string; ruta_id?: string; estado?: string; }
export class ViajeError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return validDay(value.slice(0,10)) && Number(value.slice(11,13)) < 24 && Number(value.slice(14,16)) < 60 && (!value.slice(16).startsWith(':') || Number(value.slice(17,19)) < 60) && Number.isFinite(Date.parse(value));
}
