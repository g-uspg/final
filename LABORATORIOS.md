# Módulo de Laboratorios - Documentación de Estado Actual

Este documento describe el funcionamiento y la arquitectura del **Módulo de Gestión de Laboratorios** en la plataforma de la USPG.

---

## 📊 Estado de Implementación: **Completo y Funcional**

A diferencia de otros módulos temporales, el módulo de laboratorios se encuentra **100% desarrollado e integrado** con la base de datos a través de Prisma. Proporciona una interfaz rica para la administración física, reservaciones de espacios, cobros, e inventario de equipos tecnológicos.

### 📌 Puntos de Integración en el Proyecto

El módulo está integrado y disponible en:

1. **Dashboard Principal**:
   * **Archivo**: [page.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/page.js#L19-L24)
   * **Descripción**: Tarjeta de acceso directo con descripción: *"Gestión de laboratorios."*

2. **Menú Lateral (Sidebar)**:
   * **Archivos**: 
     * [Sidebar.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/components/Sidebar.js#L9)
     * [menu.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/lib/navigation/menu.js#L5)
   * **Descripción**: Enlace directo en el sidebar con el ícono `fa-flask`.

3. **Rutas e Interfaces de Usuario**:
   * **Vista General**: `/laboratorios` (Enlazada a [page.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/laboratorios/page.js) y al componente [LaboratoriosDashboard.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/laboratorios/LaboratoriosDashboard.js)).
   * **Vista de Detalle**: `/laboratorios/[id]` (Enlazada a [page.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/laboratorios/[id]/page.js) y al componente [LaboratorioDetail.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/laboratorios/[id]/LaboratorioDetail.js)).

---

## 🗄️ Modelo de Datos (Prisma Schema)

El módulo interactúa activamente con los siguientes modelos definidos en el archivo [schema.prisma](file:///Users/gortiz/Documents/uspg/final/webapp/prisma/schema.prisma):

* **`Laboratorio`**: Almacena el código único, nombre, descripción, ubicación física, tipo (`COMPUTACION`, `PLC_CNC`, `QUIMICA`, `FISICA`), capacidad total, fase de implementación, estado operativo (`ACTIVO`, `INACTIVO`, `MANTENIMIENTO`) y visibilidad pública.
* **`ConfiguracionDivision`**: Define si el laboratorio permite sub-divisiones físicas (por ejemplo: "Grupo completo" o sub-secciones con menor cupo).
* **`Estacion`**: Estaciones de trabajo físicas (aplicable a laboratorios industriales como PLC / CNC).
* **`Equipo`**: Inventario de hardware asignado a cada laboratorio. Registra código de inventario, nombre, si actúa como servidor y su estado (`OPERATIVO`, `MANTENIMIENTO`, `DANADO`, `BAJA`).
* **`Reserva`**: Control de solicitudes de reserva. Registra las fechas y horas de inicio y fin, cantidad de personas, propósito, estado (`PENDIENTE`, `APROBADA`, `RECHAZADA`, `COMPLETADA`, `CANCELADA`) y el usuario técnico que la resolvió.
* **`Pago`**: Registro de cobros asociados a las reservaciones o uso general de los laboratorios (montos en Quetzales, tipo de cobro, método de pago y referencia).

---

## ⚙️ Funcionalidades del Dashboard Principal (`/laboratorios`)

El panel principal está dividido en **4 pestañas interactivas** y cuenta con botones de acciones rápidas:

### 1. Panel de Resumen (`tab === 'resumen'`)
* **Tarjetas de Estadísticas**: Muestran en tiempo real el total de laboratorios, cantidad de laboratorios activos, reservas pendientes de aprobación, equipos operativos y usuarios activos.
* **Cuadrícula de Laboratorios**: Muestra tarjetas individuales de cada laboratorio con:
  * Su estado de disponibilidad en tiempo real (por ejemplo: *Disponible*, *Ocupado* o *En mantenimiento*) derivado de sus reservas activas actuales.
  * Capacidad de plazas e inventario de equipos.
  * Etiquetas de las divisiones configuradas.
  * Botón para ir al área de **"Gestionar"** (vista de detalle).

### 2. Pestaña de Reservaciones (`tab === 'reservas'`)
* Muestra el listado de reservaciones con estado `PENDIENTE`.
* Los técnicos o administradores pueden **Aprobar** o **Rechazar** (solicitando un motivo que queda guardado en la reserva) cada solicitud en tiempo real.

### 3. Pestaña de Equipos (`tab === 'equipos'`)
* Lista todo el hardware del sistema con su código de inventario, nombre, estado actual y a qué laboratorio pertenece.

### 4. Pestaña de Cobros (`tab === 'pagos'`)
* Muestra un historial de cobros procesados por concepto de cuota semestral, alquiler de horas, reservas grupales, etc.

### 💡 Modales de Acción Rápida
* **Reservar**: Permite crear una nueva solicitud de reserva. Valida automáticamente del lado del servidor que **no existan conflictos de horario** con reservas existentes aprobadas o pendientes para ese laboratorio.
* **Registrar pago**: Asocia cobros a un usuario y laboratorio específico.
* **Nuevo laboratorio**: Crea un laboratorio con su capacidad y configura su división inicial.

---

## 🔍 Funcionalidades de la Vista de Detalle (`/laboratorios/[id]`)

Al ingresar a la gestión individual de un laboratorio, el administrador tiene acceso a:

* **Pestaña General**:
  * Editar los metadatos del laboratorio (Nombre, descripción, ubicación, capacidad, visibilidad pública).
  * Cambiar el estado del laboratorio mediante un selector dinámico (Activo, Inactivo, Mantenimiento).
* **Pestaña de Equipos**:
  * Formulario para registrar y asociar nuevas piezas de hardware (computadoras, servidores, proyectores, etc.) al inventario del laboratorio.
  * Listado detallado de los equipos existentes y su estado operativo.
* **Pestaña de Reservas**: Historial completo de solicitudes de reservación del laboratorio, permitiendo procesar aquellas que estén pendientes.
* **Pestaña de Estaciones**: Lista las estaciones físicas configuradas (para laboratorios industriales).
* **Pestaña de Cobros**: Historial específico de pagos procesados correspondientes a este laboratorio.

---

## 🛠️ Lógica y Server Actions (`actions.js`)

Toda la interactividad y persistencia del módulo se ejecuta mediante Server Actions de Next.js en [actions.js](file:///Users/gortiz/Documents/uspg/final/webapp/src/app/laboratorios/actions.js):

* **`getDashboardData()`**: Consulta concurrente con `Promise.all` que recopila toda la información de laboratorios, reservas, estadísticas y pagos recientes para la carga instantánea del dashboard.
* **`getLaboratorioById(id)`**: Obtiene de forma única un laboratorio y todas sus relaciones anidadas filtradas.
* **`crearLaboratorio(formData)`**: Valida campos obligatorios y realiza la creación con su configuración de grupo completo correspondiente.
* **`crearReserva(formData)`**: Implementa la lógica de prevención de colisiones horarias utilizando consultas de fecha traslapada (`lt`/`gt`).
* **`resolverReserva(reservaId, accion, motivo)`**: Modifica el estado de una reserva (`APROBADA`/`RECHAZADA`/`CANCELADA`) y asocia el ID del técnico que realiza la acción.
