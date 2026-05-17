-- ═══════════════════════════════════════════════════════════════════════════
-- Smart Parking USPG — Grupo 5
-- 01_ddl.sql — Definición de tablas, índices y restricciones
-- ═══════════════════════════════════════════════════════════════════════════

-- Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SECURITY', 'TEACHER', 'STUDENT', 'VISITOR');
CREATE TYPE "Zone" AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE "SpaceType" AS ENUM ('STANDARD', 'VIP', 'HANDICAPPED', 'ELECTRIC', 'RESERVED', 'TEACHER');
CREATE TYPE "SpaceStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'QR_CODE', 'MOBILE');
CREATE TYPE "EntryMethod" AS ENUM ('QR', 'PLATE', 'NFC', 'MANUAL', 'VISITOR_QR');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'USED');
CREATE TYPE "ReservationType" AS ENUM ('STANDARD', 'PERSONAL', 'EVENT', 'SPECIAL_VISIT');
CREATE TYPE "NotificationType" AS ENUM ('PARKING_FULL','VISITOR_EXPIRING','OVERSTAY','INVALID_ACCESS','PAYMENT_REQUIRED','RESERVATION_EXPIRING','BARRIER_ACTION','SYSTEM_ALERT','BLACKLIST','INFO');
CREATE TYPE "BarrierAction" AS ENUM ('OPEN', 'CLOSE', 'BLOCK', 'ERROR');
CREATE TYPE "TriggerSource" AS ENUM ('QR', 'PLATE', 'NFC', 'MANUAL', 'SYSTEM', 'PAYMENT');
CREATE TYPE "Orientation" AS ENUM ('HORIZONTAL', 'DIAGONAL', 'VERTICAL');
CREATE TYPE "SubscriptionType" AS ENUM ('MONTHLY', 'SEMESTER');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');
CREATE TYPE "TariffMode" AS ENUM ('HOURLY', 'FLAT_RATE');
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BillStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID', 'OVERDUE');
CREATE TYPE "ReplacementReason" AS ENUM ('LOST', 'DAMAGED', 'STOLEN', 'REASSIGNMENT');

-- ─── Campus ─────────────────────────────────────────────────────────────────
CREATE TABLE "Campus" (
  "id"           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"         TEXT        NOT NULL,
  "address"      TEXT        NOT NULL,
  "lat"          FLOAT8      NOT NULL,
  "lng"          FLOAT8      NOT NULL,
  "zoom"         INT         NOT NULL DEFAULT 18,
  "total_spaces" INT         NOT NULL DEFAULT 500,
  "is_active"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User ────────────────────────────────────────────────────────────────────
CREATE TABLE "User" (
  "id"            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email"         TEXT        NOT NULL UNIQUE,
  "password_hash" TEXT        NOT NULL,
  "role"          "Role"      NOT NULL DEFAULT 'STUDENT',
  "first_name"    TEXT        NOT NULL,
  "last_name"     TEXT        NOT NULL,
  "phone"         TEXT,
  "carnet"        TEXT        UNIQUE,
  "nfc_card_id"   TEXT        UNIQUE,
  "qr_code"       TEXT        NOT NULL UNIQUE,
  "is_active"     BOOLEAN     NOT NULL DEFAULT TRUE,
  "last_login_at" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"    TIMESTAMPTZ
);
CREATE INDEX "User_email_idx"  ON "User"("email");
CREATE INDEX "User_role_idx"   ON "User"("role");
CREATE INDEX "User_carnet_idx" ON "User"("carnet");
CREATE INDEX "User_nfc_idx"    ON "User"("nfc_card_id");

-- ─── Vehicle ─────────────────────────────────────────────────────────────────
CREATE TABLE "Vehicle" (
  "id"               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"          TEXT        NOT NULL REFERENCES "User"("id"),
  "placa"            TEXT        NOT NULL UNIQUE,
  "brand"            TEXT,
  "model"            TEXT,
  "color"            TEXT,
  "year"             INT,
  "is_authorized"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "blacklisted"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "blacklist_reason" TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"       TIMESTAMPTZ
);
CREATE INDEX "Vehicle_placa_idx"       ON "Vehicle"("placa");
CREATE INDEX "Vehicle_user_id_idx"     ON "Vehicle"("user_id");
CREATE INDEX "Vehicle_blacklisted_idx" ON "Vehicle"("blacklisted");

-- ─── ParkingSpace ────────────────────────────────────────────────────────────
CREATE TABLE "ParkingSpace" (
  "id"                 TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "code"               TEXT          NOT NULL UNIQUE,
  "campus_id"          TEXT          NOT NULL REFERENCES "Campus"("id"),
  "zone"               "Zone"        NOT NULL,
  "floor"              INT           NOT NULL DEFAULT 0,
  "type"               "SpaceType"   NOT NULL DEFAULT 'STANDARD',
  "status"             "SpaceStatus" NOT NULL DEFAULT 'AVAILABLE',
  "is_active"          BOOLEAN       NOT NULL DEFAULT TRUE,
  "lat"                FLOAT8,
  "lng"                FLOAT8,
  "last_sensor_update" TIMESTAMPTZ,
  "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "ParkingSpace_status_idx"    ON "ParkingSpace"("status");
CREATE INDEX "ParkingSpace_zone_idx"      ON "ParkingSpace"("zone");
CREATE INDEX "ParkingSpace_campus_id_idx" ON "ParkingSpace"("campus_id");

-- ─── ParkingSession ──────────────────────────────────────────────────────────
CREATE TABLE "ParkingSession" (
  "id"                TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "vehicle_id"        TEXT            NOT NULL REFERENCES "Vehicle"("id"),
  "space_id"          TEXT            NOT NULL REFERENCES "ParkingSpace"("id"),
  "user_id"           TEXT            REFERENCES "User"("id"),
  "entry_time"        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "exit_time"         TIMESTAMPTZ,
  "entry_method"      "EntryMethod"   NOT NULL DEFAULT 'MANUAL',
  "status"            "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "duration_minutes"  INT,
  "amount_due"        FLOAT8,
  "is_paid"           BOOLEAN         NOT NULL DEFAULT FALSE,
  "operator_entry_id" TEXT,
  "operator_exit_id"  TEXT,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX "ParkingSession_status_idx"     ON "ParkingSession"("status");
CREATE INDEX "ParkingSession_vehicle_id_idx" ON "ParkingSession"("vehicle_id");
CREATE INDEX "ParkingSession_entry_time_idx" ON "ParkingSession"("entry_time");

-- ─── Payment ─────────────────────────────────────────────────────────────────
CREATE TABLE "Payment" (
  "id"                    TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "session_id"            TEXT            NOT NULL UNIQUE REFERENCES "ParkingSession"("id"),
  "user_id"               TEXT            NOT NULL REFERENCES "User"("id"),
  "amount"                FLOAT8          NOT NULL,
  "payment_method"        "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "status"                "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "transaction_reference" TEXT,
  "paid_at"               TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Reservation ─────────────────────────────────────────────────────────────
CREATE TABLE "Reservation" (
  "id"         TEXT                PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"    TEXT                NOT NULL REFERENCES "User"("id"),
  "vehicle_id" TEXT                REFERENCES "Vehicle"("id"),
  "space_id"   TEXT                NOT NULL REFERENCES "ParkingSpace"("id"),
  "start_time" TIMESTAMPTZ         NOT NULL,
  "end_time"   TIMESTAMPTZ         NOT NULL,
  "status"     "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "type"       "ReservationType"   NOT NULL DEFAULT 'STANDARD',
  "notes"      TEXT,
  "created_at" TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);
CREATE INDEX "Reservation_status_idx"     ON "Reservation"("status");
CREATE INDEX "Reservation_user_id_idx"    ON "Reservation"("user_id");
CREATE INDEX "Reservation_start_time_idx" ON "Reservation"("start_time");

-- ─── Notification ────────────────────────────────────────────────────────────
CREATE TABLE "Notification" (
  "id"         TEXT               PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"    TEXT               REFERENCES "User"("id"),
  "type"       "NotificationType" NOT NULL,
  "title"      TEXT               NOT NULL,
  "message"    TEXT               NOT NULL,
  "is_read"    BOOLEAN            NOT NULL DEFAULT FALSE,
  "read_at"    TIMESTAMPTZ,
  "metadata"   JSONB,
  "created_at" TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");
CREATE INDEX "Notification_is_read_idx" ON "Notification"("is_read");

-- ─── AuditLog ────────────────────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"     TEXT        REFERENCES "User"("id"),
  "action"      TEXT        NOT NULL,
  "resource"    TEXT,
  "resource_id" TEXT,
  "metadata"    JSONB,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "AuditLog_user_id_idx"    ON "AuditLog"("user_id");
CREATE INDEX "AuditLog_action_idx"     ON "AuditLog"("action");
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- ─── Blacklist ───────────────────────────────────────────────────────────────
CREATE TABLE "Blacklist" (
  "id"                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "vehicle_id"         TEXT        NOT NULL REFERENCES "Vehicle"("id"),
  "reason"             TEXT        NOT NULL,
  "added_by_user_id"   TEXT        NOT NULL REFERENCES "User"("id"),
  "is_active"          BOOLEAN     NOT NULL DEFAULT TRUE,
  "removed_at"         TIMESTAMPTZ,
  "removed_by_user_id" TEXT        REFERENCES "User"("id"),
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Blacklist_is_active_idx"  ON "Blacklist"("is_active");
CREATE INDEX "Blacklist_vehicle_id_idx" ON "Blacklist"("vehicle_id");

-- ─── BarrierLog ──────────────────────────────────────────────────────────────
CREATE TABLE "BarrierLog" (
  "id"             TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "barrier_id"     TEXT            NOT NULL,
  "action"         "BarrierAction" NOT NULL,
  "trigger_source" "TriggerSource" NOT NULL DEFAULT 'MANUAL',
  "operator_id"    TEXT            REFERENCES "User"("id"),
  "session_id"     TEXT,
  "notes"          TEXT,
  "created_at"     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX "BarrierLog_barrier_id_idx" ON "BarrierLog"("barrier_id");
CREATE INDEX "BarrierLog_created_at_idx" ON "BarrierLog"("created_at");

-- ─── VisitorQR ───────────────────────────────────────────────────────────────
CREATE TABLE "VisitorQR" (
  "id"                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "qr_code"              TEXT        NOT NULL UNIQUE,
  "generated_by_user_id" TEXT        NOT NULL REFERENCES "User"("id"),
  "visitor_name"         TEXT        NOT NULL,
  "vehicle_plate"        TEXT        NOT NULL,
  "purpose"              TEXT,
  "expires_at"           TIMESTAMPTZ NOT NULL,
  "is_used"              BOOLEAN     NOT NULL DEFAULT FALSE,
  "used_at"              TIMESTAMPTZ,
  "session_id"           TEXT        UNIQUE REFERENCES "ParkingSession"("id"),
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "VisitorQR_qr_code_idx"   ON "VisitorQR"("qr_code");
CREATE INDEX "VisitorQR_expires_at_idx" ON "VisitorQR"("expires_at");

-- ─── Camera ──────────────────────────────────────────────────────────────────
CREATE TABLE "Camera" (
  "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"       TEXT        NOT NULL,
  "location"   TEXT        NOT NULL,
  "stream_url" TEXT,
  "has_lpr"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "is_active"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "lat"        FLOAT8,
  "lng"        FLOAT8,
  "campus_id"  TEXT        REFERENCES "Campus"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ParkingSubscription ─────────────────────────────────────────────────────
CREATE TABLE "ParkingSubscription" (
  "id"                TEXT                 PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"           TEXT                 NOT NULL REFERENCES "User"("id"),
  "type"              "SubscriptionType"   NOT NULL,
  "status"            "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "start_date"        TIMESTAMPTZ          NOT NULL,
  "end_date"          TIMESTAMPTZ          NOT NULL,
  "amount_paid"       NUMERIC(10,2)        NOT NULL,
  "payment_reference" TEXT,
  "auto_renew"        BOOLEAN              NOT NULL DEFAULT FALSE,
  "created_at"        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);
CREATE INDEX "ParkingSubscription_user_id_idx" ON "ParkingSubscription"("user_id");
CREATE INDEX "ParkingSubscription_status_idx"  ON "ParkingSubscription"("status");
CREATE INDEX "ParkingSubscription_end_date_idx" ON "ParkingSubscription"("end_date");

-- ─── ParkingEvent ────────────────────────────────────────────────────────────
CREATE TABLE "ParkingEvent" (
  "id"                    TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name"                  TEXT          NOT NULL,
  "description"           TEXT,
  "event_date"            TIMESTAMPTZ   NOT NULL,
  "start_time"            TIMESTAMPTZ   NOT NULL,
  "end_time"              TIMESTAMPTZ   NOT NULL,
  "tariff_mode"           "TariffMode"  NOT NULL DEFAULT 'HOURLY',
  "flat_rate"             NUMERIC(10,2),
  "affected_zones"        TEXT          NOT NULL,
  "status"                "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "created_by_user_id"    TEXT          NOT NULL REFERENCES "User"("id"),
  "notes"                 TEXT,
  "uses_external_parking" BOOLEAN       NOT NULL DEFAULT FALSE,
  "external_parking_name" TEXT,
  "shuttle_available"     BOOLEAN       NOT NULL DEFAULT FALSE,
  "capacity_override"     INT,
  "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "ParkingEvent_event_date_idx" ON "ParkingEvent"("event_date");
CREATE INDEX "ParkingEvent_status_idx"     ON "ParkingEvent"("status");

-- ─── MonthlyBill ─────────────────────────────────────────────────────────────
CREATE TABLE "MonthlyBill" (
  "id"                TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"           TEXT         NOT NULL REFERENCES "User"("id"),
  "month"             INT          NOT NULL,
  "year"              INT          NOT NULL,
  "total_sessions"    INT          NOT NULL DEFAULT 0,
  "total_minutes"     INT          NOT NULL DEFAULT 0,
  "total_amount"      NUMERIC(10,2) NOT NULL DEFAULT 0,
  "status"            "BillStatus" NOT NULL DEFAULT 'OPEN',
  "due_date"          TIMESTAMPTZ  NOT NULL,
  "paid_at"           TIMESTAMPTZ,
  "payment_reference" TEXT,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id", "month", "year")
);
CREATE INDEX "MonthlyBill_user_id_idx"    ON "MonthlyBill"("user_id");
CREATE INDEX "MonthlyBill_month_year_idx" ON "MonthlyBill"("month", "year");
CREATE INDEX "MonthlyBill_status_idx"     ON "MonthlyBill"("status");

-- ─── CardReplacement ─────────────────────────────────────────────────────────
CREATE TABLE "CardReplacement" (
  "id"                   TEXT                PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id"              TEXT                NOT NULL REFERENCES "User"("id"),
  "old_nfc_token"        TEXT,
  "new_nfc_token"        TEXT,
  "reason"               "ReplacementReason" NOT NULL,
  "replacement_fee"      NUMERIC(10,2)       NOT NULL DEFAULT 50.00,
  "fee_paid"             BOOLEAN             NOT NULL DEFAULT FALSE,
  "requested_at"         TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "processed_at"         TIMESTAMPTZ,
  "processed_by_user_id" TEXT                REFERENCES "User"("id"),
  "notes"                TEXT,
  "created_at"           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);
