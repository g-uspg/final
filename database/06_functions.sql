-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 06_functions.sql — Funciones de negocio
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── fn_calcular_tarifa ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_calcular_tarifa(
  p_role     TEXT,
  p_minutes  INT,
  p_event_id TEXT DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_event   RECORD;
  v_rate    NUMERIC;
BEGIN
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_event FROM "ParkingEvent" WHERE id = p_event_id;
    IF FOUND AND v_event.tariff_mode = 'FLAT_RATE' THEN
      RETURN COALESCE(v_event.flat_rate, 0);
    END IF;
  END IF;

  v_rate := CASE p_role
    WHEN 'ADMIN'    THEN 0
    WHEN 'TEACHER'  THEN 0
    WHEN 'VISITOR'  THEN 10
    WHEN 'SECURITY' THEN 5
    ELSE 5
  END;

  RETURN ROUND((p_minutes::NUMERIC / 60) * v_rate, 2);
END;
$$;

-- ─── fn_espacio_disponible ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_espacio_disponible(
  p_zone       TEXT DEFAULT NULL,
  p_space_type TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_space_id TEXT;
BEGIN
  SELECT id INTO v_space_id
  FROM "ParkingSpace"
  WHERE status = 'AVAILABLE'
    AND is_active = TRUE
    AND (p_zone IS NULL OR zone = p_zone::"Zone")
    AND (p_space_type IS NULL OR type = p_space_type::"SpaceType")
  ORDER BY code
  LIMIT 1;

  RETURN v_space_id;
END;
$$;

-- ─── fn_tiene_suscripcion_activa ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_tiene_suscripcion_activa(p_user_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ParkingSubscription"
    WHERE user_id = p_user_id
      AND status = 'ACTIVE'
      AND end_date > NOW()
  );
$$;

-- ─── fn_deuda_total ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_deuda_total(p_user_id TEXT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(amount_due), 0)
  FROM "ParkingSession"
  WHERE user_id = p_user_id
    AND is_paid = FALSE
    AND status = 'COMPLETED'
    AND amount_due > 0;
$$;
