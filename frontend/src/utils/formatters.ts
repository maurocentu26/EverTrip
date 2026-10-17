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
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-600',
    };
  }
  if (normalized.includes('cama') && !normalized.includes('semi')) {
    return {
      label: 'Cama Ejecutivo',
      shortLabel: 'Cama Ejecutivo',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-600',
    };
  }
  return {
    label: 'Semicama',
    shortLabel: 'Semicama',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-600',
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
      badgeClass: 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]',
      dotClass: 'bg-[#10B981]',
    };
  }
  if (normalized === 'mantenimiento') {
    return {
      label: 'En Taller / Mant.',
      badgeClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
      dotClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Fuera de Servicio',
    badgeClass: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
    dotClass: 'bg-slate-400',
  };
}
