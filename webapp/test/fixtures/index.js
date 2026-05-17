const { v4: uuid } = require('uuid');

function mockUser({ role = 'STUDENT', overrides = {} } = {}) {
  return {
    id:            overrides.id            ?? `user-${uuid()}`,
    first_name:    overrides.first_name    ?? 'Juan',
    last_name:     overrides.last_name     ?? 'García',
    email:         overrides.email         ?? `juan.garcia+${Date.now()}@uspg.edu.gt`,
    password_hash: overrides.password_hash ?? '$2b$12$hashedpassword',
    role:          overrides.role          ?? role,
    carnet:        overrides.carnet        ?? `2023${Math.floor(Math.random() * 90000 + 10000)}`,
    is_active:     overrides.is_active     ?? true,
    deleted_at:    overrides.deleted_at    ?? null,
    qr_code:       overrides.qr_code       ?? `QR-${uuid()}`,
    nfc_token:     overrides.nfc_token     ?? null,
    last_login_at: overrides.last_login_at ?? null,
    created_at:    overrides.created_at    ?? new Date('2026-01-01'),
    updated_at:    overrides.updated_at    ?? new Date('2026-01-01'),
    vehicles:      overrides.vehicles      ?? [],
    ...overrides,
  };
}

function mockVehicle({ blacklisted = false, overrides = {} } = {}) {
  return {
    id:               overrides.id               ?? `vehicle-${uuid()}`,
    placa:            overrides.placa            ?? `P-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}ABC`,
    brand:            overrides.brand            ?? 'Toyota',
    model:            overrides.model            ?? 'Corolla',
    color:            overrides.color            ?? 'Blanco',
    year:             overrides.year             ?? 2020,
    type:             overrides.type             ?? 'STANDARD',
    user_id:          overrides.user_id          ?? `user-${uuid()}`,
    is_authorized:    overrides.is_authorized    ?? true,
    blacklisted:      overrides.blacklisted      ?? blacklisted,
    blacklist_reason: overrides.blacklist_reason ?? (blacklisted ? 'Infracción reglamento' : null),
    deleted_at:       overrides.deleted_at       ?? null,
    created_at:       overrides.created_at       ?? new Date('2026-01-01'),
    updated_at:       overrides.updated_at       ?? new Date('2026-01-01'),
    ...overrides,
  };
}

function mockSpace({ status = 'AVAILABLE', zone = 'A', overrides = {} } = {}) {
  const zoneNum = { A: '001', B: '126', C: '251', D: '376' }[zone] ?? '001';
  return {
    id:        overrides.id        ?? `space-${uuid()}`,
    code:      overrides.code      ?? `${zone}-${zoneNum}`,
    zone:      overrides.zone      ?? zone,
    type:      overrides.type      ?? 'STANDARD',
    status:    overrides.status    ?? status,
    floor:     overrides.floor     ?? 1,
    is_active: overrides.is_active ?? true,
    campus_id: overrides.campus_id ?? `campus-${uuid()}`,
    pos_x:     overrides.pos_x     ?? 0,
    pos_y:     overrides.pos_y     ?? 0,
    created_at: overrides.created_at ?? new Date('2026-01-01'),
    updated_at: overrides.updated_at ?? new Date('2026-01-01'),
    ...overrides,
  };
}

function mockSession({ status = 'ACTIVE', overrides = {} } = {}) {
  const entryTime = overrides.entry_time ?? new Date(Date.now() - 60 * 60 * 1000); // hace 1h
  return {
    id:                overrides.id                ?? `session-${uuid()}`,
    vehicle_id:        overrides.vehicle_id        ?? `vehicle-${uuid()}`,
    space_id:          overrides.space_id          ?? `space-${uuid()}`,
    user_id:           overrides.user_id           ?? `user-${uuid()}`,
    status:            overrides.status            ?? status,
    entry_time:        entryTime,
    exit_time:         overrides.exit_time         ?? (status === 'COMPLETED' ? new Date() : null),
    duration_minutes:  overrides.duration_minutes  ?? (status === 'COMPLETED' ? 60 : null),
    amount_due:        overrides.amount_due        ?? (status === 'COMPLETED' ? 5.00 : null),
    is_paid:           overrides.is_paid           ?? false,
    entry_method:      overrides.entry_method      ?? 'MANUAL',
    operator_entry_id: overrides.operator_entry_id ?? null,
    operator_exit_id:  overrides.operator_exit_id  ?? null,
    created_at:        overrides.created_at        ?? new Date('2026-01-01'),
    updated_at:        overrides.updated_at        ?? new Date('2026-01-01'),
    vehicle:           overrides.vehicle           ?? mockVehicle(),
    space:             overrides.space             ?? mockSpace({ status: 'OCCUPIED' }),
    user:              overrides.user              ?? mockUser(),
    ...overrides,
  };
}

function mockPayment({ status = 'PENDING', overrides = {} } = {}) {
  return {
    id:                    overrides.id                    ?? `payment-${uuid()}`,
    session_id:            overrides.session_id            ?? `session-${uuid()}`,
    user_id:               overrides.user_id               ?? `user-${uuid()}`,
    amount:                overrides.amount                ?? 25.00,
    payment_method:        overrides.payment_method        ?? 'CASH',
    status:                overrides.status                ?? status,
    transaction_reference: overrides.transaction_reference ?? null,
    paid_at:               overrides.paid_at               ?? (status === 'COMPLETED' ? new Date() : null),
    created_at:            overrides.created_at            ?? new Date('2026-01-01'),
    updated_at:            overrides.updated_at            ?? new Date('2026-01-01'),
    ...overrides,
  };
}

function mockReservation({ status = 'CONFIRMED', overrides = {} } = {}) {
  const now = new Date();
  return {
    id:         overrides.id         ?? `reservation-${uuid()}`,
    user_id:    overrides.user_id    ?? `user-${uuid()}`,
    space_id:   overrides.space_id   ?? `space-${uuid()}`,
    vehicle_id: overrides.vehicle_id ?? null,
    status:     overrides.status     ?? status,
    type:       overrides.type       ?? 'STANDARD',
    start_time: overrides.start_time ?? new Date(now.getTime() + 3600000),
    end_time:   overrides.end_time   ?? new Date(now.getTime() + 7200000),
    notes:      overrides.notes      ?? null,
    created_at: overrides.created_at ?? new Date('2026-01-01'),
    space:      overrides.space      ?? mockSpace({ status: 'RESERVED' }),
    ...overrides,
  };
}

module.exports = { mockUser, mockVehicle, mockSpace, mockSession, mockPayment, mockReservation };
