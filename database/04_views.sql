-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 04_views.sql — Vistas de negocio
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── view_sesiones_activas ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_sesiones_activas AS
SELECT
  s.id                                                        AS session_id,
  s.entry_time,
  EXTRACT(EPOCH FROM (NOW() - s.entry_time)) / 60            AS minutos_transcurridos,
  v.placa,
  v.brand,
  v.color,
  u.first_name || ' ' || u.last_name                         AS propietario,
  u.carnet,
  u.role,
  sp.code                                                     AS espacio_codigo,
  sp.zone,
  sp.type                                                     AS tipo_espacio,
  s.entry_method,
  s.amount_due,
  s.is_paid
FROM "ParkingSession" s
JOIN "Vehicle"      v  ON v.id = s.vehicle_id
JOIN "ParkingSpace" sp ON sp.id = s.space_id
LEFT JOIN "User"    u  ON u.id = s.user_id
WHERE s.status = 'ACTIVE';

-- ─── view_ingresos_del_dia ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_ingresos_del_dia AS
SELECT
  COUNT(*)                            AS total_sesiones,
  COALESCE(SUM(amount_due), 0)        AS total_ingresos,
  COALESCE(AVG(amount_due), 0)        AS promedio_por_sesion,
  COALESCE(AVG(duration_minutes), 0)  AS duracion_promedio_minutos,
  sp.zone
FROM "ParkingSession" s
JOIN "ParkingSpace" sp ON sp.id = s.space_id
WHERE s.status = 'COMPLETED'
  AND s.entry_time::DATE = CURRENT_DATE
GROUP BY sp.zone;

-- ─── view_ocupacion_por_zona ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_ocupacion_por_zona AS
SELECT
  zone,
  COUNT(*)                                                       AS total_espacios,
  COUNT(*) FILTER (WHERE status = 'OCCUPIED')                    AS ocupados,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE')                   AS disponibles,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'OCCUPIED')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  )                                                              AS porcentaje_ocupacion
FROM "ParkingSpace"
WHERE is_active = TRUE
GROUP BY zone
ORDER BY zone;

-- ─── view_usuarios_con_deuda ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_usuarios_con_deuda AS
SELECT
  u.id                                AS user_id,
  u.first_name || ' ' || u.last_name  AS nombre,
  u.email,
  u.carnet,
  u.role,
  COUNT(s.id)                         AS sesiones_sin_pagar,
  COALESCE(SUM(s.amount_due), 0)      AS deuda_total
FROM "User" u
JOIN "ParkingSession" s ON s.user_id = u.id
WHERE s.is_paid = FALSE
  AND s.status = 'COMPLETED'
  AND s.amount_due > 0
GROUP BY u.id, u.first_name, u.last_name, u.email, u.carnet, u.role
ORDER BY deuda_total DESC;

-- ─── view_solvencia_parqueo ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_solvencia_parqueo AS
SELECT
  u.carnet,
  u.first_name || ' ' || u.last_name                          AS nombre,
  u.role,
  COALESCE(sub.status = 'ACTIVE' AND sub.end_date > NOW(), FALSE) AS tiene_suscripcion,
  COALESCE(sub.type, NULL)                                     AS tipo_suscripcion,
  sub.end_date                                                 AS suscripcion_vence,
  COALESCE(SUM(s.amount_due), 0)                               AS deuda_total,
  CASE WHEN COALESCE(SUM(s.amount_due), 0) = 0 THEN TRUE ELSE FALSE END AS al_dia
FROM "User" u
LEFT JOIN "ParkingSubscription" sub ON sub.user_id = u.id
  AND sub.status = 'ACTIVE' AND sub.end_date > NOW()
LEFT JOIN "ParkingSession" s ON s.user_id = u.id
  AND s.is_paid = FALSE AND s.status = 'COMPLETED' AND s.amount_due > 0
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.carnet, u.first_name, u.last_name, u.role, sub.status, sub.type, sub.end_date;

-- ─── view_eventos_activos ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_eventos_activos AS
SELECT
  e.*,
  CASE
    WHEN e.tariff_mode = 'FLAT_RATE' THEN e.flat_rate
    ELSE NULL
  END AS tarifa_aplicable,
  u.first_name || ' ' || u.last_name AS creado_por
FROM "ParkingEvent" e
JOIN "User" u ON u.id = e.created_by_user_id
WHERE e.status IN ('ACTIVE', 'SCHEDULED')
  AND e.start_time <= NOW()
  AND e.end_time >= NOW();
