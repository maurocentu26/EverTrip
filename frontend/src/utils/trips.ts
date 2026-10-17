const argentinaDateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
export function formatTripDate(value: string): string { return argentinaDateTime.format(new Date(value)); }

// The operation uses Argentine wall time even when the device is in another timezone.
export function toArgentinaTimestamp(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}:00-03:00`);
  if (!Number.isFinite(timestamp) || new Date(timestamp - 3 * 3600000).toISOString().slice(0,16) !== value) return null;
  return `${value}:00-03:00`;
}
