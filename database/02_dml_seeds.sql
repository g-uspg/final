-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 02_dml_seeds.sql — Datos de prueba realistas
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Campus ─────────────────────────────────────────────────────────────────
INSERT INTO "Campus" ("id","name","address","lat","lng","zoom","total_spaces") VALUES
('campus-uspg-01','Universidad San Pablo Guatemala','13 Calle 4-65, Guatemala City, Guatemala',14.5847,-90.5085,18,500);

-- ─── Usuarios (contraseñas hasheadas con bcrypt, factor 10) ─────────────────
-- Contraseñas: Admin2026!, Teacher2026!, Student2026!, Security2026!
-- Los hashes corresponden a bcrypt con rounds=10
INSERT INTO "User" ("id","email","password_hash","role","first_name","last_name","phone","carnet","nfc_card_id","qr_code","is_active") VALUES
('user-admin-01','admin@uspg.edu.gt','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAh98uy','ADMIN','José','Galicia','+502 5551-0001',NULL,'NFC-ADMIN-001','QR-ADMIN-001',TRUE),
('user-teacher-01','docente01@uspg.edu.gt','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAh98uy','TEACHER','María','López','+502 5552-0002',NULL,'NFC-TEACHER-001','QR-TEACHER-001',TRUE),
('user-student-01','est001@uspg.edu.gt','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAh98uy','STUDENT','Carlos','Pérez','+502 5553-0003','2021-0001','NFC-STUDENT-001','QR-STUDENT-001',TRUE),
('user-student-02','est002@uspg.edu.gt','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAh98uy','STUDENT','Ana','García','+502 5554-0004','2021-0002','NFC-STUDENT-002','QR-STUDENT-002',TRUE),
('user-security-01','guardia01@uspg.edu.gt','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAh98uy','SECURITY','Pedro','Morales','+502 5555-0005',NULL,'NFC-SECURITY-001','QR-SECURITY-001',TRUE);

-- ─── Vehículos con placas guatemaltecas ──────────────────────────────────────
INSERT INTO "Vehicle" ("id","user_id","placa","brand","model","color","year","is_authorized") VALUES
('vehicle-01','user-admin-01','P123ABC','Toyota','Fortuner','Blanco',2022,TRUE),
('vehicle-02','user-teacher-01','C456XYZ','Honda','CR-V','Gris',2020,TRUE),
('vehicle-03','user-student-01','P789DEF','Hyundai','Tucson','Negro',2019,TRUE),
('vehicle-04','user-student-01','M001GHI','Suzuki','Swift','Rojo',2021,TRUE),
('vehicle-05','user-student-02','C234JKL','Kia','Sportage','Azul',2023,TRUE),
('vehicle-06','user-student-02','O567MNO','Nissan','Versa','Blanco',2020,TRUE),
('vehicle-07','user-security-01','P890PQR','Toyota','Hilux','Plateado',2018,TRUE),
('vehicle-08','user-teacher-01','M345STU','Volkswagen','Jetta','Gris',2021,TRUE),
('vehicle-09','user-student-01','C678VWX','Chevrolet','Captiva','Café',2017,TRUE),
('vehicle-10','user-admin-01','P901YZA','Land Rover','Defender','Verde',2024,TRUE);

-- ─── Espacios (500 en zonas A=220, B=150, C=100, D=30) ──────────────────────
-- Zona A (220 espacios)
INSERT INTO "ParkingSpace" ("id","code","campus_id","zone","type","status")
SELECT
  'space-A-' || LPAD(n::TEXT,3,'0'),
  'A-' || LPAD(n::TEXT,3,'0'),
  'campus-uspg-01',
  'A'::"Zone",
  CASE WHEN n <= 5 THEN 'HANDICAPPED'::"SpaceType"
       WHEN n <= 10 THEN 'ELECTRIC'::"SpaceType"
       ELSE 'STANDARD'::"SpaceType" END,
  'AVAILABLE'::"SpaceStatus"
FROM generate_series(1,220) n;

-- Zona B (150 espacios)
INSERT INTO "ParkingSpace" ("id","code","campus_id","zone","type","status")
SELECT
  'space-B-' || LPAD(n::TEXT,3,'0'),
  'B-' || LPAD(n::TEXT,3,'0'),
  'campus-uspg-01',
  'B'::"Zone",
  CASE WHEN n <= 3 THEN 'HANDICAPPED'::"SpaceType"
       WHEN n <= 6 THEN 'ELECTRIC'::"SpaceType"
       ELSE 'STANDARD'::"SpaceType" END,
  'AVAILABLE'::"SpaceStatus"
FROM generate_series(1,150) n;

-- Zona C (100 espacios)
INSERT INTO "ParkingSpace" ("id","code","campus_id","zone","type","status")
SELECT
  'space-C-' || LPAD(n::TEXT,3,'0'),
  'C-' || LPAD(n::TEXT,3,'0'),
  'campus-uspg-01',
  'C'::"Zone",
  CASE WHEN n <= 2 THEN 'HANDICAPPED'::"SpaceType"
       ELSE 'STANDARD'::"SpaceType" END,
  'AVAILABLE'::"SpaceStatus"
FROM generate_series(1,100) n;

-- Zona D (30 espacios — docentes y VIP)
INSERT INTO "ParkingSpace" ("id","code","campus_id","zone","type","status")
SELECT
  'space-D-' || LPAD(n::TEXT,3,'0'),
  'D-' || LPAD(n::TEXT,3,'0'),
  'campus-uspg-01',
  'D'::"Zone",
  CASE WHEN n <= 15 THEN 'TEACHER'::"SpaceType"
       WHEN n <= 25 THEN 'VIP'::"SpaceType"
       ELSE 'RESERVED'::"SpaceType" END,
  'AVAILABLE'::"SpaceStatus"
FROM generate_series(1,30) n;

-- ─── Sesiones activas actuales ────────────────────────────────────────────────
UPDATE "ParkingSpace" SET "status" = 'OCCUPIED' WHERE "id" IN
  ('space-A-001','space-A-002','space-B-001','space-C-001','space-D-001');

INSERT INTO "ParkingSession" ("id","vehicle_id","space_id","user_id","entry_time","entry_method","status") VALUES
('session-active-01','vehicle-03','space-A-001','user-student-01',NOW() - INTERVAL '2 hours','QR','ACTIVE'),
('session-active-02','vehicle-05','space-A-002','user-student-02',NOW() - INTERVAL '1 hour','NFC','ACTIVE'),
('session-active-03','vehicle-02','space-D-001','user-teacher-01',NOW() - INTERVAL '3 hours','NFC','ACTIVE'),
('session-active-04','vehicle-07','space-B-001','user-security-01',NOW() - INTERVAL '30 minutes','MANUAL','ACTIVE'),
('session-active-05','vehicle-01','space-C-001','user-admin-01',NOW() - INTERVAL '4 hours','NFC','ACTIVE');

-- ─── Historial de 30 días (sesiones completadas y pagos) ─────────────────────
INSERT INTO "ParkingSession" ("id","vehicle_id","space_id","user_id","entry_time","exit_time","entry_method","status","duration_minutes","amount_due","is_paid")
SELECT
  'session-hist-' || LPAD(n::TEXT,4,'0'),
  CASE (n % 5)
    WHEN 0 THEN 'vehicle-03'
    WHEN 1 THEN 'vehicle-05'
    WHEN 2 THEN 'vehicle-04'
    WHEN 3 THEN 'vehicle-01'
    ELSE 'vehicle-06'
  END,
  CASE (n % 4)
    WHEN 0 THEN 'space-A-010'
    WHEN 1 THEN 'space-B-010'
    WHEN 2 THEN 'space-A-020'
    ELSE 'space-C-010'
  END,
  CASE (n % 5)
    WHEN 0 THEN 'user-student-01'
    WHEN 1 THEN 'user-student-02'
    WHEN 2 THEN 'user-student-01'
    WHEN 3 THEN 'user-admin-01'
    ELSE 'user-student-02'
  END,
  NOW() - (n || ' hours')::INTERVAL,
  NOW() - (n || ' hours')::INTERVAL + ((60 + (n % 180)) || ' minutes')::INTERVAL,
  'QR'::"EntryMethod",
  'COMPLETED'::"SessionStatus",
  60 + (n % 180),
  ROUND(((60 + (n % 180))::NUMERIC / 60 * 5), 2),
  TRUE
FROM generate_series(1, 720) n;  -- ~30 días × 24 sesiones/día

-- ─── Suscripciones ───────────────────────────────────────────────────────────
INSERT INTO "ParkingSubscription" ("id","user_id","type","status","start_date","end_date","amount_paid","payment_reference") VALUES
('sub-monthly-01','user-student-01','MONTHLY','ACTIVE',NOW() - INTERVAL '15 days',NOW() + INTERVAL '15 days',150.00,'REF-2026-0501'),
('sub-semester-01','user-student-02','SEMESTER','ACTIVE',NOW() - INTERVAL '30 days',NOW() + INTERVAL '150 days',600.00,'REF-2026-0502');

-- ─── Eventos ─────────────────────────────────────────────────────────────────
INSERT INTO "ParkingEvent" ("id","name","description","event_date","start_time","end_time","tariff_mode","flat_rate","affected_zones","status","created_by_user_id") VALUES
('event-past-01','Graduación Enero 2026','Graduación semestre 1',
  '2026-01-20','2026-01-20 06:00:00-06','2026-01-20 22:00:00-06',
  'FLAT_RATE',25.00,'A,B,C,D','COMPLETED','user-admin-01'),
('event-future-01','Graduación Junio 2026','Graduación semestre 2 - Grupo 5',
  '2026-06-15','2026-06-15 06:00:00-06','2026-06-15 22:00:00-06',
  'FLAT_RATE',25.00,'A,B,C,D','SCHEDULED','user-admin-01');
