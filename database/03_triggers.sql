-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 03_triggers.sql — Triggers de negocio
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── trigger_bloquear_acceso_sin_pago ────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_deuda_before_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_deuda NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_due), 0)
  INTO v_deuda
  FROM "ParkingSession"
  WHERE vehicle_id = NEW.vehicle_id
    AND is_paid = FALSE
    AND status = 'COMPLETED'
    AND amount_due > 0;

  IF v_deuda > 0 THEN
    RAISE EXCEPTION 'Acceso denegado: el vehículo tiene deuda pendiente de Q%.2f', v_deuda;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_bloquear_acceso_sin_pago
  BEFORE INSERT ON "ParkingSession"
  FOR EACH ROW EXECUTE FUNCTION fn_check_deuda_before_entry();

-- ─── trigger_liberar_espacio_al_salir ────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_liberar_espacio_al_salir()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.exit_time IS NULL AND NEW.exit_time IS NOT NULL THEN
    UPDATE "ParkingSpace"
    SET status = 'AVAILABLE', updated_at = NOW()
    WHERE id = NEW.space_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_liberar_espacio_al_salir
  AFTER UPDATE ON "ParkingSession"
  FOR EACH ROW EXECUTE FUNCTION fn_liberar_espacio_al_salir();

-- ─── trigger_expirar_reservas ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_liberar_espacio_reserva()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status NOT IN ('USED','CANCELLED') AND NEW.status IN ('USED','CANCELLED') THEN
    UPDATE "ParkingSpace"
    SET status = 'AVAILABLE', updated_at = NOW()
    WHERE id = NEW.space_id
      AND status = 'RESERVED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_expirar_reservas
  AFTER UPDATE ON "Reservation"
  FOR EACH ROW EXECUTE FUNCTION fn_liberar_espacio_reserva();

-- ─── trigger_audit_acceso ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_vehicle_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "AuditLog" (action, resource, resource_id, user_id, metadata)
  VALUES (
    'VEHICLE_ENTRY',
    'parking_session',
    NEW.id,
    NEW.user_id,
    jsonb_build_object('vehicle_id', NEW.vehicle_id, 'space_id', NEW.space_id, 'entry_method', NEW.entry_method)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_acceso
  AFTER INSERT ON "ParkingSession"
  FOR EACH ROW EXECUTE FUNCTION fn_audit_vehicle_entry();

-- ─── trigger_blacklist_alerta ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_blacklist_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.blacklisted = TRUE AND (OLD.blacklisted IS DISTINCT FROM TRUE) THEN
    INSERT INTO "AuditLog" (action, resource, resource_id, metadata)
    VALUES (
      'VEHICLE_BLACKLISTED',
      'vehicle',
      NEW.id,
      jsonb_build_object('placa', NEW.placa, 'reason', NEW.blacklist_reason, 'severity', 'HIGH')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_blacklist_alerta
  AFTER UPDATE ON "Vehicle"
  FOR EACH ROW EXECUTE FUNCTION fn_blacklist_alert();

-- ─── trigger_suscripcion_expirada ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_expire_subscription()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NEW.end_date < NOW() THEN
    NEW.status := 'EXPIRED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_suscripcion_expirada
  BEFORE UPDATE ON "ParkingSubscription"
  FOR EACH ROW EXECUTE FUNCTION fn_expire_subscription();
