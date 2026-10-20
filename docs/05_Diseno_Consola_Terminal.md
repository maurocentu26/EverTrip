# Consola Terminal — EVE-16

Referencia aprobada: `opendesign/mockups/evertrip-terminal/`, paleta **Azul atlántico**.
Tickets: [EVE-16](https://eversys.atlassian.net/browse/EVE-16) (identidad) y [EVE-23](https://eversys.atlassian.net/browse/EVE-23) (layout A de Despacho). Conserva los contratos y operaciones del catálogo y de EVE-18.

## Identidad y navegación

- Fondo `#F1F4F8`, superficies blancas, bordes `#E0E6EF`, texto `#243043`.
- Acción principal `#254F82`, sidebar `#1D304C`, selección `#C5DEF4`.
- Manrope para títulos y DM Sans para contenido. Cifras tabulares en tarifas y códigos.
- Sidebar desde 1024 px; navegación inferior fija, con área segura, por debajo de ese ancho.
- Salidas como entrada inicial, seguida de Rutas, Flota, Asientos y búsqueda global. Sidebar con Operación y Catálogos; navbar inferior móvil con cinco accesos. Ctrl/Cmd+K abre la búsqueda; Alt+1/2/3/4 corresponde a Salidas/Rutas/Flota/Asientos.

## Jerarquía de pantallas

- **Rutas:** resumen de red, filtros, listado de recorridos y detalle con tarifa base y estado. En móvil, distancia y estado pasan al detalle para evitar desplazamiento horizontal.
- **Flota:** resumen de disponibilidad, filtros y tarjetas de unidad. Edición de datos y acceso al mapa de asientos.
- **Asientos:** plano central y controles agrupados. Conserva pisos, plantillas, altas/bajas de filas, renumeración, edición de códigos y guardado real.
- **Salidas (EVE-23):** agenda seleccionable con horario, fecha, destino, origen, unidad y estado. Detalle lateral desktop con horarios completos, patente, servicio, capacidad del snapshot, tarifa e ID. En móvil, el detalle reemplaza la agenda y permite volver con restauración de foco; no usa un modal de consulta.
- El filtro inicial es el día actual argentino. Permite Hoy, Todas las fechas, período, recorrido, estado y búsqueda local por ciudades/patente/ID. En móvil, recorrido y estado se despliegan con un botón que indica si hay filtros activos. Horarios y límites de día usan Argentina (UTC−3), independientemente del dispositivo; la llegada de otro día se identifica en la fila.
- El alta conserva salida/llegada explícitas, validación de tarifa y errores de conflicto. Al crear, se abre la agenda del día de la salida y se selecciona el viaje creado. Un error incierto exige consultar antes de reintentar. No se simulan altas offline.
- No se muestran porcentajes de ocupación, pasajeros, plataformas, reservas o ventas del prototipo: la API actual sólo ofrece capacidad total del snapshot. La web pública permanece en el prototipo hasta implementar B2C.
- Se retiran de la presentación yield, duraciones estimadas, tarifas calculadas sin contrato, sugerencias de flota, payloads y referencias de implementación.

## Formularios y accesibilidad

Los formularios usan un diálogo nativo compartido, centrado y limitado al alto disponible. Los formularios amplios ocupan la pantalla completa en móviles de hasta 640 px. Encabezado y acciones permanecen accesibles mientras el contenido se desplaza. El foco entra en el primer campo, queda dentro del diálogo y vuelve al disparador al cerrar. Escape y fondo cierran el diálogo salvo durante el guardado.

Se conservan errores de API y validaciones de ciudades, distancia, precio, patente y capacidad. No se modifican endpoints ni datos persistidos como parte del rediseño.

## Comprobaciones

`npm --prefix frontend test` comprueba límites de los formularios, fechas argentinas y búsqueda de salidas. `npm --prefix frontend run build` valida TypeScript y compilación. Verificar navegación, selección/detalle/volver, filtros, estados vacíos, diálogos y edición de asientos en desktop y móvil antes de publicar. Usar una instancia de prueba con `NODE_ENV=test` para viajes de QA; no insertar ejemplos en la operación real.
