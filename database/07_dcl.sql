-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 07_dcl.sql — Data Control Language (DCL)
-- Sublenguaje: GRANT / REVOKE / CREATE ROLE
-- Controla quién puede hacer qué sobre los objetos de la base de datos
-- Alineado con ISO/IEC 27001 Control A.8.2 (Derechos de acceso privilegiado)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: CREAR ROLES DE BASE DE DATOS
-- Los roles de BD corresponden a los roles de la aplicación (tabla User.role)
-- ─────────────────────────────────────────────────────────────────────────────

-- Rol para administradores del sistema
CREATE ROLE rol_admin
  NOSUPERUSER     -- No tiene privilegios de superusuario
  NOCREATEDB      -- No puede crear bases de datos
  NOCREATEROLE    -- No puede crear nuevos roles
  LOGIN           -- Puede iniciar sesión
  PASSWORD 'Admin_USPG_2026!';

-- Rol para guardias de seguridad
CREATE ROLE rol_security
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'Security_USPG_2026!';

-- Rol para docentes
CREATE ROLE rol_teacher
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'Teacher_USPG_2026!';

-- Rol para estudiantes
CREATE ROLE rol_student
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'Student_USPG_2026!';

-- Rol para sensores IoT (ESP32) — solo puede actualizar espacios
CREATE ROLE rol_sensor_iot
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'IoT_Sensor_USPG_2026!';

-- Rol de solo lectura para reportes externos (Business Intelligence)
CREATE ROLE rol_reportes
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'Reportes_USPG_2026!';

-- Rol base para la aplicación Next.js (Prisma ORM)
-- Es el rol principal que usa la aplicación web
CREATE ROLE rol_aplicacion
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN
  PASSWORD 'App_USPG_Prisma_2026!';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 2: PRIVILEGIOS PARA rol_aplicacion
-- Este rol es usado por Prisma ORM (Next.js) — necesita acceso completo
-- a las tablas de negocio para ejecutar las API Routes
-- ─────────────────────────────────────────────────────────────────────────────

-- Tablas core — acceso completo (SELECT, INSERT, UPDATE, DELETE)
GRANT SELECT, INSERT, UPDATE, DELETE ON "User"                TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Vehicle"             TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSpace"        TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSession"      TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Payment"             TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Reservation"         TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSubscription" TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingEvent"        TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Notification"        TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "MonthlyBill"         TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CardReplacement"     TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "VisitorQR"           TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Blacklist"           TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "BarrierLog"          TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AuditLog"            TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Camera"              TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Campus"              TO rol_aplicacion;

-- Vistas — solo lectura (las vistas agregan datos, no se modifican directamente)
GRANT SELECT ON view_sesiones_activas   TO rol_aplicacion;
GRANT SELECT ON view_ingresos_del_dia   TO rol_aplicacion;
GRANT SELECT ON view_ocupacion_por_zona TO rol_aplicacion;
GRANT SELECT ON view_usuarios_con_deuda TO rol_aplicacion;
GRANT SELECT ON view_solvencia_parqueo  TO rol_aplicacion;
GRANT SELECT ON view_eventos_activos    TO rol_aplicacion;

-- Stored Procedures y Funciones — permiso de ejecución
GRANT EXECUTE ON FUNCTION sp_registrar_entrada(TEXT, TEXT, TEXT)   TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION sp_registrar_salida(TEXT)                TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION sp_verificar_solvencia(TEXT)             TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION sp_cerrar_mes(INT, INT)                  TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION sp_renovar_suscripcion(TEXT, TEXT, TEXT) TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION fn_calcular_tarifa(TEXT, INT, TEXT)      TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION fn_espacio_disponible(TEXT, TEXT)        TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT)        TO rol_aplicacion;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)                     TO rol_aplicacion;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: PRIVILEGIOS PARA rol_admin
-- El administrador puede leer y modificar todo, incluyendo configuración
-- Principio de menor privilegio: no tiene acceso a objetos del sistema
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON "User"                TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Vehicle"             TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSpace"        TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSession"      TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Payment"             TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Reservation"         TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingSubscription" TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ParkingEvent"        TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "MonthlyBill"         TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Notification"        TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CardReplacement"     TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "VisitorQR"           TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Blacklist"           TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "BarrierLog"          TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Camera"              TO rol_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Campus"              TO rol_admin;

-- AuditLog: el admin puede leer pero NO modificar ni borrar (integridad forense)
GRANT SELECT ON "AuditLog" TO rol_admin;

-- Todas las vistas
GRANT SELECT ON view_sesiones_activas   TO rol_admin;
GRANT SELECT ON view_ingresos_del_dia   TO rol_admin;
GRANT SELECT ON view_ocupacion_por_zona TO rol_admin;
GRANT SELECT ON view_usuarios_con_deuda TO rol_admin;
GRANT SELECT ON view_solvencia_parqueo  TO rol_admin;
GRANT SELECT ON view_eventos_activos    TO rol_admin;

-- Todos los SPs y funciones
GRANT EXECUTE ON FUNCTION sp_registrar_entrada(TEXT, TEXT, TEXT)   TO rol_admin;
GRANT EXECUTE ON FUNCTION sp_registrar_salida(TEXT)                TO rol_admin;
GRANT EXECUTE ON FUNCTION sp_verificar_solvencia(TEXT)             TO rol_admin;
GRANT EXECUTE ON FUNCTION sp_cerrar_mes(INT, INT)                  TO rol_admin;
GRANT EXECUTE ON FUNCTION sp_renovar_suscripcion(TEXT, TEXT, TEXT) TO rol_admin;
GRANT EXECUTE ON FUNCTION fn_calcular_tarifa(TEXT, INT, TEXT)      TO rol_admin;
GRANT EXECUTE ON FUNCTION fn_espacio_disponible(TEXT, TEXT)        TO rol_admin;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT)        TO rol_admin;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)                     TO rol_admin;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 4: PRIVILEGIOS PARA rol_security (Guardias)
-- El guardia puede: ver sesiones, registrar entradas/salidas, gestionar
-- blacklist y barreras. NO puede ver datos financieros de otros ni
-- modificar tarifas, usuarios ni configuración del campus.
-- ─────────────────────────────────────────────────────────────────────────────

-- Lectura de datos necesarios para su trabajo
GRANT SELECT ON "User"           TO rol_security;
GRANT SELECT ON "Vehicle"        TO rol_security;
GRANT SELECT ON "ParkingSpace"   TO rol_security;
GRANT SELECT ON "ParkingSession" TO rol_security;
GRANT SELECT ON "Reservation"    TO rol_security;
GRANT SELECT ON "VisitorQR"      TO rol_security;
GRANT SELECT ON "Notification"   TO rol_security;
GRANT SELECT ON "Camera"         TO rol_security;

-- Puede crear y actualizar sesiones (entrada/salida vehicular)
GRANT INSERT, UPDATE ON "ParkingSession" TO rol_security;

-- Puede actualizar el estado de los espacios
GRANT UPDATE ON "ParkingSpace" TO rol_security;

-- Puede crear QR de visitantes y marcarlos como usados
GRANT INSERT, UPDATE ON "VisitorQR" TO rol_security;

-- Puede gestionar la lista negra (agregar/desactivar)
GRANT SELECT, INSERT, UPDATE ON "Blacklist" TO rol_security;

-- Puede actualizar el campo blacklisted en Vehicle
GRANT UPDATE ON "Vehicle" TO rol_security;

-- Puede enviar comandos a barreras
GRANT SELECT, INSERT ON "BarrierLog" TO rol_security;

-- Puede leer el AuditLog para investigar incidentes
GRANT SELECT ON "AuditLog" TO rol_security;

-- Puede crear notificaciones
GRANT INSERT ON "Notification" TO rol_security;

-- Vistas relevantes para el guardia
GRANT SELECT ON view_sesiones_activas   TO rol_security;
GRANT SELECT ON view_ocupacion_por_zona TO rol_security;
GRANT SELECT ON view_solvencia_parqueo  TO rol_security;
GRANT SELECT ON view_eventos_activos    TO rol_security;

-- Funciones que necesita
GRANT EXECUTE ON FUNCTION sp_registrar_entrada(TEXT, TEXT, TEXT) TO rol_security;
GRANT EXECUTE ON FUNCTION sp_registrar_salida(TEXT)              TO rol_security;
GRANT EXECUTE ON FUNCTION sp_verificar_solvencia(TEXT)           TO rol_security;
GRANT EXECUTE ON FUNCTION fn_espacio_disponible(TEXT, TEXT)      TO rol_security;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT)      TO rol_security;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)                   TO rol_security;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 5: PRIVILEGIOS PARA rol_teacher (Docentes)
-- El docente puede: ver sus propias sesiones y reservas, crear reservas,
-- gestionar sus suscripciones. NO puede ver datos de otros usuarios.
-- ─────────────────────────────────────────────────────────────────────────────

-- Solo lectura en tablas de referencia
GRANT SELECT ON "ParkingSpace" TO rol_teacher;
GRANT SELECT ON "Campus"       TO rol_teacher;
GRANT SELECT ON "ParkingEvent" TO rol_teacher;

-- Sus propias reservas (filtrado en la app por user_id)
GRANT SELECT, INSERT, UPDATE ON "Reservation" TO rol_teacher;

-- Sus propias sesiones (solo lectura — no registra entrada/salida él mismo)
GRANT SELECT ON "ParkingSession" TO rol_teacher;

-- Sus suscripciones
GRANT SELECT, INSERT ON "ParkingSubscription" TO rol_teacher;

-- Sus notificaciones
GRANT SELECT, UPDATE ON "Notification" TO rol_teacher;

-- Vista de disponibilidad (para elegir espacio al reservar)
GRANT SELECT ON view_ocupacion_por_zona TO rol_teacher;
GRANT SELECT ON view_eventos_activos    TO rol_teacher;

-- Verificar su propia solvencia
GRANT EXECUTE ON FUNCTION sp_verificar_solvencia(TEXT)      TO rol_teacher;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT) TO rol_teacher;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)              TO rol_teacher;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 6: PRIVILEGIOS PARA rol_student (Estudiantes)
-- Similar a docente pero con acceso más limitado.
-- NO puede ver tarifas docente ni datos de otros usuarios.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON "ParkingSpace" TO rol_student;
GRANT SELECT ON "Campus"       TO rol_student;
GRANT SELECT ON "ParkingEvent" TO rol_student;

GRANT SELECT, INSERT, UPDATE ON "Reservation"         TO rol_student;
GRANT SELECT                  ON "ParkingSession"      TO rol_student;
GRANT SELECT, INSERT          ON "ParkingSubscription" TO rol_student;
GRANT SELECT, UPDATE          ON "Notification"        TO rol_student;

GRANT SELECT ON view_ocupacion_por_zona TO rol_student;
GRANT SELECT ON view_eventos_activos    TO rol_student;

GRANT EXECUTE ON FUNCTION sp_verificar_solvencia(TEXT)      TO rol_student;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT) TO rol_student;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)              TO rol_student;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 7: PRIVILEGIOS PARA rol_sensor_iot (ESP32)
-- Principio de menor privilegio extremo:
-- El sensor SOLO puede actualizar el estado y last_sensor_update
-- de la tabla ParkingSpace. Nada más.
-- ─────────────────────────────────────────────────────────────────────────────

-- Solo puede actualizar los campos de estado del espacio
-- (el UPDATE a columnas específicas restringe qué campos puede tocar)
GRANT UPDATE (status, last_sensor_update) ON "ParkingSpace" TO rol_sensor_iot;

-- Necesita leer el espacio para buscar por code
GRANT SELECT ON "ParkingSpace" TO rol_sensor_iot;

-- NO tiene acceso a ninguna otra tabla, vista, función ni procedimiento


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 8: PRIVILEGIOS PARA rol_reportes (BI / Reportes externos)
-- Solo lectura en vistas y tablas de datos históricos.
-- NUNCA puede modificar datos. Usado para herramientas de BI externas.
-- ─────────────────────────────────────────────────────────────────────────────

-- Solo lectura en tablas de datos (sin datos personales sensibles)
GRANT SELECT ON "ParkingSession"      TO rol_reportes;
GRANT SELECT ON "ParkingSpace"        TO rol_reportes;
GRANT SELECT ON "Campus"              TO rol_reportes;
GRANT SELECT ON "ParkingEvent"        TO rol_reportes;
GRANT SELECT ON "MonthlyBill"         TO rol_reportes;
GRANT SELECT ON "Payment"             TO rol_reportes;
GRANT SELECT ON "ParkingSubscription" TO rol_reportes;

-- NO tiene acceso a: User (datos personales), Vehicle (datos de propiedad),
-- AuditLog (datos de seguridad), Blacklist, BarrierLog, VisitorQR

-- Acceso completo a todas las vistas de reportes
GRANT SELECT ON view_sesiones_activas   TO rol_reportes;
GRANT SELECT ON view_ingresos_del_dia   TO rol_reportes;
GRANT SELECT ON view_ocupacion_por_zona TO rol_reportes;
GRANT SELECT ON view_usuarios_con_deuda TO rol_reportes;
GRANT SELECT ON view_solvencia_parqueo  TO rol_reportes;
GRANT SELECT ON view_eventos_activos    TO rol_reportes;

-- Funciones de cálculo (solo lectura, no modifican datos)
GRANT EXECUTE ON FUNCTION fn_calcular_tarifa(TEXT, INT, TEXT)      TO rol_reportes;
GRANT EXECUTE ON FUNCTION fn_tiene_suscripcion_activa(TEXT)        TO rol_reportes;
GRANT EXECUTE ON FUNCTION fn_deuda_total(TEXT)                     TO rol_reportes;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 9: REVOCAR PRIVILEGIOS (ejemplos de REVOKE)
-- Se usa cuando un usuario cambia de rol o sale de la institución
-- ─────────────────────────────────────────────────────────────────────────────

-- Ejemplo: revocar acceso a un guardia que ya no trabaja en la USPG
-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_security;
-- REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM rol_security;
-- DROP ROLE rol_security;

-- Ejemplo: revocar un privilegio específico (el guardia ya no puede ver AuditLog)
-- REVOKE SELECT ON "AuditLog" FROM rol_security;

-- Ejemplo: revocar acceso de reportes a una tabla específica
-- REVOKE SELECT ON "MonthlyBill" FROM rol_reportes;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 10: CONFIGURAR SEARCH PATH
-- Asegura que los roles usen el esquema correcto por defecto
-- ─────────────────────────────────────────────────────────────────────────────

ALTER ROLE rol_admin       SET search_path TO public;
ALTER ROLE rol_security    SET search_path TO public;
ALTER ROLE rol_teacher     SET search_path TO public;
ALTER ROLE rol_student     SET search_path TO public;
ALTER ROLE rol_sensor_iot  SET search_path TO public;
ALTER ROLE rol_reportes    SET search_path TO public;
ALTER ROLE rol_aplicacion  SET search_path TO public;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 11: VERIFICACIÓN — consultas para confirmar los privilegios
-- Ejecutar después de aplicar el DCL para verificar que todo quedó correcto
-- ─────────────────────────────────────────────────────────────────────────────

-- Ver todos los roles creados en la BD:
-- SELECT rolname, rolcanlogin, rolcreatedb, rolcreaterole
-- FROM pg_roles
-- WHERE rolname LIKE 'rol_%'
-- ORDER BY rolname;

-- Ver los privilegios de un rol sobre las tablas:
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'rol_security'
-- ORDER BY table_name, privilege_type;

-- Ver los privilegios sobre las vistas:
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name LIKE 'view_%'
-- ORDER BY grantee, table_name;

-- Ver los privilegios sobre funciones:
-- SELECT grantee, routine_name, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE grantee LIKE 'rol_%'
-- ORDER BY grantee, routine_name;

-- Ver qué puede hacer rol_sensor_iot (debe ser muy limitado):
-- SELECT grantee, table_name, column_name, privilege_type
-- FROM information_schema.role_column_grants
-- WHERE grantee = 'rol_sensor_iot';


-- ═══════════════════════════════════════════════════════════════════════════
-- RESUMEN DE PRIVILEGIOS POR ROL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- rol_aplicacion  │ SELECT/INSERT/UPDATE/DELETE en todas las tablas
--                 │ SELECT en todas las vistas
--                 │ EXECUTE en todos los SPs y funciones
--
-- rol_admin       │ SELECT/INSERT/UPDATE/DELETE en todas las tablas
--                 │ EXCEPT AuditLog (solo SELECT — integridad forense)
--                 │ SELECT en todas las vistas
--                 │ EXECUTE en todos los SPs y funciones
--
-- rol_security    │ SELECT en tablas de consulta (User, Vehicle, Space...)
--                 │ INSERT/UPDATE en ParkingSession, ParkingSpace, Blacklist
--                 │ INSERT/UPDATE en VisitorQR y BarrierLog
--                 │ SELECT en vistas operativas
--                 │ EXECUTE en SPs de entrada/salida/solvencia
--
-- rol_teacher     │ SELECT en tablas de referencia (Space, Campus, Event)
--                 │ SELECT/INSERT/UPDATE en Reservation, Notification
--                 │ SELECT en ParkingSession (solo sus datos — filtrado en app)
--                 │ SELECT/INSERT en ParkingSubscription
--
-- rol_student     │ Igual que rol_teacher (mismos límites)
--
-- rol_sensor_iot  │ SELECT en ParkingSpace (para buscar por code)
--                 │ UPDATE(status, last_sensor_update) en ParkingSpace SOLO
--                 │ NINGÚN otro privilegio
--
-- rol_reportes    │ SELECT en tablas de datos históricos (sin datos personales)
--                 │ SELECT en todas las vistas
--                 │ EXECUTE en funciones de cálculo (solo lectura)
--
-- ═══════════════════════════════════════════════════════════════════════════
