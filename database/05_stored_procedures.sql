-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 05_stored_procedures.sql — Procedimientos almacenados
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── sp_registrar_entrada ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_registrar_entrada(
  p_vehicle_id   TEXT,
  p_space_id     TEXT,
  p_entry_method TEXT DEFAULT 'MANUAL'
)
RETURNS TABLE(session_id TEXT, ticket_code TEXT) LANGUAGE plpgsql AS $$
DECLARE
  v_vehicle   RECORD;
  v_space     RECORD;
  v_session   RECORD;
  v_deuda     NUMERIC;
BEGIN
  SELECT * INTO v_vehicle FROM "Vehicle" WHERE id = p_vehicle_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehículo no encontrado'; END IF;
  IF v_vehicle.blacklisted THEN RAISE EXCEPTION 'Vehículo en lista negra'; END IF;

  SELECT COALESCE(SUM(amount_due), 0) INTO v_deuda
  FROM "ParkingSession"
  WHERE vehicle_id = p_vehicle_id AND is_paid = FALSE AND status = 'COMPLETED' AND amount_due > 0;
  IF v_deuda > 0 THEN RAISE EXCEPTION 'Acceso denegado: deuda pendiente de Q%.2f', v_deuda; END IF;

  SELECT * INTO v_space FROM "ParkingSpace" WHERE id = p_space_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Espacio no encontrado'; END IF;
  IF v_space.status <> 'AVAILABLE' THEN RAISE EXCEPTION 'Espacio no disponible (estado: %)', v_space.status; END IF;

  INSERT INTO "ParkingSession" (vehicle_id, space_id, user_id, entry_method, status)
  VALUES (p_vehicle_id, p_space_id, v_vehicle.user_id, p_entry_method::"EntryMethod", 'ACTIVE')
  RETURNING * INTO v_session;

  UPDATE "ParkingSpace" SET status = 'OCCUPIED', updated_at = NOW() WHERE id = p_space_id;

  RETURN QUERY SELECT v_session.id, 'TKT-' || UPPER(LEFT(v_session.id, 8));
END;
$$;

-- ─── sp_registrar_salida ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_registrar_salida(p_session_id TEXT)
RETURNS TABLE(monto_a_cobrar NUMERIC, es_gratis BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  v_session    RECORD;
  v_role       TEXT;
  v_rate       NUMERIC;
  v_minutes    INT;
  v_monto      NUMERIC;
BEGIN
  SELECT s.*, u.role AS user_role INTO v_session
  FROM "ParkingSession" s
  LEFT JOIN "User" u ON u.id = s.user_id
  WHERE s.id = p_session_id AND s.status = 'ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión activa no encontrada'; END IF;

  v_minutes := CEIL(EXTRACT(EPOCH FROM (NOW() - v_session.entry_time)) / 60);
  v_role := COALESCE(v_session.user_role, 'STUDENT');

  v_rate := CASE v_role
    WHEN 'ADMIN'    THEN 0
    WHEN 'TEACHER'  THEN 0
    WHEN 'VISITOR'  THEN 10
    WHEN 'SECURITY' THEN 5
    ELSE 5
  END;

  v_monto := ROUND((v_minutes::NUMERIC / 60) * v_rate, 2);

  UPDATE "ParkingSession"
  SET exit_time = NOW(), duration_minutes = v_minutes, amount_due = v_monto, status = 'COMPLETED', updated_at = NOW()
  WHERE id = p_session_id;

  UPDATE "ParkingSpace" SET status = 'AVAILABLE', updated_at = NOW() WHERE id = v_session.space_id;

  RETURN QUERY SELECT v_monto, v_rate = 0;
END;
$$;

-- ─── sp_verificar_solvencia ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_verificar_solvencia(p_carnet TEXT)
RETURNS TABLE(
  carnet TEXT, nombre TEXT, rol TEXT,
  tiene_suscripcion BOOLEAN, deuda_total NUMERIC, al_dia BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
  v_user    RECORD;
  v_sub     RECORD;
  v_deuda   NUMERIC;
BEGIN
  SELECT * INTO v_user FROM "User" WHERE carnet = p_carnet AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_carnet,'No registrado','NONE',FALSE,0::NUMERIC,FALSE;
    RETURN;
  END IF;

  SELECT * INTO v_sub FROM "ParkingSubscription"
  WHERE user_id = v_user.id AND status = 'ACTIVE' AND end_date > NOW()
  ORDER BY end_date DESC LIMIT 1;

  SELECT COALESCE(SUM(amount_due), 0) INTO v_deuda
  FROM "ParkingSession"
  WHERE user_id = v_user.id AND is_paid = FALSE AND status = 'COMPLETED' AND amount_due > 0;

  RETURN QUERY SELECT
    v_user.carnet,
    v_user.first_name || ' ' || v_user.last_name,
    v_user.role::TEXT,
    (v_sub.id IS NOT NULL),
    v_deuda,
    v_deuda = 0;
END;
$$;

-- ─── sp_cerrar_mes ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_cerrar_mes(p_year INT, p_month INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE "MonthlyBill"
  SET status = 'CLOSED', updated_at = NOW()
  WHERE year = p_year AND month = p_month AND status = 'OPEN';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── sp_renovar_suscripcion ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sp_renovar_suscripcion(
  p_user_id      TEXT,
  p_type         TEXT,
  p_payment_ref  TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_days     INT;
  v_sub_id   TEXT;
BEGIN
  UPDATE "ParkingSubscription"
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'ACTIVE';

  v_days := CASE p_type WHEN 'SEMESTER' THEN 180 ELSE 30 END;

  INSERT INTO "ParkingSubscription" (user_id, type, status, start_date, end_date, amount_paid, payment_reference)
  VALUES (
    p_user_id,
    p_type::"SubscriptionType",
    'ACTIVE',
    NOW(),
    NOW() + (v_days || ' days')::INTERVAL,
    CASE p_type WHEN 'SEMESTER' THEN 600 ELSE 150 END,
    p_payment_ref
  )
  RETURNING id INTO v_sub_id;

  INSERT INTO "AuditLog" (user_id, action, resource, resource_id)
  VALUES (p_user_id, 'SUBSCRIPTION_RENEWED', 'parking_subscription', v_sub_id);

  RETURN v_sub_id;
END;
$$;
