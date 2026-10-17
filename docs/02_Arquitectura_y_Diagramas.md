# Arquitectura y Modelado de Datos - EverTrip

Este documento provee la estructura técnica fundamental para iniciar el desarrollo, detallando el modelo de dominio y la topología de servicios propuesta.

## 1. Diagrama de Clases (Dominio Principal)

El siguiente diagrama modela el núcleo transaccional del sistema y cómo el Agente IA interactúa con los datos.

```mermaid
classDiagram
    class Vehiculo {
        +UUID id
        +String patente
        +int capacidadAsientos
        +String tipo
        +EstadoVehiculo estado
        +obtenerAsientosDisponibles()
    }
    class Ruta {
        +UUID id
        +String origen
        +String destino
        +float distanciaKm
        +float precioBase
    }
    class Viaje {
        +UUID id
        +DateTime fechaSalida
        +DateTime fechaLlegada
        +EstadoViaje estado
        +registrarPasajero()
    }
    class Asiento {
        +String numero
        +EstadoAsiento estado
    }
    class Pasajero {
        +UUID id
        +String dni
        +String nombre
        +String email
        +String telefono
        +historialViajes()
    }
    class Reserva {
        +UUID id
        +DateTime fechaReserva
        +float montoTotal
        +EstadoReserva estado
        +confirmarPago()
    }
    class AgenteIA {
        +analizarDemanda(Ruta)
        +sugerirNuevosDestinos()
        +crearCampanaMarketing()
        +predecirOcupacion(Viaje)
    }

    Ruta "1" *-- "many" Viaje : tiene
    Vehiculo "1" -- "many" Viaje : asignado a
    Vehiculo "1" *-- "many" Asiento : contiene
    Viaje "1" *-- "many" Reserva : recibe
    Pasajero "1" -- "many" Reserva : realiza
    Reserva "1" -- "1..*" Asiento : ocupa
    AgenteIA ..> Viaje : analiza métricas
    AgenteIA ..> Pasajero : segmenta usuarios
```

## 2. Diagrama de Arquitectura de Alto Nivel

Para escalar correctamente y poder integrar un LLM (Large Language Model) sin bloquear la operatoria, se recomienda una arquitectura orientada a servicios (SOA) o microservicios.

```mermaid
flowchart TD
    User[Operador / Administrador] --> Frontend[Web App - React/Angular]
    Frontend --> API[API Gateway / BFF]
    
    API --> Core[Servicio de Viajes y Reservas]
    API --> CRM[Servicio de Pasajeros]
    API --> IA[Servicio Inteligencia Artificial]

    Core --> DB_Core[(DB Relacional - Postgres)]
    CRM --> DB_Core
    
    IA --> DataLake[(Data Lake / Redis)]
    DB_Core -. ETL / Eventos .-> DataLake
    
    IA --> LLM[LLM API - ej. Gemini 1.5 Pro]
    IA --> Mkt[Email / Marketing Platform]

    classDef backend fill:#f9f,stroke:#333,stroke-width:2px;
    class Core,CRM,IA backend;
```

## 3. Justificación Tecnológica
- **Base de Datos:** Se sugiere una DB Relacional (PostgreSQL) para asegurar propiedades ACID en las transacciones de las reservas y evitar *overbooking*.
- **Agente IA:** Debe funcionar como un servicio asíncrono para no demorar la carga de la interfaz. Deberá consumir copias de solo lectura de la BD o escuchar eventos vía Webhooks/Colas (RabbitMQ/Kafka) para ir aprendiendo del flujo de ventas en tiempo real.
