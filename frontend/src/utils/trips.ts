import type { Viaje } from '../services/api';

const argentinaDateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
export function formatTripDate(value: string): string { return argentinaDateTime.format(new Date(value)); }

const argentinaTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const argentinaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
});
export function formatTripTime(value: string): string { return argentinaTime.format(new Date(value)); }
export function getArgentinaDay(value: string | Date = new Date()): string {
  const parts = argentinaDay.formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function searchDepartures(trips: Viaje[], query: string): Viaje[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f\s]/g, '').toLocaleLowerCase('es-AR');
  const search = normalize(query.trim());
  return trips.filter(trip => normalize(`${trip.ruta.origen} ${trip.ruta.destino} ${trip.vehiculo.patente} ${trip.id}`).includes(search));
}

// The operation uses Argentine wall time even when the device is in another timezone.
export function toArgentinaTimestamp(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}:00-03:00`);
  if (!Number.isFinite(timestamp) || new Date(timestamp - 3 * 3600000).toISOString().slice(0,16) !== value) return null;
  return `${value}:00-03:00`;
}
