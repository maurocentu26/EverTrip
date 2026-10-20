# Planificación Agile y Tablero Jira - EverTrip
### Última actualización: Sprint 0 - Kickoff

> Los IDs EVE-100 en adelante que aparecen en este plan son referencias de planificación, no claves vigentes del tablero. Consultar Jira antes de crear ramas o commits. Para el catálogo implementado, las UI corresponden a EVE-5 (Rutas), EVE-9 (Flota) y EVE-13 (Asientos). El rediseño Terminal se registra en [EVE-16](https://eversys.atlassian.net/browse/EVE-16), con su especificación en [05_Diseno_Consola_Terminal.md](05_Diseno_Consola_Terminal.md).

## IDs vigentes — Programación de Viajes

| Referencia del plan | Ticket de Jira | Alcance |
|---|---|---|
| EVE-200 | [EVE-17](https://eversys.atlassian.net/browse/EVE-17) | Épica Operatoria, Viajes y Check-in |
| EVE-201 | [EVE-18](https://eversys.atlassian.net/browse/EVE-18) | Programación de viajes |
| EVE-211 | [EVE-19](https://eversys.atlassian.net/browse/EVE-19) | Modelo, migración y snapshot de asientos |
| EVE-212 | [EVE-20](https://eversys.atlassian.net/browse/EVE-20) | POST y validación de solapamientos |
| EVE-213 | [EVE-21](https://eversys.atlassian.net/browse/EVE-21) | GET con filtros |
| EVE-214 | [EVE-22](https://eversys.atlassian.net/browse/EVE-22) | Formulario y listado responsive |

La programación requiere salida y llegada explícitas en horario argentino. Manifiestos, check-in, reservas y venta siguen siendo incrementos posteriores; no se dan por implementados al completar EVE-18.

[EVE-23](https://eversys.atlassian.net/browse/EVE-23) aplica el layout A de Despacho: Salidas como inicio, agenda seleccionable y detalle lateral desktop/pantalla móvil. Implementación sobre los datos de EVE-18, sin adelantar reservas ni web pública. Ver `05_Diseno_Consola_Terminal.md` y los incrementos propuestos en `06_Referencias_UX_y_Proximos_Tickets.md`.

Este documento desglosa el trabajo en Épicas, Historias de Usuario y **Sub-Tickets técnicos** (Frontend / Backend) para facilitar la asignación individual dentro del equipo.

---

## Estándar de Repositorio
* **Ramas:** `(feature | bugfix)_<ID>_<nombre>` → ej: `feature_EVE-111_endpoint-rutas`
* **Commits:** `<ID> <descripción corta>` → ej: `EVE-111 agregar POST /rutas con validaciones`

---

## Equipo y Perfiles
| Integrante | Área principal | Área secundaria |
|---|---|---|
| **Mauro** | Backend Core, DB, API REST | DevOps básico |
| **Álvaro** | Frontend Web y Móvil, UX/UI | Testing e2e |
| **Ramiro** | IA, LLM, Integraciones | Backend IA, QR/PDF |

---

## Épica 1: [EVE-100] Catálogo y Configuración Base
> Fundaciones del sistema. Debe completarse antes de cualquier otra épica.

### [EVE-101] Gestión de Rutas
**Descripción:** CRUD completo de rutas (origen, destino, distancia, precio base).

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-111** | Modelo BD + migraciones tabla `rutas` | 🔧 Backend | Mauro | 2 |
| **EVE-112** | Endpoints REST: `GET/POST/PUT/DELETE /rutas` | 🔧 Backend | Mauro | 3 |
| **EVE-113** | UI: Listado y formulario ABM de Rutas | 🎨 Frontend | Álvaro | 3 |

---

### [EVE-102] Gestión de Flota y Vehículos
**Descripción:** CRUD de vehículos con sus capacidades.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-121** | Modelo BD + migraciones tabla `vehiculos` | 🔧 Backend | Mauro | 2 |
| **EVE-122** | Endpoints REST: `GET/POST/PUT/DELETE /vehiculos` | 🔧 Backend | Mauro | 2 |
| **EVE-123** | UI: Listado y formulario ABM de Vehículos | 🎨 Frontend | Álvaro | 2 |

---

### [EVE-103] Layout y Mapa de Asientos
**Descripción:** Definir la distribución de asientos de un vehículo gráficamente.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-131** | Modelo BD para guardar layout de asientos (estructura JSON) | 🔧 Backend | Mauro | 2 |
| **EVE-132** | Endpoint `POST /vehiculos/:id/layout` para persistir mapa | 🔧 Backend | Mauro | 2 |
| **EVE-133** | Componente UI: Grilla/mapa de asientos configurable (drag & drop o selector) | 🎨 Frontend | Álvaro | 5 |

---

## Épica 2: [EVE-200] Operatoria, Viajes y Check-in
> Permite programar viajes y gestionar el abordaje físico.

### [EVE-201] Programación de Viajes
**Descripción:** Crear y administrar viajes asociando ruta, vehículo y horario.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-211** | Modelo BD + migraciones tabla `viajes` y `asientos_viaje` | 🔧 Backend | Mauro | 3 |
| **EVE-212** | Endpoint `POST /viajes` con validación de solapamiento de vehículo | 🔧 Backend | Mauro | 3 |
| **EVE-213** | Endpoint `GET /viajes` con filtros (fecha, ruta, estado) | 🔧 Backend | Mauro | 2 |
| **EVE-214** | UI: Formulario de creación de viaje + listado con estados | 🎨 Frontend | Álvaro | 3 |

---

### [EVE-202] Manifiesto de Pasajeros (PDF)
**Descripción:** Generar un PDF descargable con la lista de pasajeros embarcados para el chofer.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-221** | Endpoint `GET /viajes/:id/manifiesto` → genera y devuelve PDF | 🔧 Backend | Ramiro | 3 |
| **EVE-222** | Botón de descarga del PDF en la vista del viaje | 🎨 Frontend | Álvaro | 1 |

---

### [EVE-203] App Chofer: Escáner QR y Check-in
**Descripción:** Vista móvil para que el chofer controle el abordaje escaneando el QR de cada pasaje.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-231** | Endpoint `POST /reservas/:id/checkin` para marcar abordaje | 🔧 Backend | Mauro | 2 |
| **EVE-232** | Endpoint `GET /viajes/:id/manifiesto-digital` (estado en tiempo real) | 🔧 Backend | Mauro | 2 |
| **EVE-233** | Vista móvil responsive con lector QR y listado de pasajeros | 🎨 Frontend | Álvaro | 5 |

---

## Épica 3: [EVE-300] Motor de Ventas y Reservas (Boletería)
> Corazón transaccional del sistema.

### [EVE-301] Búsqueda de Viajes
**Descripción:** Buscador de viajes disponibles con filtros.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-311** | Endpoint `GET /viajes/buscar?origen=&destino=&fecha=` | 🔧 Backend | Mauro | 3 |
| **EVE-312** | UI: Buscador con selectores de origen/destino y fecha | 🎨 Frontend | Álvaro | 3 |
| **EVE-313** | UI: Vista de resultados con disponibilidad y precios | 🎨 Frontend | Álvaro | 2 |

---

### [EVE-302] Selección de Asientos y Mapa de Ocupación
**Descripción:** Visualizar el mapa de asientos con estado en tiempo real y seleccionarlos.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-321** | Endpoint `GET /viajes/:id/asientos` con estados (libre, ocupado, bloqueado) | 🔧 Backend | Mauro | 2 |
| **EVE-322** | Bloqueo temporal de asiento (reserva optimista, TTL 5 min) | 🔧 Backend | Mauro | 3 |
| **EVE-323** | UI: Mapa de asientos interactivo (click para seleccionar, colores por estado) | 🎨 Frontend | Álvaro | 5 |

---

### [EVE-303] Flujo de Venta y Ticket QR
**Descripción:** Registrar al pasajero, confirmar pago y emitir el ticket con código QR.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-331** | Endpoint `POST /reservas` → crea pasajero + reserva atómicamente | 🔧 Backend | Mauro | 5 |
| **EVE-332** | Generación y asociación de código QR único al pasaje | 🔧 Backend | Ramiro | 3 |
| **EVE-333** | Endpoint `POST /reservas/:id/confirmar-pago` y `POST /reservas/:id/cancelar` | 🔧 Backend | Mauro | 2 |
| **EVE-334** | UI: Formulario de datos del pasajero dentro del flujo de compra | 🎨 Frontend | Álvaro | 3 |
| **EVE-335** | UI: Pantalla de confirmación con ticket QR descargable/imprimible | 🎨 Frontend | Álvaro | 3 |

---

## Épica 4: [EVE-400] Inteligencia Artificial
> El diferenciador del producto. Comprende dos capas: Interna (Negocio) y Externa (Clientes).

### [EVE-401] Data Pipeline para la IA
**Descripción:** Hacer disponibles los datos del negocio de forma legible y segura para el LLM.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-411** | Vistas SQL de métricas: ocupación, ventas, rutas top | 🔧 Backend | Mauro | 3 |
| **EVE-412** | Endpoint interno `GET /ia/contexto` que devuelve snapshot de métricas | 🔧 Backend | Ramiro | 3 |
| **EVE-413** | Diseño y armado del Knowledge Base (FAQ, políticas, servicios) para RAG | 🤖 IA | Ramiro | 3 |

---

### [EVE-402] Dashboard Asesor de Negocios (IA Interna)
**Descripción:** Panel donde el LLM analiza el negocio y sugiere acciones al administrador. La IA solo sugiere, el admin aprueba.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-421** | Endpoint `POST /ia/analizar` → envía contexto al LLM y devuelve insights | 🤖 IA | Ramiro | 5 |
| **EVE-422** | Endpoint `POST /ia/sugerencias/:id/aplicar` → aplica la promo sugerida | 🔧 Backend | Mauro | 3 |
| **EVE-423** | UI: Panel de insights con cards de sugerencias y botón "Aplicar" | 🎨 Frontend | Álvaro | 5 |

---

### [EVE-403] Bot de Atención al Pasajero (IA Externa)
**Descripción:** Chatbot con RAG entrenado con los datos de la empresa. Disponible en web y WhatsApp.

| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-431** | Endpoint `POST /ia/chat` → recibe mensaje y devuelve respuesta contextualizada | 🤖 IA | Ramiro | 5 |
| **EVE-432** | Integración con WhatsApp Business API (webhook de entrada/salida) | 🤖 IA | Ramiro | 5 |
| **EVE-433** | Widget de chat embebible en el sitio web (iframe o componente) | 🎨 Frontend | Álvaro | 3 |

---

## Épica 5: [EVE-500] E-Commerce B2C (Fase Flexible)
> Se activa según demanda del cliente. Reutiliza la API core, solo requiere nuevo Frontend.

### [EVE-501] Portal de Compra Online para Pasajeros
| Sub-ticket | Descripción | Tipo | Asignado | Puntos |
|---|---|---|---|---|
| **EVE-511** | Endpoint `POST /auth/pasajero` y login con OTP/magic-link | 🔧 Backend | Mauro | 5 |
| **EVE-512** | Integración con pasarela de pago (Mercado Pago / Stripe) | 🔧 Backend | Ramiro | 5 |
| **EVE-513** | Portal web responsive (Búsqueda → Selección → Pago → Ticket) | 🎨 Frontend | Álvaro | 13 |

---

## Resumen por Sprint Sugerido

| Sprint | Tickets | Objetivo |
|---|---|---|
| **Sprint 1** | EVE-111 a EVE-133 | Configuración base: Rutas, Vehículos, Mapa de Asientos |
| **Sprint 2** | EVE-211 a EVE-233 | Viajes, Manifiesto PDF y App Chofer |
| **Sprint 3** | EVE-311 a EVE-335 | Motor de ventas completo con ticket QR |
| **Sprint 4** | EVE-411 a EVE-433 | Inteligencia Artificial (datos → IA → bot) |
| **Sprint 5** | EVE-511 a EVE-513 | E-Commerce pasajero (cuando sea requerido) |
