-- EVE-19: viaje y disponibilidad inicial de asientos, guardados en una transacción.
CREATE TABLE IF NOT EXISTS viajes (
    id UUID PRIMARY KEY,
    ruta_id UUID NOT NULL REFERENCES rutas(id),
    vehiculo_id UUID NOT NULL REFERENCES vehiculos(id),
    fecha_salida TIMESTAMPTZ NOT NULL,
    fecha_llegada TIMESTAMPTZ NOT NULL,
    precio NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    estado TEXT NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado','en_curso','finalizado','cancelado')),
    ruta JSONB NOT NULL,
    vehiculo JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (fecha_llegada > fecha_salida)
);
CREATE INDEX IF NOT EXISTS idx_viajes_salida ON viajes(fecha_salida);
CREATE INDEX IF NOT EXISTS idx_viajes_vehiculo_horario ON viajes(vehiculo_id, fecha_salida, fecha_llegada) WHERE estado <> 'cancelado';

CREATE TABLE IF NOT EXISTS asientos_viaje (
    viaje_id UUID NOT NULL REFERENCES viajes(id),
    numero TEXT NOT NULL,
    piso SMALLINT NOT NULL CHECK (piso IN (1,2)),
    estado TEXT NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre','ocupado','bloqueado_temp','bloqueado_admin')),
    PRIMARY KEY (viaje_id, numero)
);
