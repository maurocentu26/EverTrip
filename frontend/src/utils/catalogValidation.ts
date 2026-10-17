import type { RutaInput, VehiculoInput } from '../services/api';

export function validateRuta(input: RutaInput): string | null {
  if (!input.origen.trim() || !input.destino.trim() || input.origen.trim().toLocaleLowerCase() === input.destino.trim().toLocaleLowerCase()) {
    return 'Ingresá un origen y un destino diferentes.';
  }
  if (!Number.isFinite(input.distancia_km) || input.distancia_km <= 0 || !Number.isFinite(input.precio_base) || input.precio_base <= 0) {
    return 'La distancia y la tarifa deben ser mayores a cero.';
  }
  return null;
}

export function validateVehiculo(input: VehiculoInput): string | null {
  if (input.patente.length < 6 || input.patente.length > 7) return 'Ingresá una patente válida: AB123CD o ABC123.';
  if (!Number.isInteger(input.capacidad_asientos) || input.capacidad_asientos < 8 || input.capacidad_asientos > 90) {
    return 'La capacidad debe ser un número entero entre 8 y 90 asientos.';
  }
  return null;
}
