import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { store, contarAsientosLayout, PisoLayout } from './db/store';
import { ESTADOS_VIAJE, isUuid, validDay, validTimestamp, ViajeError } from './viajes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Helper de respuesta estándar
function sendSuccess(res: Response, data: unknown, status = 200, meta?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    success: true,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}

// ==========================================
// Health Check
// ==========================================
app.get('/v1/health', async (_req: Request, res: Response) => {
  await store.init();
  return sendSuccess(res, {
    status: 'ok',
    service: 'evertrip-backend',
    storage_mode: store.getEngineMode(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MÓDULO 2: RUTAS (EVE-3, EVE-4)
// ==========================================

// GET /v1/rutas
app.get('/v1/rutas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const origen = typeof req.query.origen === 'string' ? req.query.origen : undefined;
    const destino = typeof req.query.destino === 'string' ? req.query.destino : undefined;
    let activa: boolean | undefined = true;
    if (req.query.activa !== undefined) {
      const rawActiva = String(req.query.activa).toLowerCase();
      if (rawActiva === 'all' || rawActiva === 'todas') {
        activa = undefined;
      } else {
        activa = rawActiva === 'true' || rawActiva === '1';
      }
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const per_page = req.query.per_page ? Number(req.query.per_page) : 20;

    const result = await store.listRutas({ origen, destino, activa, page, per_page });
    return sendSuccess(res, result.items, 200, {
      page: result.page,
      per_page: result.per_page,
      total: result.total
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/rutas/:id
app.get('/v1/rutas/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ruta = await store.getRutaById(req.params.id);
    if (!ruta) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'La ruta solicitada no existe.');
    }
    return sendSuccess(res, ruta);
  } catch (err) {
    next(err);
  }
});

// POST /v1/rutas
app.post('/v1/rutas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { origen, destino, distancia_km, precio_base } = req.body || {};
    const errors: Record<string, string> = {};

    if (!origen || typeof origen !== 'string' || origen.trim().length < 2) {
      errors.origen = 'La ciudad de origen es obligatoria (mínimo 2 caracteres).';
    }
    if (!destino || typeof destino !== 'string' || destino.trim().length < 2) {
      errors.destino = 'La ciudad de destino es obligatoria (mínimo 2 caracteres).';
    }
    if (
      origen &&
      destino &&
      typeof origen === 'string' &&
      typeof destino === 'string' &&
      origen.trim().toLowerCase() === destino.trim().toLowerCase()
    ) {
      errors.destino = 'El destino no puede ser igual al origen.';
    }

    const dist = Number(distancia_km);
    if (distancia_km === undefined || distancia_km === null || Number.isNaN(dist) || dist <= 0) {
      errors.distancia_km = 'La distancia en km debe ser un número mayor a 0.';
    }

    const precio = Number(precio_base);
    if (precio_base === undefined || precio_base === null || Number.isNaN(precio) || precio <= 0) {
      errors.precio_base = 'El precio base debe ser un número mayor a 0.';
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'Campos faltantes o inválidos al crear la ruta.', errors);
    }

    const duplicate = await store.findDuplicateRuta(origen, destino);
    if (duplicate) {
      return sendError(res, 409, 'DUPLICATE_ROUTE', 'Ya existe una ruta activa con ese origen y destino.', {
        existing_id: duplicate.id
      });
    }

    const nuevaRuta = await store.createRuta({
      origen,
      destino,
      distancia_km: dist,
      precio_base: precio
    });

    return sendSuccess(res, nuevaRuta, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /v1/rutas/:id
app.put('/v1/rutas/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await store.getRutaById(id);
    if (!existing) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'La ruta solicitada no existe.');
    }

    const { origen, destino, distancia_km, precio_base, activa } = req.body || {};
    const errors: Record<string, string> = {};

    const nextOrigen = origen !== undefined ? String(origen).trim() : existing.origen;
    const nextDestino = destino !== undefined ? String(destino).trim() : existing.destino;

    if (nextOrigen.length < 2) {
      errors.origen = 'La ciudad de origen debe tener al menos 2 caracteres.';
    }
    if (nextDestino.length < 2) {
      errors.destino = 'La ciudad de destino debe tener al menos 2 caracteres.';
    }
    if (nextOrigen.toLowerCase() === nextDestino.toLowerCase()) {
      errors.destino = 'El destino no puede ser igual al origen.';
    }

    if (distancia_km !== undefined && (Number.isNaN(Number(distancia_km)) || Number(distancia_km) <= 0)) {
      errors.distancia_km = 'La distancia en km debe ser mayor a 0.';
    }
    if (precio_base !== undefined && (Number.isNaN(Number(precio_base)) || Number(precio_base) <= 0)) {
      errors.precio_base = 'El precio base debe ser mayor a 0.';
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'Datos inválidos para actualizar la ruta.', errors);
    }

    const duplicate = await store.findDuplicateRuta(nextOrigen, nextDestino, id);
    if (duplicate) {
      return sendError(res, 409, 'DUPLICATE_ROUTE', 'Ya existe otra ruta activa con ese origen y destino.', {
        existing_id: duplicate.id
      });
    }

    const updated = await store.updateRuta(id, {
      origen: nextOrigen,
      destino: nextDestino,
      distancia_km: distancia_km !== undefined ? Number(distancia_km) : undefined,
      precio_base: precio_base !== undefined ? Number(precio_base) : undefined,
      activa: activa !== undefined ? Boolean(activa) : undefined
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/rutas/:id (Soft-delete: activa = false)
app.delete('/v1/rutas/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await store.getRutaById(id);
    if (!existing) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'La ruta solicitada no existe.');
    }

    const updated = await store.updateRuta(id, { activa: false });
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// MÓDULO 3: VEHÍCULOS Y LAYOUT (EVE-7, EVE-8, EVE-11, EVE-12)
// ==========================================

// GET /v1/vehiculos
app.get('/v1/vehiculos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
    const vehiculos = await store.listVehiculos({ estado, tipo });
    return sendSuccess(res, vehiculos, 200, { total: vehiculos.length });
  } catch (err) {
    next(err);
  }
});

// GET /v1/vehiculos/:id
app.get('/v1/vehiculos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehiculo = await store.getVehiculoById(req.params.id);
    if (!vehiculo) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }
    return sendSuccess(res, vehiculo);
  } catch (err) {
    next(err);
  }
});

// POST /v1/vehiculos
app.post('/v1/vehiculos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patente, tipo, capacidad_asientos, estado, pisos, layout } = req.body || {};
    const errors: Record<string, string> = {};

    if (!patente || typeof patente !== 'string' || patente.replace(/\s+/g, '').length < 5) {
      errors.patente = 'La patente es obligatoria y debe tener al menos 5 caracteres (ej. AB123CD).';
    }
    if (!tipo || typeof tipo !== 'string' || tipo.trim().length === 0) {
      errors.tipo = 'El tipo de vehículo es obligatorio (ej. semicama, cama_ejecutivo, suite_primera).';
    }

    const cap = Number(capacidad_asientos);
    if (capacidad_asientos === undefined || Number.isNaN(cap) || cap <= 0 || cap > 90) {
      errors.capacidad_asientos = 'La capacidad de asientos debe ser un número entre 1 y 90.';
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'Campos faltantes o inválidos al registrar vehículo.', errors);
    }

    const dup = await store.findVehiculoByPatente(patente);
    if (dup) {
      return sendError(res, 409, 'DUPLICATE_VEHICLE', 'Ya existe un vehículo registrado con esa patente.', {
        existing_id: dup.id
      });
    }

    const nuevo = await store.createVehiculo({
      patente,
      tipo,
      capacidad_asientos: cap,
      estado,
      pisos: pisos ? Number(pisos) : 1,
      layout
    });

    return sendSuccess(res, nuevo, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /v1/vehiculos/:id
app.put('/v1/vehiculos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await store.getVehiculoById(id);
    if (!existing) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }

    const { patente, tipo, capacidad_asientos, estado, pisos, layout } = req.body || {};
    const errors: Record<string, string> = {};

    if (patente !== undefined) {
      if (typeof patente !== 'string' || patente.replace(/\s+/g, '').length < 5) {
        errors.patente = 'La patente debe tener al menos 5 caracteres.';
      } else {
        const dup = await store.findVehiculoByPatente(patente, id);
        if (dup) {
          return sendError(res, 409, 'DUPLICATE_VEHICLE', 'Ya existe otro vehículo con esa patente.', {
            existing_id: dup.id
          });
        }
      }
    }

    if (capacidad_asientos !== undefined && (Number.isNaN(Number(capacidad_asientos)) || Number(capacidad_asientos) <= 0)) {
      errors.capacidad_asientos = 'La capacidad de asientos debe ser mayor a 0.';
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'Datos inválidos al actualizar el vehículo.', errors);
    }

    const updated = await store.updateVehiculo(id, {
      patente,
      tipo,
      capacidad_asientos: capacidad_asientos !== undefined ? Number(capacidad_asientos) : undefined,
      estado,
      pisos: pisos !== undefined ? Number(pisos) : undefined,
      layout
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/vehiculos/:id (Baja lógica: estado = 'inactivo')
app.delete('/v1/vehiculos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await store.getVehiculoById(id);
    if (!existing) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }

    const updated = await store.updateVehiculo(id, { estado: 'inactivo' });
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// GET /v1/vehiculos/:id/layout (EVE-11, EVE-12)
app.get('/v1/vehiculos/:id/layout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehiculo = await store.getVehiculoById(req.params.id);
    if (!vehiculo) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }

    return sendSuccess(res, {
      vehiculo_id: vehiculo.id,
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      pisos: vehiculo.pisos,
      total_asientos: contarAsientosLayout(vehiculo.layout),
      layout: vehiculo.layout
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/vehiculos/:id/layout (EVE-11, EVE-12)
app.post('/v1/vehiculos/:id/layout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await store.getVehiculoById(id);
    if (!existing) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }

    const { pisos, layout } = req.body || {};
    const numPisos = Number(pisos);

    if (![1, 2].includes(numPisos)) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'El número de pisos debe ser 1 o 2.', {
        pisos: 'Debe ser 1 o 2'
      });
    }

    if (!Array.isArray(layout) || layout.length === 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'El layout debe ser una lista no vacía de pisos.', {
        layout: 'Se requiere al menos un piso configurado'
      });
    }

    const sanitizedLayout: PisoLayout[] = layout.map((p: PisoLayout, idx: number) => ({
      piso: Number(p.piso) || idx + 1,
      filas: Array.isArray(p.filas)
        ? p.filas.map((f, fIdx) => ({
            fila: Number(f.fila) || fIdx + 1,
            asientos: Array.isArray(f.asientos)
              ? f.asientos.map((a) => (a && String(a).trim().length > 0 ? String(a).trim() : null))
              : []
          }))
        : []
    }));

    const totalAsientos = contarAsientosLayout(sanitizedLayout);
    if (totalAsientos <= 0) {
      return sendError(res, 422, 'VALIDATION_ERROR', 'El layout debe contener al menos 1 asiento habilitado.', {
        total_asientos: '0 asientos detectados'
      });
    }

    const saved = await store.saveVehiculoLayout(id, numPisos, sanitizedLayout);
    if (!saved) {
      return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'El vehículo solicitado no existe.');
    }

    return sendSuccess(res, {
      vehiculo_id: id,
      total_asientos: saved.total_asientos,
      layout_guardado: true,
      pisos: saved.vehiculo.pisos,
      layout: saved.vehiculo.layout
    });
  } catch (err) {
    next(err);
  }
});

// Programación de viajes (EVE-20, EVE-21)
app.post('/v1/viajes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ruta_id, vehiculo_id, fecha_salida, fecha_llegada, precio_override } = req.body || {};
    const errors: Record<string, string> = {};
    if (!isUuid(ruta_id)) errors.ruta_id = 'Seleccioná una ruta válida.';
    if (!isUuid(vehiculo_id)) errors.vehiculo_id = 'Seleccioná una unidad válida.';
    if (!validTimestamp(fecha_salida)) errors.fecha_salida = 'Ingresá una salida ISO válida con zona horaria.';
    if (!validTimestamp(fecha_llegada)) errors.fecha_llegada = 'Ingresá una llegada ISO válida con zona horaria.';
    if (validTimestamp(fecha_salida) && validTimestamp(fecha_llegada) && Date.parse(fecha_llegada) <= Date.parse(fecha_salida)) {
      errors.fecha_llegada = 'La llegada debe ser posterior a la salida.';
    }
    if (precio_override !== undefined && precio_override !== null &&
      (typeof precio_override !== 'number' || !Number.isFinite(precio_override) || precio_override < 0.01 || precio_override > 9999999999.99 || Math.abs(precio_override * 100 - Math.round(precio_override * 100)) > 0.000001)) {
      errors.precio_override = 'La tarifa debe ser positiva, con hasta dos decimales.';
    }
    if (Object.keys(errors).length) return sendError(res, 422, 'VALIDATION_ERROR', 'Revisá los datos del viaje.', errors);
    const viaje = await store.createViaje({ ruta_id, vehiculo_id, fecha_salida, fecha_llegada, precio_override });
    return sendSuccess(res, viaje, 201);
  } catch (err) { next(err); }
});

app.get('/v1/viajes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fecha_desde, fecha_hasta, ruta_id, estado } = req.query;
    const errors: Record<string, string> = {};
    if (fecha_desde !== undefined && !validDay(fecha_desde)) errors.fecha_desde = 'Usá una fecha válida YYYY-MM-DD.';
    if (fecha_hasta !== undefined && !validDay(fecha_hasta)) errors.fecha_hasta = 'Usá una fecha válida YYYY-MM-DD.';
    if (validDay(fecha_desde) && validDay(fecha_hasta) && fecha_hasta < fecha_desde) errors.fecha_hasta = 'El fin del período no puede ser anterior al inicio.';
    if (ruta_id !== undefined && !isUuid(ruta_id)) errors.ruta_id = 'La ruta no es válida.';
    if (estado !== undefined && (typeof estado !== 'string' || !ESTADOS_VIAJE.includes(estado as typeof ESTADOS_VIAJE[number]))) errors.estado = 'El estado no es válido.';
    if (Object.keys(errors).length) return sendError(res, 422, 'VALIDATION_ERROR', 'Revisá los filtros de viajes.', errors);
    const items = await store.listViajes({
      desde: fecha_desde ? `${fecha_desde}T00:00:00-03:00` : undefined,
      hasta: fecha_hasta ? new Date(Date.parse(`${fecha_hasta}T00:00:00-03:00`) + 86400000).toISOString() : undefined,
      ruta_id: ruta_id as string | undefined, estado: estado as string | undefined
    });
    return sendSuccess(res, items, 200, { total: items.length });
  } catch (err) { next(err); }
});

// Middleware 404 y Error Global
app.use((_req: Request, res: Response) => {
  return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Endpoint no encontrado en EverTrip API v1.');
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ViajeError) return sendError(res, err.status, err.code, err.message);
  console.error('[EverTrip API Error]:', err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
});
