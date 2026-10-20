# Demo comercial — EVE-24

Alcance autorizado: datos ficticios, edición pública habilitada. No es un entorno para datos personales ni operación comercial. Se muestran Rutas, Flota, distribución de asientos y programación de Salidas; reservas, pagos, QR y check-in siguen pendientes.

## Railway: backend

- Servicio desde `backend/`, configuración `backend/railway.json`.
- Build: `npm ci --include=dev && npm run build`; inicio: `npm start`.
- Railway asigna `PORT`; el servidor ya escucha en `0.0.0.0`.
- Agregar PostgreSQL y asignar su `DATABASE_URL` al servicio de API, con referencia al servicio de base de datos. No guardar esa URL en Git.
- `NODE_ENV=production`. No definir `FORCE_MEMORY_STORE=true`.
- Crear dominio HTTPS y verificar `/v1/health`: debe indicar `storage_mode: postgresql`. Las migraciones se aplican al iniciar, con rutas y vehículos de ejemplo.
- No desplegar `.env` ni `.data-cache.json` locales: contienen la configuración y datos del entorno de trabajo. `.railwayignore` los excluye.

## Vercel: frontend

- Proyecto desde `frontend/`, framework Vite y salida `dist`.
- Definir `VITE_API_URL` con el origen HTTPS de Railway, sin `/v1` al final.
- Definir `VITE_DEMO_MODE=true`: muestra el aviso de datos ficticios y edición pública.
- Las variables `VITE_*` son públicas y quedan incluidas en el bundle; nunca colocar contraseñas, tokens ni `DATABASE_URL` allí.
- Volver a desplegar al cambiar las variables de build.

## Recorrido de reunión

1. Abrir Salidas con ejemplos del día y mostrar detalle de una salida.
2. Cambiar recorrido, consultar una fecha y buscar una patente.
3. Mostrar Rutas, Flota y diseñador de asientos.
4. Programar un viaje con ruta/unidad activas y llegada posterior a la salida.
5. Repetir el horario para demostrar que se evita superponer la unidad.
6. Consultar el viaje desde otra sesión para comprobar que lo guarda el backend.

Usar únicamente nombres y registros ficticios. Las cifras de capacidad son asientos del viaje, no ocupación ni ventas.

## Verificación para compartir enlace

- Frontend y archivos JS/CSS responden por HTTPS.
- API `/v1/health`, `/v1/rutas`, `/v1/vehiculos` y `/v1/viajes` responden; almacenamiento PostgreSQL confirmado.
- La agenda tiene salidas de ejemplo del día argentino; no se cargan ejemplos en el backend local usado para desarrollo.
- Alta/listado y conflicto probados en la instancia de demo.
- El aviso DEMO INTERACTIVA es visible y no aparecen errores de red o contenido mixto.

## Pendientes antes de uso comercial

Autenticación y roles, permisos de edición, política de copias de seguridad y recuperación, reservas y bloqueo de butacas, cobros y conciliación, emisión y validación de tickets, monitoreo y políticas de datos. No son requisitos para esta demostración técnica con datos ficticios y edición abierta autorizada.

La publicación requiere cuentas autenticadas en GitHub, Railway y Vercel y recursos habilitados en sus planes. Si alguna cuenta exige contratar un plan o aceptar condiciones, lo debe resolver el titular.
