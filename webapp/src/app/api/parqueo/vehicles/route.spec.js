const prisma = require('@/lib/prisma').default;
const { GET, POST } = require('./route');
const { makeRequest } = require('../../../../../test/helpers/auth');
const { mockVehicle, mockUser } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /vehicles ─────────────────────────────────────────────────────────────
describe('GET /vehicles', () => {
  it('retorna lista paginada de vehículos', async () => {
    prisma.vehicle.count.mockResolvedValue(5);
    prisma.vehicle.findMany.mockResolvedValue([mockVehicle(), mockVehicle()]);

    const req = makeRequest('GET', '/api/parqueo/vehicles', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 5);
    expect(body.data.data).toHaveLength(2);
  });

  it('filtra por blacklisted=true', async () => {
    prisma.vehicle.count.mockResolvedValue(0);
    prisma.vehicle.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/vehicles?blacklisted=true', { role: 'ADMIN' });
    await GET(req);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ blacklisted: true }) }),
    );
  });

  it('filtra por search (placa parcial)', async () => {
    prisma.vehicle.count.mockResolvedValue(0);
    prisma.vehicle.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/vehicles?search=ABC', { role: 'ADMIN' });
    await GET(req);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ placa: { contains: 'ABC' } }) }),
    );
  });
});

// ── POST /vehicles ────────────────────────────────────────────────────────────
describe('POST /vehicles', () => {
  it('crea vehículo con datos válidos', async () => {
    const vehicle = mockVehicle({ overrides: { placa: 'P-001ABC' } });
    prisma.vehicle.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.vehicle.create.mockResolvedValue(vehicle);

    const req = makeRequest('POST', '/api/parqueo/vehicles', {
      role: 'SECURITY',
      body: { placa: 'P-001ABC', brand: 'Toyota', model: 'Corolla', color: 'Blanco', year: 2020, type: 'STANDARD' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.placa).toBe('P-001ABC');
  });

  it('normaliza la placa a mayúsculas', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.vehicle.create.mockResolvedValue(mockVehicle({ overrides: { placa: 'P-001ABC' } }));

    const req = makeRequest('POST', '/api/parqueo/vehicles', {
      role: 'SECURITY',
      body: { placa: 'p-001abc', brand: 'Toyota', model: 'Corolla', color: 'Blanco', year: 2020, type: 'STANDARD' },
    });
    await POST(req);

    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { placa: 'P-001ABC' } }),
    );
  });

  it('vincula vehículo a usuario por owner_carnet', async () => {
    const user = mockUser({ role: 'STUDENT' });
    const vehicle = mockVehicle({ overrides: { user_id: user.id } });

    prisma.vehicle.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.vehicle.create.mockResolvedValue(vehicle);

    const req = makeRequest('POST', '/api/parqueo/vehicles', {
      body: { placa: 'P-999XYZ', brand: 'Honda', model: 'Civic', color: 'Negro', year: 2021, type: 'STANDARD', owner_carnet: user.carnet },
    });
    await POST(req);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ carnet: user.carnet }) }),
    );
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ user_id: user.id }) }),
    );
  });

  it('retorna 409 si la placa ya está registrada', async () => {
    const vehicle = mockVehicle({ overrides: { placa: 'P-001ABC' } });
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);

    const req = makeRequest('POST', '/api/parqueo/vehicles', {
      role: 'SECURITY',
      body: { placa: 'P-001ABC', brand: 'Toyota', model: 'Corolla', color: 'Blanco', year: 2020, type: 'STANDARD' },
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});

// ── GET /vehicles/search ──────────────────────────────────────────────────────
describe('GET /vehicles/search', () => {
  let GET_SEARCH;
  beforeAll(() => {
    GET_SEARCH = require('./search/route').GET;
  });

  it('busca vehículo por placa parcial', async () => {
    const vehicle = mockVehicle({ overrides: { placa: 'P-123ABC', sessions: [] } });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);

    const req = makeRequest('GET', '/api/parqueo/vehicles/search?plate=P-123', { role: 'SECURITY' });
    const res = await GET_SEARCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.placa).toBe('P-123ABC');
  });

  it('retorna 404 si no existe la placa', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    const req = makeRequest('GET', '/api/parqueo/vehicles/search?plate=NOEXISTE', { role: 'SECURITY' });
    const res = await GET_SEARCH(req);

    expect(res.status).toBe(404);
  });

  it('retorna error 400 si no se pasa plate', async () => {
    const req = makeRequest('GET', '/api/parqueo/vehicles/search', { role: 'SECURITY' });
    const res = await GET_SEARCH(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ── POST/DELETE /vehicles/[id]/blacklist ──────────────────────────────────────
describe('POST /vehicles/[id]/blacklist', () => {
  let POST_BLACKLIST, DELETE_BLACKLIST;
  beforeAll(() => {
    const mod = require('./[id]/blacklist/route');
    POST_BLACKLIST   = mod.POST;
    DELETE_BLACKLIST = mod.DELETE;
  });

  it('agrega vehículo a lista negra con razón', async () => {
    const vehicle = mockVehicle({ blacklisted: false });
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.$transaction.mockResolvedValue([]);

    const req = makeRequest('POST', `/api/parqueo/vehicles/${vehicle.id}/blacklist`, {
      role: 'ADMIN',
      body: { reason: 'Infracciones repetidas' },
    });
    const res = await POST_BLACKLIST(req, { params: Promise.resolve({ id: vehicle.id }) });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('retorna 404 si el vehículo no existe al blacklistear', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/vehicles/noexiste/blacklist', {
      role: 'ADMIN',
      body: { reason: 'Test' },
    });
    const res = await POST_BLACKLIST(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });

  it('remueve vehículo de lista negra', async () => {
    const entry = { id: 'bl-001', vehicle_id: 'v-001', is_active: true };
    prisma.blacklist.findFirst.mockResolvedValue(entry);
    prisma.$transaction.mockResolvedValue([]);

    const req = makeRequest('DELETE', '/api/parqueo/vehicles/v-001/blacklist', { role: 'ADMIN' });
    const res = await DELETE_BLACKLIST(req, { params: Promise.resolve({ id: 'v-001' }) });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('retorna 404 si no hay entrada activa en blacklist', async () => {
    prisma.blacklist.findFirst.mockResolvedValue(null);

    const req = makeRequest('DELETE', '/api/parqueo/vehicles/v-001/blacklist', { role: 'ADMIN' });
    const res = await DELETE_BLACKLIST(req, { params: Promise.resolve({ id: 'v-001' }) });

    expect(res.status).toBe(404);
  });
});
