export const palettes = [
  { id: 'terminal', name: 'Terminal', primary: '#174c43', dark: '#153e37', accent: '#d5e5bb', ink: '#203c2e' },
  { id: 'atlantic', name: 'Azul atlántico', primary: '#254f82', dark: '#1d304c', accent: '#c5def4', ink: '#203a59' },
  { id: 'terracotta', name: 'Terracota', primary: '#984d38', dark: '#492f2b', accent: '#f0d4b6', ink: '#553627' },
  { id: 'graphite', name: 'Grafito', primary: '#3e4653', dark: '#252a33', accent: '#e8d990', ink: '#343023' },
];
export const initialRoutes = [
  { id: '01', origin: 'Buenos Aires', destination: 'Mar del Plata', km: 415, price: 32500, active: true },
  { id: '02', origin: 'Buenos Aires', destination: 'Córdoba', km: 695, price: 48900, active: true },
  { id: '03', origin: 'Rosario', destination: 'Santa Fe', km: 170, price: 14800, active: true },
  { id: '04', origin: 'Buenos Aires', destination: 'Mendoza', km: 1050, price: 72500, active: true },
  { id: '05', origin: 'Córdoba', destination: 'Villa Carlos Paz', km: 36, price: 6500, active: false },
  { id: '06', origin: 'La Plata', destination: 'Mar del Plata', km: 370, price: 28900, active: true },
];
export const vehicles = [
  { id: '101', plate: 'AF 482 TR', model: 'Mercedes-Benz • Marcopolo G7', type: 'Semicama', seats: 44, active: true },
  { id: '102', plate: 'AG 193 EV', model: 'Scania • Comil Campione', type: 'Cama ejecutivo', seats: 40, active: true },
  { id: '103', plate: 'AE 706 RP', model: 'Volvo • Marcopolo Paradiso', type: 'Semicama', seats: 44, active: false },
  { id: '104', plate: 'AG 518 TM', model: 'Mercedes-Benz • Metalsur', type: 'Cama ejecutivo', seats: 40, active: true },
];
export const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
export const number = value => new Intl.NumberFormat('es-AR').format(value);
export function filterRoutes(routes, query, filter) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return routes.filter(r => normalize(`${r.origin} ${r.destination}`).includes(normalize(query.trim())) && (filter === 'all' || r.active === (filter === 'active')));
}
