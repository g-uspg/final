# Integración institucional — Módulo Laboratorios (Grupo 3)

Este documento describe cómo el portal de laboratorios se conecta con los demás módulos del monorepo USPG: identidad institucional (QR/carné), matrícula (Grupo 6), académico (Grupo 1), facturación mensual y auditoría blockchain.

---

## Módulos conectados

| Grupo / Schema | Responsabilidad | Cómo se usa en laboratorios |
|----------------|-----------------|------------------------------|
| **auth** (`User`) | Login JWT, `qr_code`, `carnet`, `parqueo_user_id` | El QR del carné digital resuelve al usuario; vincula con `grupo3_laboratorios.usuario.parqueo_user_id` |
| **grupo1_academico** (`Alumno`) | Inscripción universitaria, carné académico | Verifica que el estudiante exista e esté inscrito |
| **grupo6_pago_alumnos** (`matricula`, `mensualidad`) | Matrícula semestral y solvencia | Gate de acceso: matrícula `Confirmado` del semestre actual + sin mora |
| **grupo3_laboratorios** | Reservas, sesiones, pagos lab, facturas | Portal principal, registro de uso y cobro |
| **grupo5_parqueo** (blockchain compartido) | Contrato Polygon Amoy vía `blockchain.js` | Ancla hashes de eventos lab (`LAB_QR_*`, `LAB_SESSION_*`) |

> **Grupo 6** no está en el schema Prisma; se consulta con SQL directo (`integracion-grupo6.js`) sobre las tablas `grupo6_pago_alumnos.*`.

---

## Flujo de elegibilidad (¿puede reservar / usar lab?)

```
Estudiante inicia sesión (JWT auth)
        │
        ▼
getOrCreateLabUsuario()  ──► grupo3.usuario (parqueoUserId, carnet cache)
        │
        ▼
getLabEligibility()
        │
        ├─► grupo1 Alumno (inscripción por carnet/email/parqueo_user_id)
        ├─► grupo6 matricula (ciclo I/II + año, estado Confirmado)
        ├─► grupo6 mensualidad (sin cuotas Pendiente/Vencido/Parcial)
        └─► grupo3 pago CUOTA_SEMESTRAL lab (opcional → modo INCLUIDO)
        │
        ▼
canReserve: true/false + modoCobro
```

### Reglas de negocio

| Condición | Resultado |
|-----------|-----------|
| Admin / catedrático | Acceso total (`modoCobro: ADMIN`) |
| No inscrito (Grupo 1) | **Bloqueado** |
| Sin matrícula semestre actual (Grupo 6) | **Bloqueado** |
| Mensualidades pendientes (Grupo 6) | **Bloqueado** |
| Matrícula OK + cuota lab semestral pagada | `INCLUIDO` (sin cobro por hora) |
| Matrícula OK, sin cuota lab | `FACTURACION_MENSUAL` |
| Externo / evento | `PAGO_HORA` (si categoría lo permite) |

**Semestre actual:** ciclo **I** (enero–junio), ciclo **II** (julio–diciembre) del año en curso (`semestre.js`).

---

## QR institucional (carné digital)

### Endpoint

```
POST /api/laboratorios/qr/verificar
Content-Type: application/json

{
  "code": "<qr_code del carné>",
  "reservaId": "uuid-opcional",
  "laboratorioId": 1
}
```

### Proceso

1. Busca `auth.User` por `qr_code` (mismo patrón que parqueo).
2. Resuelve carné → `grupo1 Alumno` si falta en auth.
3. Ejecuta `getLabEligibility` + verificación Grupo 6.
4. Opcional: valida reserva remota (fila B).
5. Ancla evento `LAB_QR_VERIFICADO_OK` o `LAB_QR_VERIFICADO_DENEGADO` en blockchain.
6. Responde JSON con `puedeUsarLab`, datos del estudiante y estado institucional.

### Ejemplo curl

```bash
curl -X POST http://localhost:3000/api/laboratorios/qr/verificar \
  -H "Content-Type: application/json" \
  -d '{"code":"QR-DEL-CARNET-DEL-ESTUDIANTE"}'
```

---

## Facturación mensual (Grupo 3)

### Tablas nuevas

- **`factura_mensual_lab`**: consolidado por `usuario_id + mes + anio`
- **`pago.factura_mensual_id`**: enlaza cada cargo al consolidado del mes

### Flujo de cobro

1. Estudiante con `FACTURACION_MENSUAL` cierra sesión remota.
2. `registrarCobroSesionLab()` crea `pago` (PENDIENTE) y acumula en factura ABIERTA del mes.
3. El dashboard muestra total pendiente + detalle del mes (sesiones, minutos).
4. Admin cierra el mes:

```
POST /api/laboratorios/facturacion/cierre
Authorization: (JWT admin)

{ "mes": 6, "anio": 2026 }
```

Estado factura: `ABIERTA` → `CERRADA` → `PAGADA` (manual / integración futura con Grupo 6).

**Tarifa remota:** Q 25/hora (`sesion-remota.js`).

---

## Blockchain (auditoría)

Reutiliza `src/lib/blockchain.js` (Polygon Amoy). **No guarda PII en cadena**, solo hash SHA-256 del payload.

| Evento | Cuándo |
|--------|--------|
| `LAB_QR_VERIFICADO_OK` / `DENEGADO` | Scan QR en recepción |
| `LAB_SESSION_START` | Inicio sesión remota |
| `LAB_SESSION_END` | Cierre sesión + monto |

Registro local: `grupo3_laboratorios.blockchain_audit_lab`.

Variables de entorno (compartidas con parqueo):

```env
BLOCKCHAIN_RPC_URL=
BLOCKCHAIN_PRIVATE_KEY=
BLOCKCHAIN_CONTRACT_ADDRESS=
```

Si no están configuradas, el módulo funciona igual; los audits locales quedan con `status: FAILED`.

---

## Archivos clave

| Archivo | Función |
|---------|---------|
| `src/lib/laboratorios/integracion-grupo6.js` | SQL Grupo 6 + resolución carné |
| `src/lib/laboratorios/usuario-lab.js` | Elegibilidad unificada |
| `src/lib/laboratorios/qr-institucional.js` | Verificación QR |
| `src/lib/laboratorios/facturacion-mensual.js` | Facturas y cobros |
| `src/lib/laboratorios/blockchain-lab.js` | Anclaje de eventos |
| `src/app/api/laboratorios/qr/verificar/route.js` | API QR |
| `src/app/api/laboratorios/facturacion/cierre/route.js` | Cierre mensual admin |

---

## Diagrama de base de datos (dbdiagram.io)

Copia el bloque siguiente en [https://dbdiagram.io](https://dbdiagram.io) para visualizar las relaciones lógicas entre schemas.

```dbml
// ═══════════════════════════════════════════════════════════════
// USPG — Integración Laboratorios (Grupo 3) con módulos externos
// Pegar en https://dbdiagram.io
// ═══════════════════════════════════════════════════════════════

Project USPG_Laboratorios_Integracion {
  database_type: 'PostgreSQL'
  Note: 'Relaciones lógicas cross-schema. FKs reales solo dentro de cada schema.'
}

// ─── AUTH (identidad / QR carné) ───────────────────────────────
Table auth.users as User {
  id uuid [pk]
  email varchar [unique]
  carnet varchar [unique, note: 'Carné institucional']
  qr_code varchar [unique, note: 'Código QR del carné digital']
  role varchar
  is_active boolean
}

// ─── GRUPO 1 — Académico ───────────────────────────────────────
Table grupo1_academico.Alumno as Alumno {
  id int [pk]
  carnet varchar [unique]
  nombre varchar
  apellido varchar
  email varchar [unique]
  parqueo_user_id uuid [note: '→ auth.users.id']
  carreraId int
}

Table grupo1_academico.Carrera as Carrera {
  id int [pk]
  codigo varchar
  nombre varchar
}

Ref: Alumno.carreraId > Carrera.id
Ref: Alumno.parqueo_user_id - User.id [note: 'Vínculo lógico JWT/parqueo']

// ─── GRUPO 6 — Pagos alumnos (SQL directo, sin Prisma) ───────────
Table grupo6_pago_alumnos.matricula as MatriculaG6 {
  id_matricula int [pk]
  carnet varchar [note: '→ Alumno.carnet']
  ciclo varchar [note: 'I o II']
  anio int
  estado varchar [note: 'Confirmado']
  fecha_pago date
  precio decimal
}

Table grupo6_pago_alumnos.mensualidad as MensualidadG6 {
  id_mensualidad int [pk]
  carnet varchar
  mes int
  anio int
  precio decimal
  estado_pago varchar [note: 'Pagado|Pendiente|Vencido|Parcial']
  monto_mora decimal
}

Ref: MatriculaG6.carnet - Alumno.carnet [note: 'Mismo carné, sin FK física']
Ref: MensualidadG6.carnet - Alumno.carnet

// ─── GRUPO 3 — Laboratorios ─────────────────────────────────────
Table grupo3_laboratorios.usuario as UsuarioLab {
  id uuid [pk]
  correo varchar [unique]
  nombre varchar
  carnet varchar [note: 'Cache del carné académico']
  parqueo_user_id uuid [note: '→ auth.users.id']
  categoria varchar
  sancionado boolean
  activo boolean
}

Table grupo3_laboratorios.reserva as Reserva {
  id uuid [pk]
  usuario_id uuid
  laboratorio_id int
  fecha_inicio timestamp
  fecha_fin timestamp
  estado varchar
}

Table grupo3_laboratorios.sesion_uso as SesionUso {
  id uuid [pk]
  usuario_id uuid
  laboratorio_id int
  tipo_conexion varchar [note: 'PRESENCIAL|REMOTA']
  inicio timestamp
  fin timestamp
  registro_actividad jsonb
}

Table grupo3_laboratorios.pago as PagoLab {
  id uuid [pk]
  usuario_id uuid
  laboratorio_id int
  reserva_id uuid
  monto decimal
  tipo_cobro varchar [note: 'CUOTA_SEMESTRAL|PAGO_HORA|FACTURACION_MENSUAL']
  estado varchar [note: 'PENDIENTE|PAGADO']
  factura_mensual_id uuid
}

Table grupo3_laboratorios.factura_mensual_lab as FacturaMensualLab {
  id uuid [pk]
  usuario_id uuid
  mes int
  anio int
  total_sesiones int
  total_minutos int
  total_monto decimal
  estado varchar [note: 'ABIERTA|CERRADA|PAGADA']
  fecha_cierre timestamp
}

Table grupo3_laboratorios.blockchain_audit_lab as BlockchainAuditLab {
  id uuid [pk]
  sesion_id uuid
  usuario_id uuid
  action varchar [note: 'LAB_QR_* | LAB_SESSION_*']
  data_hash varchar
  tx_hash varchar
  network varchar
  status varchar
}

Ref: UsuarioLab.parqueo_user_id - User.id
Ref: Reserva.usuario_id > UsuarioLab.id
Ref: SesionUso.usuario_id > UsuarioLab.id
Ref: SesionUso.id < BlockchainAuditLab.sesion_id
Ref: UsuarioLab.id < BlockchainAuditLab.usuario_id
Ref: PagoLab.usuario_id > UsuarioLab.id
Ref: PagoLab.factura_mensual_id > FacturaMensualLab.id
Ref: FacturaMensualLab.usuario_id > UsuarioLab.id

// ─── Cadena de verificación institucional ───────────────────────
TableGroup verificacion_institucional {
  User
  Alumno
  MatriculaG6
  MensualidadG6
  UsuarioLab
}

Note verificacion_institucional {
  '''
  Flujo QR:
  User.qr_code → User.carnet / Alumno.carnet
  → matricula (semestre actual, Confirmado)
  → mensualidad (sin mora)
  → UsuarioLab elegible → reserva / sesión
  '''
}
```

---

## Prueba rápida (examen)

1. **Vincular cuenta demo** (si falta inscripción/matrícula): `npm run seed:lab-estudiantes` en `webapp/`.
2. **Registrar matrícula** en `/pagos-alumnos` para el carné del estudiante demo (ciclo y año actuales, estado Confirmado) — opcional si ya corrió el seed.
3. Iniciar sesión como `est002@uspg.edu.gt` / `Student2026!` (carné `2021-0002`, QR `USP-QR-EST-002`).
4. En `/laboratorios` debe aparecer banner verde de matrícula verificada.
5. Reservar butaca fila B → aprobar como admin → conectar remotamente.
6. Al desconectar, revisar `factura_mensual_lab` y `blockchain_audit_lab`.
7. Probar QR: `POST /api/laboratorios/qr/verificar` con el `qr_code` del usuario en `auth.users`.

---

## Limitaciones conocidas

- Grupo 6 se consulta por SQL; cambios de esquema en pagos-alumnos requieren actualizar `integracion-grupo6.js`.
- Blockchain es opcional (sin env vars no falla el flujo).
- El cierre de factura mensual lab aún no se integra automáticamente con recibos Grupo 6 (extensión futura).
