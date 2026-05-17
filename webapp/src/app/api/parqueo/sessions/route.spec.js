const prisma = require('@/lib/prisma').default;
const { POST } = require('./route');
const { makeRequest, TEST_USERS } = require('../../../../../test/helpers/auth');
const { mockVehicle, mockSpace, mockSession } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST /sessions — Entry ────────────────────────────────────────────────────
describe('POST /sessions — Registrar entrada', () => {
  it('registra entrada exitosa con vehículo y espacio válidos', async () => {
    const vehicle = mockVehicle({ blacklisted: false });
    const space   = mockSpace({ status: 'AVAILABLE' });
    const session = mockSession({ status: 'ACTIVE', overrides: { vehicle_id: vehicle.id, space_id: space.id } });

    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.parkingSession.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockResolvedValue([session]);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: space.id, entry_method: 'MANUAL' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it('retorna error si el vehículo está en lista negra', async () => {
    const vehicle = mockVehicle({ blacklisted: true });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: 'space-001' },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 404 si el vehículo no existe', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: 'noexiste', space_id: 'space-001' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('retorna error si el espacio no está disponible', async () => {
    const vehicle = mockVehicle();
    const space   = mockSpace({ status: 'OCCUPIED' });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.parkingSpace.findUnique.mockResolvedValue(space);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: space.id },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 404 si el espacio no existe', async () => {
    const vehicle = mockVehicle();
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.parkingSpace.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: 'noexiste' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('retorna error si el vehículo ya tiene sesión activa', async () => {
    const vehicle = mockVehicle();
    const space   = mockSpace({ status: 'AVAILABLE' });
    const existing = mockSession({ status: 'ACTIVE' });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.parkingSession.findFirst.mockResolvedValue(existing);

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: space.id },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('marca el espacio como OCCUPIED en la transacción', async () => {
    const vehicle = mockVehicle();
    const space   = mockSpace({ status: 'AVAILABLE' });
    const session = mockSession({ status: 'ACTIVE' });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.parkingSession.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (ops) => {
      return Promise.all(ops);
    });
    prisma.parkingSession.create.mockResolvedValue(session);
    prisma.parkingSpace.update.mockResolvedValue({ ...space, status: 'OCCUPIED' });

    const req = makeRequest('POST', '/api/parqueo/sessions', {
      role: 'SECURITY',
      body: { vehicle_id: vehicle.id, space_id: space.id },
    });
    await POST(req);

    expect(prisma.parkingSpace.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'OCCUPIED' }) }),
    );
  });
});

// ── GET /sessions/active ──────────────────────────────────────────────────────
describe('GET /sessions/active', () => {
  let GET_ACTIVE;
  beforeAll(() => {
    GET_ACTIVE = require('./active/route').GET;
  });

  it('retorna sesiones activas con count', async () => {
    const sessions = [mockSession({ status: 'ACTIVE' }), mockSession({ status: 'ACTIVE' })];
    prisma.parkingSession.findMany.mockResolvedValue(sessions);

    const req = makeRequest('GET', '/api/parqueo/sessions/active');
    const res = await GET_ACTIVE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('count', 2);
    expect(body.data.sessions).toHaveLength(2);
  });
});

// ── GET /sessions/history ─────────────────────────────────────────────────────
describe('GET /sessions/history', () => {
  let GET_HISTORY;
  beforeAll(() => {
    GET_HISTORY = require('./history/route').GET;
  });

  it('retorna historial paginado de sesiones', async () => {
    const sessions = [mockSession({ status: 'COMPLETED' })];
    prisma.parkingSession.count.mockResolvedValue(1);
    prisma.parkingSession.findMany.mockResolvedValue(sessions);

    const req = makeRequest('GET', '/api/parqueo/sessions/history?page=1&limit=20');
    const res = await GET_HISTORY(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 1);
    expect(body.data).toHaveProperty('page');
    expect(body.data).toHaveProperty('data');
  });

  it('filtra por vehicle_id', async () => {
    prisma.parkingSession.count.mockResolvedValue(0);
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/sessions/history?vehicle_id=vehicle-001');
    await GET_HISTORY(req);

    expect(prisma.parkingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ vehicle_id: 'vehicle-001' }) }),
    );
  });

  it('filtra por user_id', async () => {
    prisma.parkingSession.count.mockResolvedValue(0);
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/sessions/history?user_id=user-001');
    await GET_HISTORY(req);

    expect(prisma.parkingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ user_id: 'user-001' }) }),
    );
  });
});

// ── POST /sessions/[id]/exit ──────────────────────────────────────────────────
describe('POST /sessions/[id]/exit', () => {
  let POST_EXIT;
  beforeAll(() => {
    POST_EXIT = require('./[id]/exit/route').POST;
  });

  function makeExitRequest(sessionId, role = 'SECURITY') {
    const req = makeRequest('POST', `/api/parqueo/sessions/${sessionId}/exit`, { role, body: {} });
    return Object.assign(req, { _params: { id: sessionId } });
  }

  it('registra salida y calcula duración correctamente', async () => {
    const session = mockSession({
      status: 'ACTIVE',
      overrides: { entry_time: new Date(Date.now() - 60 * 60 * 1000), user: { role: 'STUDENT' } },
    });
    const completed = { ...session, status: 'COMPLETED', exit_time: new Date(), duration_minutes: 60, amount_due: 5 };

    prisma.parkingSession.findFirst.mockResolvedValue(session);
    prisma.$transaction.mockImplementation(async (ops) => Promise.all(ops));
    prisma.parkingSession.update.mockResolvedValue(completed);
    prisma.parkingSpace.update.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/sessions/session-001/exit', { role: 'SECURITY', body: {} });
    const res = await POST_EXIT(req, { params: Promise.resolve({ id: 'session-001' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('aplica tarifa Q0 para TEACHER', async () => {
    const session = mockSession({
      status: 'ACTIVE',
      overrides: {
        entry_time: new Date(Date.now() - 60 * 60 * 1000),
        user: { role: 'TEACHER' },
      },
    });
    prisma.parkingSession.findFirst.mockResolvedValue(session);
    prisma.$transaction.mockImplementation(async (ops) => Promise.all(ops));
    prisma.parkingSession.update.mockResolvedValue({ ...session, amount_due: 0 });
    prisma.parkingSpace.update.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/sessions/session-001/exit', { role: 'ADMIN', body: {} });
    await POST_EXIT(req, { params: Promise.resolve({ id: 'session-001' }) });

    expect(prisma.parkingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount_due: 0 }) }),
    );
  });

  it('aplica tarifa Q10/hr para VISITOR', async () => {
    const session = mockSession({
      status: 'ACTIVE',
      overrides: {
        entry_time: new Date(Date.now() - 60 * 60 * 1000),
        user: { role: 'VISITOR' },
      },
    });
    prisma.parkingSession.findFirst.mockResolvedValue(session);
    prisma.$transaction.mockImplementation(async (ops) => Promise.all(ops));
    prisma.parkingSession.update.mockResolvedValue({ ...session, amount_due: 10 });
    prisma.parkingSpace.update.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/sessions/session-001/exit', { role: 'ADMIN', body: {} });
    await POST_EXIT(req, { params: Promise.resolve({ id: 'session-001' }) });

    expect(prisma.parkingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount_due: 10 }) }),
    );
  });

  it('marca el espacio como AVAILABLE al salir', async () => {
    const session = mockSession({ status: 'ACTIVE', overrides: { entry_time: new Date(Date.now() - 30 * 60 * 1000) } });
    prisma.parkingSession.findFirst.mockResolvedValue(session);
    prisma.$transaction.mockImplementation(async (ops) => Promise.all(ops));
    prisma.parkingSession.update.mockResolvedValue({ ...session, status: 'COMPLETED' });
    prisma.parkingSpace.update.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/sessions/session-001/exit', { role: 'SECURITY', body: {} });
    await POST_EXIT(req, { params: Promise.resolve({ id: 'session-001' }) });

    expect(prisma.parkingSpace.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) }),
    );
  });

  it('retorna 404 si la sesión no existe o no está activa', async () => {
    prisma.parkingSession.findFirst.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/sessions/noexiste/exit', { role: 'SECURITY', body: {} });
    const res = await POST_EXIT(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});

// ── GET /sessions/[id]/ticket ─────────────────────────────────────────────────
describe('GET /sessions/[id]/ticket', () => {
  let GET_TICKET;
  beforeAll(() => {
    GET_TICKET = require('./[id]/ticket/route').GET;
  });

  it('retorna ticket con campos requeridos', async () => {
    const session = mockSession({ status: 'COMPLETED' });
    prisma.parkingSession.findUnique.mockResolvedValue(session);

    const req = makeRequest('GET', '/api/parqueo/sessions/session-001/ticket', { role: 'SECURITY' });
    const res = await GET_TICKET(req, { params: Promise.resolve({ id: session.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('ticket_number');
    expect(body.data).toHaveProperty('vehicle');
    expect(body.data).toHaveProperty('space');
    expect(body.data).toHaveProperty('entry_time');
    expect(body.data).toHaveProperty('amount_due');
  });

  it('retorna 404 si la sesión no existe', async () => {
    prisma.parkingSession.findUnique.mockResolvedValue(null);

    const req = makeRequest('GET', '/api/parqueo/sessions/noexiste/ticket', { role: 'SECURITY' });
    const res = await GET_TICKET(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});
