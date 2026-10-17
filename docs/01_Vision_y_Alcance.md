# Documento de Visión y Alcance - EverTrip

## 1. Propósito del Proyecto
**EverTrip** es una plataforma integral de gestión de transporte de media y larga distancia. Su objetivo principal es resolver la administración operativa de viajes, asignación de asientos y registro de pasajeros. 
El **diferenciador clave** de EverTrip es su integración nativa con un **Agente de Inteligencia Artificial**. Este agente tendrá una doble función: por un lado, orientar al negocio sugiriendo estrategias comerciales, y por el otro, interactuar directamente con los clientes como asistente virtual.

## 2. Objetivos del Negocio
- **Optimizar la Operatoria:** Simplificar la reserva, venta de pasajes, control de flotas y check-in de abordaje.
- **Conocimiento del Pasajero:** Mantener un CRM detallado del cliente para fidelización.
- **Crecimiento Inteligente (AI-Driven):** Utilizar la IA para descubrir nichos de mercado y sugerir precios, manteniendo siempre la decisión final en manos humanas ("Human-in-the-loop").
- **Atención Automatizada:** Reducir la carga operativa de consultas mediante un bot que resuelva dudas de los clientes 24/7.

## 3. Usuarios y Roles
1. **Administrador / Dueño:** Acceso total al sistema, configuraciones financieras y visualización de dashboards estratégicos. Aprueba o rechaza las sugerencias de la IA.
2. **Operador / Boletero:** Gestión de ventas en mostrador y emisión de pasajes.
3. **Chofer:** Usuario con vista móvil reducida para control de abordaje (escaneo QR y visualización del manifiesto).
4. **Pasajero:** Autogestión de compras web (a demanda del negocio) e interacción con el Bot IA.
5. **Agente IA (Virtual):** Doble rol: analista de datos interno y agente de atención al cliente externo.

## 4. Alcance del Sistema (MVP)
### 4.1. Módulo Core (Operaciones)
- Gestión de Flota y Rutas.
- Mapa interactivo de asientos.
- **Control de Abordaje Híbrido:** Generación de manifiesto de pasajeros en papel (PDF) y vista móvil para escaneo de tickets QR en puerta.
- Venta en mostrador (Operador).
- **Venta Online (B2C):** Portal de e-commerce habilitado en la arquitectura, a implementarse según la demanda y urgencia del cliente.

### 4.2. Módulo de CRM y Pasajeros
- Registro histórico de pasajeros y viajes.

### 4.3. Módulo IA (Business & Customer Support)
- **Asesor de Negocios (Sugerencias):** Análisis de ocupación para recomendar ofertas y nuevas rutas al administrador. *La IA nunca modifica precios por su cuenta.*
- **Atención al Cliente:** Bot conversacional entrenado con los datos de la empresa (políticas de equipaje, horarios, plataformas) para interactuar con clientes potenciales.

## 5. Estándares del Equipo (Reglas de Desarrollo)
- **Nomenclatura de Ramas:** `(feature | bugfix)_<ID de issue>_<nombre>` (ej. `feature_ING-16_get_games_endpoint`)
- **Mensajes de Commit:** Empezar siempre con el ID del issue correspondiente (ej. `ING-16 add GET Players endpoint`).
