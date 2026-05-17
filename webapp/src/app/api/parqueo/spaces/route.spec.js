const prisma = require('@/lib/prisma').default;
const { GET, POST } = require('./route');
const { makeRequest } = require('../../../../../test/helpers/auth');
const { mockSpace } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /spaces ───────────────────────────────────────────────────────────────
describe('GET /spaces', () => {
  it('retorna lista de espacios sin filtros', async () => {
    const spaces = [mockSpace(), mockSpace({ zone: 'B' })];
    prisma.parkingSpace.findMany.mockResolvedValue(spaces);

    const req = makeRequest('GET', '/api/parqueo/spaces');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('filtra por zone', async () => {
    const spaces = [mockSpace({ zone: 'A' })];
    prisma.parkingSpace.findMany.mockResolvedValue(spaces);

    const req = makeRequest('GET', '/api/parqueo/spaces?zone=A');
    const res = await GET(req);

    expect(prisma.parkingSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ zone: 'A' }) }),
    );
    expect(res.status).toBe(200);
  });

  it('filtra por type', async () => {
    prisma.parkingSpace.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces?type=SPECIAL');
    await GET(req);

    expect(prisma.parkingSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'SPECIAL' }) }),
    );
  });

  it('filtra por status', async () => {
    prisma.parkingSpace.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces?status=OCCUPIED');
    await GET(req);

    expect(prisma.parkingSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'OCCUPIED' }) }),
    );
  });

  it('filtra por campus_id', async () => {
    prisma.parkingSpace.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces?campus_id=campus-001');
    await GET(req);

    expect(prisma.parkingSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ campus_id: 'campus-001' }) }),
    );
  });
});

// ── POST /spaces ──────────────────────────────────────────────────────────────
describe('POST /spaces', () => {
  it('crea espacio nuevo con datos válidos', async () => {
    const space = mockSpace();
    prisma.parkingSpace.findUnique.mockResolvedValue(null);
    prisma.parkingSpace.create.mockResolvedValue(space);

    const req = makeRequest('POST', '/api/parqueo/spaces', {
      role: 'ADMIN',
      body: { code: space.code, zone: space.zone, type: space.type, floor: 1, campus_id: space.campus_id },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.code).toBe(space.code);
  });

  it('retorna 409 si el code ya existe', async () => {
    const space = mockSpace();
    prisma.parkingSpace.findUnique.mockResolvedValue(space);

    const req = makeRequest('POST', '/api/parqueo/spaces', {
      role: 'ADMIN',
      body: { code: space.code, zone: 'A', type: 'STANDARD', campus_id: 'campus-001' },
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});

// ── GET /spaces/available ──────────────────────────────────────────────────────
describe('GET /spaces/available', () => {
  let GET_AVAILABLE;
  beforeAll(() => {
    GET_AVAILABLE = require('./available/route').GET;
  });

  it('retorna solo espacios disponibles con count', async () => {
    const spaces = [mockSpace({ status: 'AVAILABLE' }), mockSpace({ status: 'AVAILABLE', zone: 'B' })];
    prisma.parkingSpace.findMany.mockResolvedValue(spaces);

    const req = makeRequest('GET', '/api/parqueo/spaces/available');
    const res = await GET_AVAILABLE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('count', 2);
    expect(body.data.spaces).toHaveLength(2);
  });

  it('filtra disponibles por zone', async () => {
    prisma.parkingSpace.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces/available?zone=C');
    await GET_AVAILABLE(req);

    expect(prisma.parkingSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'AVAILABLE', zone: 'C' }),
      }),
    );
  });
});

// ── GET /spaces/status ────────────────────────────────────────────────────────
describe('GET /spaces/status', () => {
  let GET_STATUS;
  beforeAll(() => {
    GET_STATUS = require('./status/route').GET;
  });

  it('retorna estadísticas de ocupación', async () => {
    prisma.parkingSpace.count
      .mockResolvedValueOnce(500)  // total
      .mockResolvedValueOnce(200)  // available
      .mockResolvedValueOnce(250)  // occupied
      .mockResolvedValueOnce(30)   // reserved
      .mockResolvedValueOnce(20);  // maintenance
    prisma.parkingSpace.groupBy.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces/status');
    const res = await GET_STATUS(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 500);
    expect(body.data).toHaveProperty('available', 200);
    expect(body.data).toHaveProperty('occupied', 250);
    expect(body.data).toHaveProperty('occupancy_rate');
    expect(body.data).toHaveProperty('by_zone');
  });

  it('calcula occupancy_rate correctamente', async () => {
    prisma.parkingSpace.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5);
    prisma.parkingSpace.groupBy.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/spaces/status');
    const res = await GET_STATUS(req);
    const body = await res.json();

    expect(body.data.occupancy_rate).toBe(40);
  });
});

// ── POST /spaces/sensor ───────────────────────────────────────────────────────
describe('POST /spaces/sensor', () => {
  let POST_SENSOR;
  beforeAll(() => {
    POST_SENSOR = require('./sensor/route').POST;
  });

  it('actualiza estado a OCCUPIED via sensor', async () => {
    const space = mockSpace({ status: 'AVAILABLE' });
    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.parkingSpace.update.mockResolvedValue({ ...space, status: 'OCCUPIED' });

    const req = makeRequest('POST', '/api/parqueo/spaces/sensor', {
      body: { space_code: space.code, status: 'OCCUPIED' },
    });
    const res = await POST_SENSOR(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.parkingSpace.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'OCCUPIED' }) }),
    );
  });

  it('actualiza estado a AVAILABLE via sensor', async () => {
    const space = mockSpace({ status: 'OCCUPIED' });
    prisma.parkingSpace.findUnique.mockResolvedValue(space);
    prisma.parkingSpace.update.mockResolvedValue({ ...space, status: 'AVAILABLE' });

    const req = makeRequest('POST', '/api/parqueo/spaces/sensor', {
      body: { space_code: space.code, status: 'FREE' },
    });
    const res = await POST_SENSOR(req);

    expect(res.status).toBe(200);
    expect(prisma.parkingSpace.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) }),
    );
  });

  it('retorna 404 si el espacio no existe', async () => {
    prisma.parkingSpace.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/spaces/sensor', {
      body: { space_code: 'NOEXISTE', status: 'OCCUPIED' },
    });
    const res = await POST_SENSOR(req);

    expect(res.status).toBe(404);
  });
});
