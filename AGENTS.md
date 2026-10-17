# EverTrip — Guía para Agentes (`AGENTS.md`)

## 📚 Acceso Directo a la Documentación del Proyecto

La documentación funcional, arquitectónica y de API de **EverTrip** se encuentra centralizada en:
- **Directorio de Documentos EverSys:** `C:\Users\mauro\Documents\EverSys\Documentos\06 - Proyectos Propios\3. EverTrip\docs`
- **Copia sincronizada en el repositorio:** `./docs`

### Índice de Documentos Oficiales:
1. **[01_Vision_y_Alcance.md](file:///C:/Users/mauro/Documents/EverSys/Documentos/06%20-%20Proyectos%20Propios/3.%20EverTrip/docs/01_Vision_y_Alcance.md)** (`./docs/01_Vision_y_Alcance.md`)
   - Propósito del negocio, roles de usuario (`admin`, `operador`, `chofer`, `pasajero`, `Agente IA`) y alcance del MVP.
2. **[02_Arquitectura_y_Diagramas.md](file:///C:/Users/mauro/Documents/EverSys/Documentos/06%20-%20Proyectos%20Propios/3.%20EverTrip/docs/02_Arquitectura_y_Diagramas.md)** (`./docs/02_Arquitectura_y_Diagramas.md`)
   - Diagrama de clases del dominio (`Vehiculo`, `Ruta`, `Viaje`, `Asiento`, `Pasajero`, `Reserva`, `AgenteIA`) y topología de servicios.
3. **[03_Planificacion_Agile.md](file:///C:/Users/mauro/Documents/EverSys/Documentos/06%20-%20Proyectos%20Propios/3.%20EverTrip/docs/03_Planificacion_Agile.md)** (`./docs/03_Planificacion_Agile.md`)
   - Desglose de Épicas, Historias de Usuario y Sub-tickets técnicos (Backend / Frontend).
4. **[04_API_Reference.md](file:///C:/Users/mauro/Documents/EverSys/Documentos/06%20-%20Proyectos%20Propios/3.%20EverTrip/docs/04_API_Reference.md)** (`./docs/04_API_Reference.md`)
   - Contrato completo de endpoints REST (`/v1/auth`, `/v1/rutas`, `/v1/vehiculos`, `/v1/viajes`, `/v1/reservas`, `/v1/ia`), payloads JSON y códigos de error.

---

## 🎫 Trabajo por Tickets y Reglas de Git

- **Proyecto en Jira:** [EverTrip (Clave: `EVE`)](https://eversys.atlassian.net/jira/software/projects/EVE/boards/37)
- **Nomenclatura de Ramas (Obligatorio):**
  - Formato: `(feature | bugfix)_<ID de issue>_<nombre>`
  - Ejemplo: `feature_EVE-2_gestion_rutas`
- **Mensajes de Commit (Obligatorio):**
  - Deben empezar siempre con el ID del issue correspondiente.
  - Ejemplo: `EVE-2 add routes catalog backend endpoints and frontend ABM view`

---

## 🏗️ Estructura del Proyecto (`C:\Users\mauro\Documents\EverSys\Proyectos\EverTrip`)

- `backend/`: API REST en Node.js + Express + TypeScript (`PORT=3001`, prefijo `/v1`) + migraciones PostgreSQL (`backend/migrations/`) y store híbrido con datos semilla.
- `frontend/`: Consola Operativa en React 18 + Vite + TypeScript + Tailwind CSS v4 (`PORT=5173`, `host: true` habilitado para pruebas en iPhone en red local).
- `.agents/skills/`: Skills de diseño de **OpenDesign** (`frontend-design`, `emil-design-eng`, `web-design-guidelines`, `impeccable-design-polish`).
- **Paleta y Estética:** *Terminal · Azul atlántico* (EVE-16): lienzo `#F1F4F8`, superficies `#FFFFFF`, bordes `1px #E0E6EF`, texto `#243043`, primario `#254F82`, sidebar `#1D304C` y selección `#C5DEF4`. Sidebar desktop y navbar inferior móvil. Ver `./docs/05_Diseno_Consola_Terminal.md`.
