const prisma = require('@/lib/prisma').default;
const { POST, GET } = require('./route');
const { makeRequest, TEST_USERS } = require('../../../../../test/helpers/auth');
const { mockSpace, mockVehicle, mockReservation } = require('../../../../../test/fixtures');


const FUTURE_START = new Date(Date.now() + 3600000).toISOString();
const FUTURE_END   = new Date(Date.now() + 7200000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST /reservations ────────────────────────────────────────────────────────
describe('POST /reservations — Crear reserva', () => {
  it('crea reserva y marca espacio como RESERVED', async () => {
    const space = mockSpace({ status: 'AVAILABLE' });
    const reservation = mockReservation({ status: 'CONFIRMED', overrides: { space_id: space.id } });

    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.vehicle.findFirst.mockResolvedValue(null);
    prisma.reservation.create.mockResolvedValue(reservation);
    prisma.parkingSpace.update.mockResolvedValue({ ...space, status: 'RESERVED' });

    const req = makeRequest('POST', '/api/parqueo/reservations', {
      role: 'STUDENT',
      body: { space_id: space.id, start_time: FUTURE_START, end_time: FUTURE_END, type: 'STANDARD' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.status).toBe('CONFIRMED');
    expect(prisma.parkingSpace.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESERVED' }) }),
    );
  });

  it('retorna 409 si hay conflicto de horario', async () => {
    const space = mockSpace({ status: 'AVAILABLE' });
    const existing = mockReservation({ status: 'CONFIRMED' });

    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.reservation.findFirst.mockResolvedValue(existing);

    const req = makeRequest('POST', '/api/parqueo/reservations', {
      role: 'STUDENT',
      body: { space_id: space.id, start_time: FUTURE_START, end_time: FUTURE_END, type: 'STANDARD' },
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });

  it('retorna 404 si el espacio no existe', async () => {
    prisma.parkingSpace.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/reservations', {
      role: 'STUDENT',
      body: { space_id: 'noexiste', start_time: FUTURE_START, end_time: FUTURE_END },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('retorna error si end_time <= start_time', async () => {
    const req = makeRequest('POST', '/api/parqueo/reservations', {
      role: 'STUDENT',
      body: {
        space_id: 'space-001',
        start_time: FUTURE_END,
        end_time: FUTURE_START,
      },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna error si start_time está en el pasado', async () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const req = makeRequest('POST', '/api/parqueo/reservations', {
      role: 'STUDENT',
      body: { space_id: 'space-001', start_time: past, end_time: FUTURE_END },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 401 si no hay user_id ni token', async () => {
    const req = makeRequest('POST', '/api/parqueo/reservations', {
      body: { space_id: 'space-001', start_time: FUTURE_START, end_time: FUTURE_END },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ── GET /reservations ─────────────────────────────────────────────────────────
describe('GET /reservations', () => {
  it('retorna lista paginada de reservas', async () => {
    prisma.reservation.count.mockResolvedValue(2);
    prisma.reservation.findMany.mockResolvedValue([mockReservation(), mockReservation()]);

    const req = makeRequest('GET', '/api/parqueo/reservations', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 2);
    expect(body.data.data).toHaveLength(2);
  });
});

// ── POST /reservations/[id]/cancel ────────────────────────────────────────────
describe('POST /reservations/[id]/cancel', () => {
  let POST_CANCEL;
  beforeAll(() => {
    POST_CANCEL = require('./[id]/cancel/route').POST;
  });

  it('cancela reserva CONFIRMED y libera el espacio', async () => {
    const reservation = mockReservation({ status: 'CONFIRMED', overrides: { user_id: TEST_USERS.STUDENT.id } });

    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.$transaction.mockResolvedValue([]);

    const req = makeRequest('POST', `/api/parqueo/reservations/${reservation.id}/cancel`, { role: 'STUDENT' });
    const res = await POST_CANCEL(req, { params: Promise.resolve({ id: reservation.id }) });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('permite a ADMIN cancelar reserva de cualquier usuario', async () => {
    const reservation = mockReservation({ status: 'CONFIRMED', overrides: { user_id: 'otro-user' } });
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.$transaction.mockResolvedValue([]);

    const req = makeRequest('POST', `/api/parqueo/reservations/${reservation.id}/cancel`, { role: 'ADMIN' });
    const res = await POST_CANCEL(req, { params: Promise.resolve({ id: reservation.id }) });

    expect(res.status).toBe(200);
  });

  it('retorna 403 si el usuario intenta cancelar reserva de otro', async () => {
    const reservation = mockReservation({ status: 'CONFIRMED', overrides: { user_id: 'otro-user-id' } });
    prisma.reservation.findUnique.mockResolvedValue(reservation);

    const req = makeRequest('POST', `/api/parqueo/reservations/${reservation.id}/cancel`, { role: 'STUDENT' });
    const res = await POST_CANCEL(req, { params: Promise.resolve({ id: reservation.id }) });

    expect(res.status).toBe(403);
  });

  it('retorna error si la reserva ya está CANCELLED', async () => {
    const reservation = mockReservation({ status: 'CANCELLED' });
    prisma.reservation.findUnique.mockResolvedValue(reservation);

    const req = makeRequest('POST', `/api/parqueo/reservations/${reservation.id}/cancel`, { role: 'ADMIN' });
    const res = await POST_CANCEL(req, { params: Promise.resolve({ id: reservation.id }) });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 404 si la reserva no existe', async () => {
    prisma.reservation.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/reservations/noexiste/cancel', { role: 'ADMIN' });
    const res = await POST_CANCEL(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});
