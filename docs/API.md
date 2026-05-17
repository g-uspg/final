# Smart Parking USPG — Documentación de API
**Grupo 5 | Universidad San Pablo de Guatemala**  
Base URL: `http://localhost:3000/api/parqueo`  
Autenticación: `Authorization: Bearer <JWT>`

---

## Autenticación

### POST /auth/login
Iniciar sesión con email y contraseña.

**Auth:** Pública  
**Body:**
```json
{ "email": "admin@uspg.edu.gt", "password": "Admin2026!" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": { "id": "...", "role": "ADMIN", "first_name": "José" }
  }
}
```
**Errores:** `400` campos faltantes · `401` credenciales inválidas

### POST /auth/register
Registrar nuevo usuario.

**Auth:** Pública  
**Body:**
```json
{ "email": "est003@uspg.edu.gt", "password": "Student2026!", "first_name": "Luis", "last_name": "Ramos", "role": "STUDENT", "carnet": "2021-0003" }
```
**Errores:** `409` email o carnet ya registrado

---

## Espacios

### GET /spaces
Listar espacios con filtros.

**Auth:** Pública  
**Query:** `?campus_id=&zone=A&status=AVAILABLE&type=STANDARD&page=1&limit=50`  
**Response 200:** `{ total, page, limit, data: [ParkingSpace] }`

### GET /spaces/available
Espacios disponibles agrupados por zona.

**Auth:** Pública  
**Response 200:** `{ A: { total, available }, B: {...}, C: {...}, D: {...} }`

### GET /spaces/:id
Detalle de un espacio.

### PATCH /spaces/:id
Actualizar espacio (estado, tipo, posición).

**Auth:** ADMIN  
**Body:** `{ "status": "MAINTENANCE" }`

### POST /spaces/sensor
Actualizar estado por sensor IoT.

**Auth:** Pública (llamada interna)  
**Body:** `{ "space_code": "A-001", "status": "OCCUPIED" }`

### GET /spaces/status
Estado global del parqueo.

### PATCH /spaces/:id/position
Actualizar coordenadas lat/lng del espacio.

---

## Sesiones

### POST /sessions
Registrar entrada de vehículo.

**Auth:** Pública (llamada desde garita)  
**Body:**
```json
{ "vehicle_id": "...", "space_id": "...", "entry_method": "QR", "operator_id": "..." }
```
**Lógica:** Verifica blacklist → verifica evento activo → verifica suscripción → crea sesión  
**Response 201:** sesión creada con `amount_due` ya calculado si es FLAT_RATE  
**Errores:** `400` vehículo en blacklist · `400` espacio no disponible · `409` ya tiene sesión activa

### POST /sessions/:id/exit
Registrar salida y calcular cobro.

**Auth:** Pública (llamada desde garita)  
**Body:** `{ "operator_id": "..." }`  
**Lógica:** Suscripción activa → amount_due=0 · Evento FLAT_RATE → tarifa plana · Normal → rol × minutos  
**Response 200:** sesión completada con monto final  
**Efectos secundarios:** actualiza/crea `MonthlyBill` del mes

### GET /sessions
Listar sesiones con filtros.

**Auth:** ADMIN, SECURITY  
**Query:** `?status=ACTIVE&vehicle_id=&page=1&limit=20`

### GET /sessions/active
Sesiones activas en este momento.

**Auth:** ADMIN, SECURITY

### GET /sessions/history
Historial de sesiones completadas.

**Auth:** ADMIN

### GET /sessions/:id
Detalle de una sesión.

### GET /sessions/:id/ticket
Ticket de la sesión (para impresión).

---

## Pagos

### GET /payments
Listar pagos.

**Auth:** ADMIN

### POST /payments
Registrar pago de sesión.

**Auth:** Cualquier rol autenticado  
**Body:** `{ "session_id": "...", "amount": 25.00, "payment_method": "CASH" }`

### GET /payments/:id
Detalle de pago.

### POST /payments/:id/confirm
Confirmar pago.

**Auth:** ADMIN, SECURITY

### POST /payments/:id/refund
Reembolsar pago.

**Auth:** ADMIN

---

## Reservas

### GET /reservations
Listar reservas.

**Auth:** Cualquier rol (ADMIN/SECURITY ven todas, otros solo las propias)

### POST /reservations
Crear reserva.

**Auth:** Cualquier rol autenticado  
**Body:**
```json
{
  "space_id": "...",
  "vehicle_id": "...",
  "start_time": "2026-06-15T08:00:00Z",
  "end_time": "2026-06-15T10:00:00Z",
  "type": "STANDARD"
}
```
**Errores:** `400` start_time en el pasado · `409` espacio no disponible

### GET /reservations/:id
Detalle de reserva.

### DELETE /reservations/:id
Cancelar reserva y liberar espacio.

**Auth:** Propietario o ADMIN/SECURITY  
**Errores:** `403` no autorizado · `400` estado no permite cancelación

### POST /reservations/:id/cancel
Cancelar reserva (alternativo vía POST).

---

## Vehículos

### GET /vehicles
Listar vehículos con filtros.

**Query:** `?blacklisted=false&search=P123&page=1&limit=20`

### POST /vehicles
Registrar vehículo.

**Body:** `{ "placa": "P123ABC", "brand": "Toyota", "model": "Hilux", "color": "Blanco", "year": 2022 }`  
**Errores:** `409` placa ya registrada

### GET /vehicles/:id
Detalle de vehículo.

### PATCH /vehicles/:id
Actualizar datos del vehículo.

**Auth:** ADMIN

### POST /vehicles/:id/blacklist
Agregar a lista negra.

**Auth:** ADMIN, SECURITY  
**Body:** `{ "reason": "Infracciones reiteradas" }`

### POST /vehicles/:id/authorize
Autorizar vehículo (retirar blacklist).

**Auth:** ADMIN

### POST /vehicles/:id/unauthorize
Quitar autorización.

**Auth:** ADMIN

### GET /vehicles/search
Buscar vehículo por placa.

**Query:** `?q=P123`

---

## Usuarios

### GET /users
Listar usuarios.

**Auth:** ADMIN

### GET /users/:id
Detalle de usuario.

**Auth:** ADMIN o propio usuario

### PATCH /users/:id
Actualizar datos de usuario.

**Auth:** ADMIN

### POST /users/:id/toggle-active
Activar/desactivar usuario.

**Auth:** ADMIN

### GET /users/:id/sessions
Historial de sesiones del usuario.

**Auth:** ADMIN o propio usuario

### GET /users/:id/vehicles
Vehículos del usuario.

### GET /users/:id/qr
QR code del usuario.

### PATCH /users/:id/nfc
Actualizar token NFC del usuario.

**Auth:** ADMIN, SECURITY

---

## QR

### POST /qr/scan
Escanear QR para validar acceso.

**Body:** `{ "qr_code": "QR-STUDENT-001" }`  
**Response 200:** info del usuario o vehículo  
**Errores:** `403` QR inválido o expirado (NO 401, para no redirigir al login)

### POST /qr/validate
Validar QR sin registrar entrada.

### POST /qr/visitor
Generar QR para visitante.

**Body:**
```json
{ "visitor_name": "Juan Pérez", "vehicle_plate": "P999AAA", "purpose": "Reunión", "valid_hours": 8 }
```
**Response 201:** `{ ...visitor, qr_image: "data:image/png;base64,..." }`

### GET /qr/visitor
Listar QRs de visitantes.

---

## Dashboard

### GET /dashboard
Resumen general: ocupación, ingresos del día, alertas.

### GET /dashboard/traffic
Tráfico por hora (últimas 24 horas).

### GET /dashboard/activity
Actividad reciente.

### GET /dashboard/alerts
Alertas activas del sistema.

---

## Reportes

### GET /reports
Reporte completo por rango de fechas.

**Query:** `?date_from=2026-05-01&date_to=2026-05-31`  
**Response:** `{ stats, by_zone, daily_income, top_users }`

### GET /reports/revenue
Ingresos en rango de fechas.

### GET /reports/occupancy
Ocupación por zona.

### GET /reports/top-users
Top usuarios por tiempo y gasto.

### GET /reports/daily
Resumen diario.

### GET /reports/monthly
Resumen mensual.

### GET /reports/prediction
Predicción de ocupación.

### GET /reports/export
Exportar reporte (CSV).

---

## Seguridad

### GET /security/audit
Log de auditoría.

**Auth:** ADMIN

### GET /security/blacklist
Lista negra activa.

**Auth:** ADMIN, SECURITY

### GET /security/failed-attempts
Intentos de acceso fallidos.

**Auth:** ADMIN, SECURITY

### GET /security/suspicious
Actividad sospechosa.

**Auth:** ADMIN

---

## Barreras

### GET /barriers
Estado de todas las barreras.

> **Nota:** El estado se almacena en memoria del servidor. Se reinicia con cada reinicio. El historial persiste en `BarrierLog`.

### POST /barriers/:id/command
Enviar comando a barrera.

**Auth:** ADMIN, SECURITY  
**Body:** `{ "action": "OPEN", "notes": "Apertura manual" }`

### GET /barriers/logs
Historial de comandos a barreras.

---

## Notificaciones

### GET /notifications
Listar notificaciones del usuario autenticado.

**Auth:** Requerida

### POST /notifications/:id/read
Marcar notificación como leída.

### POST /notifications/read-all
Marcar todas como leídas.

---

## Solvencia

### GET /solvencia/:carnet
Verificar solvencia de parqueo de un estudiante.

**Auth:** Pública (endpoint de integración para Grupo 6)  
**Params:** `carnet` — carnet del estudiante (ej: `2021-0001`)  
**Response 200:**
```json
{
  "success": true,
  "data": {
    "carnet": "2021-0001",
    "usuario": { "nombre": "Carlos Pérez", "rol": "STUDENT" },
    "al_dia": true,
    "tiene_suscripcion_activa": true,
    "suscripcion": {
      "type": "SEMESTER",
      "vence": "2026-12-01T00:00:00Z",
      "dias_restantes": 180
    },
    "deuda_pendiente": 0,
    "sesiones_sin_pagar": 0,
    "ultima_actividad": "2026-05-14T10:30:00Z"
  }
}
```
**Errores:** `200` con `al_dia: false, razon: "carnet_no_registrado"` si el carnet no existe

---

## Suscripciones

### GET /subscriptions
Listar suscripciones.

**Auth:** ADMIN/SECURITY ven todas; otros ven solo las propias  
**Query:** `?status=ACTIVE&type=SEMESTER&user_id=&page=1&limit=20`

### POST /subscriptions
Crear suscripción.

**Auth:** Requerida  
**Body:**
```json
{ "user_id": "...", "type": "MONTHLY", "start_date": "2026-06-01", "amount_paid": 150.00, "payment_reference": "REF-001" }
```
**Lógica:** MONTHLY = 30 días, SEMESTER = 180 días  
**Errores:** `409` ya tiene suscripción activa

### GET /subscriptions/:id
Detalle de suscripción.

### PATCH /subscriptions/:id
Cancelar suscripción (status → CANCELLED).

**Auth:** ADMIN

### GET /subscriptions/check
Verificar si el usuario autenticado tiene suscripción vigente.

**Auth:** Requerida  
**Response:** `{ has_active: true, subscription: {...}, days_remaining: 45 }`

---

## Eventos Especiales

### GET /events
Listar eventos con filtros.

**Auth:** Pública  
**Query:** `?status=SCHEDULED&date_from=2026-06-01&date_to=2026-06-30`

### POST /events
Crear evento especial.

**Auth:** ADMIN  
**Body:**
```json
{
  "name": "Graduación Junio 2026",
  "event_date": "2026-06-15",
  "start_time": "2026-06-15T06:00:00-06:00",
  "end_time": "2026-06-15T22:00:00-06:00",
  "tariff_mode": "FLAT_RATE",
  "flat_rate": 25.00,
  "affected_zones": "A,B,C,D",
  "uses_external_parking": true,
  "external_parking_name": "Terreno Auxiliar Norte",
  "shuttle_available": true
}
```
**Errores:** `400` flat_rate requerido si tariff_mode=FLAT_RATE

### GET /events/:id
Detalle de evento.

### PATCH /events/:id
Actualizar evento.

**Auth:** ADMIN

### DELETE /events/:id
Cancelar evento (status → CANCELLED).

**Auth:** ADMIN

### GET /events/active
Evento activo en este momento.

**Auth:** Pública  
**Uso:** El sistema de cobro consulta esto en cada entrada/salida para aplicar tarifa especial.  
**Response:** evento + `tarifa_aplicable: { modo, monto }` o `null` si no hay evento activo

---

## Facturación Mensual

### GET /billing
Listar todas las facturas.

**Auth:** ADMIN  
**Query:** `?status=OPEN&month=5&year=2026&user_id=`

### GET /billing/:id
Detalle de factura.

### PATCH /billing/:id
Pagar factura.

**Auth:** Propietario o ADMIN  
**Body:** `{ "payment_reference": "REF-PAY-001" }`  
**Errores:** `409` ya está pagada

### GET /billing/my
Facturas del usuario autenticado.

**Auth:** Requerida  
**Response:** facturas ordenadas por year DESC, month DESC

---

## Reposición de Tarjetas

### GET /cards/replace
Historial de reposiciones.

**Auth:** ADMIN

### POST /cards/replace
Reponer/reasignar tarjeta NFC.

**Auth:** ADMIN, SECURITY  
**Body:**
```json
{
  "user_id": "...",
  "reason": "LOST",
  "old_nfc_token": "NFC-STUDENT-001",
  "new_nfc_token": "NFC-NEW-001",
  "notes": "Reportó pérdida en ventanilla"
}
```
**Lógica:**
- Si reason=REASSIGNMENT: desactiva token del usuario anterior
- Si reason≠REASSIGNMENT: genera cobro de Q50.00
- Siempre registra en AuditLog  

**Errores:** `404` usuario no encontrado · `403` no autorizado

---

## INTEGRACIÓN CON OTROS SISTEMAS

### Endpoints que consumimos del Grupo 1 — Sistema Académico

**Base URL del Grupo 1:** `http://localhost:3001/api/academico`

```
GET /academico/alumnos/:carnet
→ { exists: bool, nombre: string, rol: string, carrera: string, estado: string }
```

**Uso:** Validar que el carnet existe en el sistema académico antes de registrar un usuario nuevo.  
**Manejo de errores:** Si el servicio del Grupo 1 no responde, el registro continúa pero se marca como `pendiente_validacion_academica`.

---

### Endpoints que exponemos para el Grupo 6 — Pagos y Solvencias

```
GET /api/parqueo/solvencia/:carnet
```

Este es el endpoint **crítico** para que el Grupo 6 pueda emitir la solvencia total del alumno.

**Autenticación entre sistemas:** Ninguna (endpoint público). Para producción se recomienda un API key compartido via header `X-System-Key`.

**Contrato de respuesta garantizado:**
```json
{
  "success": true,
  "data": {
    "carnet": "2021-0001",
    "al_dia": true,
    "tiene_suscripcion_activa": true,
    "deuda_pendiente": 0.00,
    "sesiones_sin_pagar": 0
  }
}
```

Si `al_dia: false` → el alumno **no puede** obtener solvencia general.  
Si `razon: "carnet_no_registrado"` → el alumno no está registrado en el sistema de parqueo (no bloquea solvencia si el grupo lo decide así).

---

### Endpoints que exponemos para el Grupo 7 — Servicios Móviles e Integrador

**Base URL:** `http://localhost:3000/api/parqueo`  
**Autenticación:** `Authorization: Bearer <JWT>` obtenido de `POST /auth/login`

Endpoints principales para la app móvil:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/login | Autenticación |
| GET | /spaces/available | Espacios disponibles |
| GET | /sessions/active | Mis sesiones activas |
| POST | /qr/scan | Validar QR de entrada |
| GET | /subscriptions/check | Verificar mi suscripción |
| GET | /billing/my | Mis facturas |
| GET | /notifications | Mis notificaciones |
| GET | /events/active | Evento activo actual |
| GET | /solvencia/:carnet | Consultar solvencia |

**Formato de autenticación:** Token JWT en header `Authorization: Bearer <token>`.  
El token expira en 1 hora. Usar `POST /auth/refresh` con el refresh_token para renovar.

**Manejo de errores estándar:**
```json
{ "success": false, "message": "Descripción del error" }
```

Códigos de estado: `200` OK · `201` Creado · `400` Error de validación · `401` No autenticado · `403` Sin permisos · `404` No encontrado · `409` Conflicto

**Nota importante:** El código `401` redirige al login en la webapp. Para integraciones externas, manejar `403` para accesos denegados sin afectar la sesión del usuario.
