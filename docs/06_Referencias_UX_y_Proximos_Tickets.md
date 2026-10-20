# Referencias de UX y próximos incrementos de EverTrip

Investigación: 20 de octubre de 2026. Estado: propuesta, pendiente de validar con usuarios. No reemplaza la especificación aprobada en `05_Diseno_Consola_Terminal.md`.

## Alcance y evidencia

Se consultaron sitios, documentación de producto y centros de ayuda oficiales. Las descripciones de módulos privados se basan en material público, sin acceso autenticado a esas consolas. La carga de Central de Pasajes en el navegador falló por tiempo de espera; su estructura y flujo se contrastaron con el contenido web y la ayuda oficial. No se completaron compras ni reservas. Las propuestas de EverTrip son decisiones propias, no características atribuidas a los competidores.

## Referencias para operación y boletería

| Referencia | Evidencia pública | Aplicación propuesta en EverTrip |
|---|---|---|
| [Betterez: capacidades](https://www.betterez.com/capabilities/) | Vista de próximos cinco días orientada a capacidad; mapas interactivos; manifiestos digitales; aplicación de abordaje. | Usar las salidas como entrada a la operación. Mostrar ocupación cuando existan reservas reales. |
| [Turnit Ride](https://www.turnit.com/products/turnit-ride) | Separa horarios, vehículos, inventario, tarifas y reservas; ofrece canales web, agentes y personal a bordo sobre una API compartida. | Separar configuración, operación y venta en navegación; compartir reglas e inventario entre boletería y portal. |
| [Palisis: manifiesto](https://support.palisis.com/hc/en-us/articles/22302655089297-How-to-customise-the-Manifest) | Acceso desde calendario o próximas salidas; manifiesto por salida con pasajeros, reservas, pagos y estado de check-in; vista por ticket o reserva. | Detalle de viaje con pestañas de asientos, pasajeros y abordaje; distinguir pago de abordaje. |

No trasladar por defecto funciones avanzadas de estas plataformas: tarifas dinámicas, conexiones entre operadores, CRM complejo o edición masiva no son necesarias para la próxima entrega.

## Referencias de venta pública

| Referencia | Estructura documentada | Qué tomar |
|---|---|---|
| [Plataforma 10: flujo de compra](https://ayuda.plataforma10.com.ar/es/articles/10258107-como-buscar-y-comprar-un-pasaje) | Búsqueda con origen, destino, fechas y pasajeros; elección por categoría, duración y precio; butaca; datos asociados al asiento; pago. | Resumen del viaje persistente, pasos explícitos y asociación pasajero–asiento visible. |
| [Central de Pasajes: inicio](https://www.centraldepasajes.com.ar/) y [ayuda de compra](https://www.centraldepasajes.com.ar/ayuda/como-comprar-en-central-de-pasajes/como-comprar-pasajes-micro-online) | Buscador principal, ida/vuelta, pasajeros, promociones y accesos a reenvío/devolución; comparación de servicios, selección de asiento y datos, pago y envío del pasaje. | Búsqueda como acción principal; acceso claro a recuperar el pasaje; promociones debajo de la tarea principal. |
| [Busbud](https://www.busbud.com/es-us) | Inicio centrado en origen, destino, salida, regreso opcional y pasajeros, seguido de confianza, operadores y rutas. | Formulario corto al inicio y contenido de destinos en un segundo nivel. |
| [FlixBus: selección de asientos](https://www.flixbus.es/servicio/reserva-de-asientos) | Mapa durante la reserva, categorías de asiento y marcas para lugares no reservables; asiento incluido en la confirmación. | Leyenda clara y estados distinguibles por texto/forma además del color; mostrar número y piso en el resumen. |

## Diagnóstico del panel actual

La revisión del código de `TripsView.tsx` muestra un encabezado promocional grande («Cada salida, un nuevo viaje»), un contenedor general y un listado con filtros. Todavía no hay una pantalla de trabajo por viaje. La paleta por sí sola no comunica una herramienta de transporte: faltan la jerarquía horaria y los vínculos entre salida, unidad, asiento, reserva y pasajero.

Esto es una evaluación de diseño, no el resultado de una prueba de usabilidad. Las funcionalidades futuras no deben aparecer con valores ficticios como si fueran datos reales.

## Dirección propuesta: Terminal operativa

Conservar Azul atlántico, sidebar en desktop y navbar inferior en móvil. Construir la identidad con horarios de cifras alineadas, recorridos con origen/destino destacados, diagramas de asientos, separadores sobrios y acciones vinculadas a cada salida. Mantener la tipografía actual inicialmente; evaluar la composición antes de cambiar fuentes.

### Consola de operador

- Inicio en **Salidas**, con fecha seleccionable, accesos Hoy/Mañana y lista ordenada por horario. No agregar indicadores que repitan el listado.
- Cada fila: salida, recorrido, llegada, unidad, disponibilidad real cuando exista, estado del viaje y acción Abrir. En móvil, tarjetas compactas con los mismos datos prioritarios.
- Detalle del viaje como página propia con URL: encabezado compacto y pestañas **Asientos / Pasajeros / Abordaje**. Revelar cada sección cuando esté implementada.
- Boletería desktop: búsqueda/listado a la izquierda; mapa y selección en el área central; resumen de la venta a la derecha. En pantallas medianas, selección y resumen en dos columnas; en móvil, pasos consecutivos.
- Pago de la reserva, disponibilidad del asiento y abordaje son estados diferentes: no mezclarlos en una única insignia.
- Configuración agrupa Rutas, Flota y diseñador de asientos. El diseñador del vehículo y el mapa de ocupación de un viaje son tareas distintas.
- Navegación móvil futura: Salidas, Vender, Reservas y Más; máximo cinco entradas. Chofer: acceso específico a su salida y abordaje. Esta organización es una propuesta, no un cambio aplicado.

### Modales y formularios

Usar modales para acciones breves y confirmaciones. Venta, manifiesto y detalle de viaje necesitan espacio propio, navegación atrás y enlaces directos. En móvil, formularios largos ocupan una pantalla completa; teclado y barra inferior no deben tapar errores ni botones. Preservar datos al volver de un paso. Controles táctiles de al menos 44 px y foco visible.

### Portal público

Inicio: marca EverTrip, Mis pasajes y Ayuda; buscador visible; destinos e información de servicio debajo. La fotografía puede aportar identidad en el inicio, dejando resultados y checkout enfocados en la compra.

Flujo propuesto: **Buscar → Elegir salida → Asientos → Pasajeros → Revisar y pagar → Pasaje**.

Resultados comparables: salida/llegada, duración, categoría, terminales cuando el modelo las soporte, disponibilidad, precio por pasajero y total. En desktop, filtros laterales y resumen junto al contenido; en móvil, filtros desplegables y acción inferior con total. No exigir una cuenta antes de buscar; decidir compra como invitado y recuperación segura al definir autenticación.

El mapa debe identificar piso, frente, pasillo, número, selección y lugares no disponibles. Al bloquear una butaca, mostrar vencimiento real del servidor. Al vencer o perder disponibilidad, conservar los datos del pasajero y explicar cómo elegir otra butaca.

Mostrar desglose del importe antes de pagar. Ante una respuesta incierta, permitir consultar el estado antes de reintentar. Confirmación con recorrido, fecha, asiento, estado de pago y acceso al ticket. No mostrar QR válido antes de la condición de emisión definida por negocio.

## Próximos tickets propuestos

Estos son títulos y alcances para preparar el backlog, **no claves existentes de Jira**. Las referencias EVE-3xx/EVE-2xx del plan original son marcadores; consultar Jira antes de asignar una clave o crear rama.

| Orden | Historia propuesta | Criterios de aceptación principales | Dependencias |
|---|---|---|---|
| 1 | Prototipo de Salidas, detalle de viaje y boletería | Desktop y móvil; selección de salida, butaca y pasajero; estados vacío, carga y error; comparar con panel actual. | Programación de viajes existente. |
| 2 | Consulta de disponibilidad por viaje | Mapa basado en snapshot del viaje; libres, ocupados y bloqueados; identidad de asiento estable; error de viaje inexistente. | Viajes y asientos por viaje. |
| 3 | Bloqueo temporal de asientos | TTL definido por servidor; dos compradores no obtienen el mismo lugar; liberación/vencimiento verificables; recuperación en UI. | Disponibilidad. |
| 4 | Reserva y pasajeros desde boletería | Registro atómico; validación de pasajero; asociación a butaca; consulta de reserva; cancelar libera capacidad según regla; protección ante duplicados por reintento. | Bloqueo y contrato de reservas. |
| 5 | Confirmación de pago y emisión de ticket | Estados de reserva y pago separados; confirmación idempotente; ticket con QR verificable; reimpresión/recuperación; cancelar según política acordada. | Reserva. Confirmación de cobro de mostrador no implica pasarela online. |
| 6 | Manifiesto por viaje y abordaje móvil | Lista real de pasajeros, PDF, búsqueda manual y QR; viaje equivocado, cancelado y doble escaneo explícitos; estado sin conexión visible. | Reservas y tickets; definir permisos de chofer. |
| 7 | Portal público: búsqueda y selección | Inicio, resultados y mapa responsive; navegación atrás conserva búsqueda; disponibilidad compartida con boletería. | Disponibilidad y bloqueo; activar fase B2C según alcance del proyecto. |
| 8 | Checkout público, pago online y Mis pasajes | Pasarela en sandbox, confirmación del servidor, recuperación segura, expiración y pago incierto; prueba completa antes de publicar. | Reservas, emisión, identidad/recuperación y reglas comerciales. |

Antes de exponer ventas o datos de pasajeros, cerrar autenticación y permisos de operador/chofer, y alcance de la recuperación pública. El lector de cámara en Safari necesita contexto seguro (HTTPS); el acceso LAN por HTTP usado para la vista previa no basta para validar escaneo en un iPhone real. Véase [MDN: requisitos de getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security).

## Límites y decisiones pendientes

- La investigación no valida rendimiento, accesibilidad ni conversión de las plataformas citadas.
- El orden adelanta reservas respecto al manifiesto del plan inicial para disponer de pasajeros reales. Es una propuesta de dependencia, no una modificación de Jira.
- Definir si se admiten reservas sin pago, vencimiento, cancelaciones, ida/vuelta, múltiples pasajeros y terminales/paradas. No asumir capacidad por tramos si el inventario actual es por viaje completo.
- El portal debe contemplar una empresa operadora al inicio; copiar funciones de un agregador de cientos de empresas agregaría complejidad sin una necesidad confirmada.
- No se modificó el código del panel ni se crearon tickets durante esta investigación.
