# Consola Terminal — EVE-16

Referencia aprobada: `opendesign/mockups/evertrip-terminal/`, paleta **Azul atlántico**.
Ticket: [EVE-16](https://eversys.atlassian.net/browse/EVE-16). Sustituye la presentación de EVE-15; conserva los contratos y operaciones de EVE-5, EVE-9 y EVE-13.

## Identidad y navegación

- Fondo `#F1F4F8`, superficies blancas, bordes `#E0E6EF`, texto `#243043`.
- Acción principal `#254F82`, sidebar `#1D304C`, selección `#C5DEF4`.
- Manrope para títulos y DM Sans para contenido. Cifras tabulares en tarifas y códigos.
- Sidebar desde 1024 px; navegación inferior fija, con área segura, por debajo de ese ancho.
- Rutas, Flota, Asientos, Viajes y búsqueda global. Se mantienen Ctrl/Cmd+K y Alt+1/2/3; Viajes incorpora Alt+4 (EVE-22). La navegación móvil contiene cinco accesos.

## Jerarquía de pantallas

- **Rutas:** resumen de red, filtros, listado de recorridos y detalle con tarifa base y estado. En móvil, distancia y estado pasan al detalle para evitar desplazamiento horizontal.
- **Flota:** resumen de disponibilidad, filtros y tarjetas de unidad. Edición de datos y acceso al mapa de asientos.
- **Asientos:** plano central y controles agrupados. Conserva pisos, plantillas, altas/bajas de filas, renumeración, edición de códigos y guardado real.
- **Viajes:** listado de programación, filtros de período/ruta/estado y alta con salida y llegada explícitas. Horarios en Argentina (UTC−3), independientemente de la zona del dispositivo. Tarjetas en móvil y tabla en desktop. Errores de conflicto visibles, sin alta offline simulada.
- Se retiran de la presentación yield, duraciones estimadas, tarifas calculadas sin contrato, sugerencias de flota, payloads y referencias de implementación.

## Formularios y accesibilidad

Los formularios usan un diálogo nativo compartido, centrado y limitado al alto disponible. Encabezado y acciones permanecen accesibles mientras el contenido se desplaza. El foco entra en el primer campo, queda dentro del diálogo y vuelve al disparador al cerrar. Escape y fondo cierran el diálogo salvo durante el guardado.

Se conservan errores de API y validaciones de ciudades, distancia, precio, patente y capacidad. No se modifican endpoints ni datos persistidos como parte del rediseño.

## Comprobaciones

`npm --prefix frontend test` comprueba límites de los formularios. `npm --prefix frontend run build` valida TypeScript y compilación. Verificar navegación, filtros, estados vacíos, diálogos y edición de asientos en desktop y móvil antes de publicar.
