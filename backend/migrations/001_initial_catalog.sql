-- EverTrip - Migración Inicial de Catálogo (EVE-3, EVE-7, EVE-11)
-- Compatible con PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Tabla de Rutas (EVE-3, EVE-4)
-- ==========================================
CREATE TABLE IF NOT EXISTS rutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origen VARCHAR(120) NOT NULL,
    destino VARCHAR(120) NOT NULL,
    distancia_km NUMERIC(8, 2) NOT NULL CHECK (distancia_km > 0),
    precio_base NUMERIC(12, 2) NOT NULL CHECK (precio_base >= 0),
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único parcial para evitar duplicados de origen+destino activos
CREATE UNIQUE INDEX IF NOT EXISTS idx_rutas_origen_destino_activa
    ON rutas (LOWER(TRIM(origen)), LOWER(TRIM(destino)))
    WHERE activa = true;

-- ==========================================
-- 2. Tabla de Vehículos y Layout (EVE-7, EVE-8, EVE-11, EVE-12)
-- ==========================================
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patente VARCHAR(20) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL,
    capacidad_asientos INT NOT NULL CHECK (capacidad_asientos > 0),
    estado VARCHAR(30) NOT NULL DEFAULT 'activo',
    pisos INT NOT NULL DEFAULT 1 CHECK (pisos IN (1, 2)),
    layout JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON vehiculos (estado);
CREATE INDEX IF NOT EXISTS idx_vehiculos_tipo ON vehiculos (tipo);

-- ==========================================
-- 3. Datos Semilla (Argentina)
-- ==========================================
INSERT INTO rutas (id, origen, destino, distancia_km, precio_base, activa)
VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Buenos Aires', 'Rosario', 304, 15000.00, true),
    ('a1b2c3d4-58cc-4372-a567-0e02b2c3d480', 'Buenos Aires', 'Mar del Plata', 404, 20000.00, true),
    ('b2c3d4e5-58cc-4372-a567-0e02b2c3d481', 'Córdoba', 'Mendoza', 670, 32500.00, true),
    ('c3d4e5f6-58cc-4372-a567-0e02b2c3d482', 'San Carlos de Bariloche', 'Neuquén', 435, 28000.00, true),
    ('d4e5f6a7-58cc-4372-a567-0e02b2c3d483', 'Rosario', 'Córdoba', 402, 18500.00, true),
    ('e5f6a7b8-58cc-4372-a567-0e02b2c3d484', 'Mendoza', 'San Juan', 168, 12000.00, true)
ON CONFLICT (id) DO NOTHING;
