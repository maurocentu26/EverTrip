const arsCurrencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const arsDecimalFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  if (!Number.isFinite(amount)) return '$ 0';
  return arsCurrencyFormatter.format(amount);
}

export function formatARSDecimal(amount: number): string {
  if (!Number.isFinite(amount)) return '$ 0,00';
  return arsDecimalFormatter.format(amount);
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '0 km';
  return `${numberFormatter.format(km)} km`;
}

export function formatServiceTypeLabel(tipo: string): {
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
} {
  const normalized = tipo.toLowerCase();
  if (normalized.includes('suite') || normalized.includes('primera')) {
    return {
      label: 'Suite Primera Clase',
      shortLabel: 'Suite 1ª Clase',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      dotClass: 'bg-amber-400',
    };
  }
  if (normalized.includes('cama') && !normalized.includes('semi')) {
    return {
      label: 'Cama Ejecutivo',
      shortLabel: 'Cama Ejecutivo',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
      dotClass: 'bg-sky-400',
    };
  }
  return {
    label: 'Semicama',
    shortLabel: 'Semicama',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    dotClass: 'bg-emerald-400',
  };
}

export function formatEstadoVehiculoBadge(estado: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const normalized = estado.toLowerCase();
  if (normalized === 'activo') {
    return {
      label: 'Operativo en Red',
      badgeClass: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    };
  }
  if (normalized === 'mantenimiento') {
    return {
      label: 'En Taller / Mant.',
      badgeClass: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]',
    };
  }
  return {
    label: 'Fuera de Servicio',
    badgeClass: 'bg-slate-800/90 text-slate-400 border-slate-700/80',
    dotClass: 'bg-slate-500',
  };
}
