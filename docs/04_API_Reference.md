# EverTrip API — Documentación de Referencia
> **Base URL:** `https://api.evertrip.app/v1`  
> **Autenticación:** Bearer Token (JWT) en header `Authorization: Bearer <token>`  
> **Content-Type:** `application/json`

---

## Convenciones Generales

### Formato de Respuesta
Todas las respuestas de la API siguen esta estructura:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

En caso de error:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El viaje solicitado no existe.",
    "details": {}
  }
}
```

### Roles y Permisos
| Rol | Descripción | Header requerido |
|---|---|---|
| `admin` | Acceso total | JWT con `role: admin` |
| `operador` | Ventas y operatoria diaria | JWT con `role: operador` |
| `chofer` | Solo check-in de viaje asignado | JWT con `role: chofer` |
| `pasajero` | Compra online (fase B2C) | JWT con `role: pasajero` |

---

## Módulo 1: Autenticación

### `POST /auth/login`
Autentica a un usuario del sistema (admin, operador, chofer).

**Request:**
```json
{
  "email": "mauro@evertrip.app",
  "password": "SuperSecreta123!"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid-del-usuario",
      "nombre": "Mauro García",
      "rol": "admin"
    }
  }
}
```

**Errores posibles:**
| Código HTTP | Error Code | Descripción |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Email o contraseña incorrectos |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiados intentos fallidos |

---

### `POST /auth/refresh`
Renueva el token de acceso usando el refresh token.

**Request:**
```json
{ "refresh_token": "dGhpcyBpcyBhIHJlZnJlc..." }
```

---

## Módulo 2: Rutas

### `GET /rutas`
Lista todas las rutas activas. Requiere rol: `operador`, `admin`.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| `origen` | string | Filtra por ciudad de origen |
| `destino` | string | Filtra por ciudad de destino |
| `page` | int | Número de página (default: 1) |
| `per_page` | int | Resultados por página (default: 20) |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "origen": "Buenos Aires",
      "destino": "Rosario",
      "distancia_km": 304,
      "precio_base": 15000.00,
      "activa": true
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 12 }
}
```

---

### `POST /rutas`
Crea una nueva ruta. Requiere rol: `admin`.

**Request:**
```json
{
  "origen": "Buenos Aires",
  "destino": "Mar del Plata",
  "distancia_km": 404,
  "precio_base": 20000.00
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "origen": "Buenos Aires",
    "destino": "Mar del Plata",
    "distancia_km": 404,
    "precio_base": 20000.00,
    "activa": true,
    "created_at": "2026-10-02T21:00:00Z"
  }
}
```

**Errores posibles:**
| Código HTTP | Error Code | Descripción |
|---|---|---|
| 409 | `DUPLICATE_ROUTE` | Ya existe una ruta con ese origen y destino |
| 422 | `VALIDATION_ERROR` | Campos faltantes o inválidos |

---

### `PUT /rutas/:id`
Actualiza una ruta. Requiere rol: `admin`.

### `DELETE /rutas/:id`
Desactiva (soft-delete) una ruta. Requiere rol: `admin`.

---

## Módulo 3: Vehículos

### `GET /vehiculos`
Lista todos los vehículos. Requiere rol: `admin`, `operador`.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-vehiculo",
      "patente": "AB123CD",
      "tipo": "semicama",
      "capacidad_asientos": 42,
      "estado": "activo"
    }
  ]
}
```

---

### `POST /vehiculos`
Registra un vehículo. Requiere rol: `admin`.

**Request:**
```json
{
  "patente": "AB123CD",
  "tipo": "semicama",
  "capacidad_asientos": 42
}
```

---

### `POST /vehiculos/:id/layout`
Define la distribución visual de asientos del vehículo. Requiere rol: `admin`.

**Request:**
```json
{
  "pisos": 2,
  "layout": [
    {
      "piso": 1,
      "filas": [
        { "fila": 1, "asientos": ["1A", "1B", "1C", "1D"] },
        { "fila": 2, "asientos": ["2A", "2B", "2C", "2D"] }
      ]
    },
    {
      "piso": 2,
      "filas": [
        { "fila": 1, "asientos": ["P1A", "P1B", "P1C", "P1D"] }
      ]
    }
  ]
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "vehiculo_id": "uuid-vehiculo",
    "total_asientos": 42,
    "layout_guardado": true
  }
}
```

---

## Módulo 4: Viajes

### `GET /viajes`
Lista viajes con filtros. Requiere rol: `admin`, `operador`.

**Query params:**
| Parámetro | Tipo | Descripción |
|---|---|---|
| `fecha_desde` | date | Formato `YYYY-MM-DD` |
| `fecha_hasta` | date | Formato `YYYY-MM-DD` |
| `ruta_id` | uuid | Filtra por ruta |
| `estado` | string | `programado`, `en_curso`, `finalizado`, `cancelado` |

**Implementado en EVE-21:** los límites de fecha son inclusivos y representan días de Argentina (UTC−3). Los viajes se ordenan por salida ascendente. La respuesta contiene `data: Viaje[]` y `meta.total`. Filtros mal formados o un período invertido devuelven `422 VALIDATION_ERROR`.

Cada viaje incluye `id`, `ruta_id`, `vehiculo_id`, `fecha_salida`, `fecha_llegada`, `precio`, `estado`, `asientos_totales`, `created_at`, `ruta: { origen, destino }` y `vehiculo: { patente, tipo }`. Recorrido, tarifa y asientos se copian al programar para conservar el viaje frente a cambios posteriores del catálogo.

---

### `GET /viajes/buscar`
Búsqueda pública de viajes para pasajeros. 

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `origen` | string | ✅ | Ciudad de origen |
| `destino` | string | ✅ | Ciudad de destino |
| `fecha` | date | ✅ | Fecha de salida `YYYY-MM-DD` |
| `pasajeros` | int | ❌ | Cantidad (default: 1) |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-viaje",
      "ruta": { "origen": "Buenos Aires", "destino": "Rosario" },
      "fecha_salida": "2026-10-10T08:00:00-03:00",
      "fecha_llegada": "2026-10-10T12:00:00-03:00",
      "vehiculo": { "tipo": "cama", "patente": "AB123CD" },
      "precio": 15000.00,
      "asientos_disponibles": 18,
      "asientos_totales": 42
    }
  ]
}
```

---

### `POST /viajes`
Crea un nuevo viaje. Requiere rol: `admin`.

**Request:**
```json
{
  "ruta_id": "uuid-ruta",
  "vehiculo_id": "uuid-vehiculo",
  "fecha_salida": "2026-10-10T08:00:00-03:00",
  "fecha_llegada": "2026-10-10T12:00:00-03:00",
  "precio_override": null
}
```

**Errores posibles:**
| Código HTTP | Error Code | Descripción |
|---|---|---|
| 409 | `VEHICLE_CONFLICT` | El vehículo tiene otro viaje en ese horario |
| 422 | `VALIDATION_ERROR` | Datos de entrada inválidos |

**Precisiones de EVE-20:** `fecha_llegada` es obligatoria y posterior a la salida; ambas fechas deben incluir zona horaria. Se agregó llegada explícita porque la distancia no determina la duración del viaje ni permite validar solapamientos de manera confiable. Los intervalos son `[salida, llegada)`: una unidad puede salir justo cuando termina su viaje anterior. Se consideran todos los viajes no cancelados de la unidad, con control de concurrencia en el backend.

La ruta debe estar activa y la unidad en estado `activo`, con un mapa de asientos válido y códigos únicos. Ruta/unidad inexistentes devuelven `404 RESOURCE_NOT_FOUND`; los recursos no habilitados devuelven `422 INACTIVE_ROUTE`, `UNAVAILABLE_VEHICLE` o `INVALID_LAYOUT`. La tarifa opcional admite hasta dos decimales y debe ser positiva; al omitirla o enviar `null`, se copia la tarifa base. Respuesta `201`: el viaje creado, con estado inicial `programado`. Viaje y asientos iniciales libres se guardan en una sola transacción.

La programación se confirma exclusivamente con la API. Si se corta la conexión durante el alta, consultar el listado antes de reintentar: el servidor podría haber confirmado el viaje aunque no haya llegado la respuesta.

Si hay una conexión PostgreSQL configurada pero no disponible al iniciar, Viajes devuelve `503 STORAGE_UNAVAILABLE` en lugar de programar contra datos locales desactualizados. Sin PostgreSQL configurado, el store híbrido conserva viajes en su snapshot local y admite un solo proceso de servidor.

---

### `GET /viajes/:id/asientos`
Obtiene el estado de cada asiento del viaje. Requiere rol: `admin`, `operador`.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "viaje_id": "uuid-viaje",
    "asientos": [
      { "numero": "1A", "piso": 1, "estado": "libre" },
      { "numero": "1B", "piso": 1, "estado": "ocupado", "reserva_id": "uuid-reserva" },
      { "numero": "1C", "piso": 1, "estado": "bloqueado_temp", "expira_en": "2026-10-02T21:10:00Z" }
    ]
  }
}
```

> **Estados posibles:** `libre` | `ocupado` | `bloqueado_temp` | `bloqueado_admin`

---

### `GET /viajes/:id/manifiesto`
Genera y descarga el PDF del manifiesto de pasajeros. Requiere rol: `admin`, `operador`, `chofer`.

**Response:** `application/pdf` (descarga directa)

---

### `GET /viajes/:id/manifiesto-digital`
Retorna el manifiesto como JSON en tiempo real para la app del chofer.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "viaje_id": "uuid-viaje",
    "pasajeros": [
      {
        "reserva_id": "uuid-reserva",
        "asiento": "1A",
        "pasajero": { "nombre": "Juan Pérez", "dni": "30123456" },
        "check_in": false,
        "check_in_at": null
      }
    ],
    "total_confirmados": 24,
    "total_abordados": 0
  }
}
```

---

## Módulo 5: Reservas y Pasajes

### `POST /reservas`
Crea una reserva/pasaje. Operación atómica: crea o actualiza el pasajero y registra la reserva. Requiere rol: `operador`, `admin`.

**Request:**
```json
{
  "viaje_id": "uuid-viaje",
  "asientos": ["1A", "1B"],
  "pasajeros": [
    {
      "asiento": "1A",
      "dni": "30123456",
      "nombre": "Juan Pérez",
      "email": "juan@email.com",
      "telefono": "+5491112345678"
    },
    {
      "asiento": "1B",
      "dni": "35987654",
      "nombre": "Ana Gómez",
      "email": "ana@email.com",
      "telefono": "+5491187654321"
    }
  ],
  "metodo_pago": "efectivo"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "reservas": [
      {
        "id": "uuid-reserva-1",
        "asiento": "1A",
        "pasajero": { "nombre": "Juan Pérez" },
        "estado": "confirmada",
        "monto": 15000.00,
        "qr_code_url": "https://api.evertrip.app/v1/tickets/uuid-reserva-1/qr",
        "ticket_url": "https://api.evertrip.app/v1/tickets/uuid-reserva-1/pdf"
      }
    ],
    "total": 30000.00
  }
}
```

**Errores posibles:**
| Código HTTP | Error Code | Descripción |
|---|---|---|
| 409 | `SEAT_TAKEN` | Uno o más asientos ya fueron ocupados |
| 422 | `VALIDATION_ERROR` | Datos de pasajero inválidos |

---

### `POST /reservas/:id/confirmar-pago`
Marca el pago de una reserva como recibido. Requiere rol: `operador`, `admin`.

**Request:**
```json
{ "metodo_pago": "efectivo", "observacion": "Pago exacto" }
```

---

### `POST /reservas/:id/cancelar`
Cancela una reserva y libera el asiento. Requiere rol: `admin`, `operador`.

**Request:**
```json
{ "motivo": "Cancelación a pedido del pasajero" }
```

---

### `POST /reservas/:id/checkin`
Marca el abordaje de un pasajero. Usada por la App del Chofer tras escanear el QR. Requiere rol: `chofer`, `operador`, `admin`.

**Request:**
```json
{ "qr_token": "token-codificado-en-el-qr" }
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "reserva_id": "uuid-reserva",
    "asiento": "1A",
    "pasajero": "Juan Pérez",
    "check_in": true,
    "check_in_at": "2026-10-10T07:55:00-03:00"
  }
}
```

**Errores posibles:**
| Código HTTP | Error Code | Descripción |
|---|---|---|
| 404 | `INVALID_QR` | El token QR no corresponde a una reserva válida |
| 409 | `ALREADY_BOARDED` | El pasajero ya realizó check-in |

---

### `GET /tickets/:id/qr`
Devuelve la imagen PNG del código QR del ticket.

**Response:** `image/png`

---

### `GET /tickets/:id/pdf`
Devuelve el PDF del ticket individual para imprimir o compartir.

**Response:** `application/pdf`

---

## Módulo 6: Pasajeros (CRM)

### `GET /pasajeros`
Busca pasajeros en el CRM. Requiere rol: `admin`, `operador`.

**Query params:** `q` (nombre, DNI o email), `page`, `per_page`

---

### `GET /pasajeros/:id`
Retorna el perfil completo de un pasajero con historial de viajes.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-pasajero",
    "dni": "30123456",
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "telefono": "+5491112345678",
    "total_viajes": 8,
    "primer_viaje": "2025-03-15T00:00:00Z",
    "historial": [
      {
        "reserva_id": "uuid-reserva",
        "viaje": { "origen": "Bs. As.", "destino": "Rosario", "fecha": "2026-09-01" },
        "asiento": "5B",
        "estado": "confirmada"
      }
    ]
  }
}
```

---

## Módulo 7: Inteligencia Artificial

### `POST /ia/chat`
Endpoint del Bot conversacional para atención al cliente. Disponible públicamente (sin auth de sistema).

**Request:**
```json
{
  "session_id": "uuid-de-sesion-del-cliente",
  "mensaje": "¿Cuánto equipaje puedo llevar en el viaje a Rosario?"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "respuesta": "En todos nuestros servicios podés llevar hasta 15 kg de equipaje en bodega sin costo adicional. Para equipaje extra, coordiná en terminal con al menos 30 minutos de anticipación.",
    "session_id": "uuid-de-sesion-del-cliente",
    "fuente": "politica-equipaje-v1"
  }
}
```

---

### `POST /ia/analizar`
Solicita al LLM un análisis del estado actual del negocio. Requiere rol: `admin`.

**Request:**
```json
{
  "periodo": "ultima_semana",
  "foco": ["ocupacion", "rutas", "sugerencias_marketing"]
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "resumen": "En la última semana, la ruta Bs. As.-Mar del Plata tuvo un 72% de ocupación promedio...",
    "insights": [
      {
        "id": "insight-uuid-1",
        "tipo": "promocion",
        "titulo": "Baja demanda detectada para el viernes 9/10",
        "descripcion": "El viaje BUE-MDQ del viernes 9/10 tiene solo un 28% de ocupación. Se sugiere enviar una promoción del 20% a los 340 pasajeros que viajaron en octubre del año pasado.",
        "accion_recomendada": "aplicar_descuento",
        "payload": {
          "viaje_id": "uuid-viaje",
          "descuento_pct": 20,
          "segmento_pasajeros": "frecuentes_octubre"
        }
      }
    ]
  }
}
```

---

### `POST /ia/sugerencias/:insight_id/aplicar`
El Administrador aprueba y aplica una sugerencia de la IA. **La IA no ejecuta esto por sí sola.** Requiere rol: `admin`.

**Request:**
```json
{ "confirmacion": true }
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "insight_id": "insight-uuid-1",
    "accion_ejecutada": "descuento_20pct_aplicado",
    "afectados": 340,
    "timestamp": "2026-10-02T22:00:00-03:00"
  }
}
```

---

## Módulo 8: Autenticación de Pasajero (B2C - Fase Flexible)

### `POST /auth/pasajero/solicitar-otp`
Envía un OTP al email/teléfono del pasajero para login sin contraseña.

**Request:**
```json
{ "email": "juan@email.com" }
```

---

### `POST /auth/pasajero/verificar-otp`
Verifica el OTP y devuelve el JWT del pasajero.

**Request:**
```json
{ "email": "juan@email.com", "otp": "847291" }
```

---

## Códigos de Error Globales

| HTTP | Error Code | Descripción |
|---|---|---|
| 400 | `BAD_REQUEST` | Request malformado |
| 401 | `UNAUTHORIZED` | Token inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos para este recurso |
| 404 | `RESOURCE_NOT_FOUND` | Recurso no encontrado |
| 409 | `CONFLICT` | Conflicto de estado (duplicado, ocupado, etc.) |
| 422 | `VALIDATION_ERROR` | Fallo en validación de campos |
| 429 | `TOO_MANY_REQUESTS` | Rate limit excedido |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |
