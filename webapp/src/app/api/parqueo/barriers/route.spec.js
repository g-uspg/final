const prisma = require('@/lib/prisma').default;
const { makeRequest } = require('../../../../../test/helpers/auth');


beforeEach(() => {
  jest.clearAllMocks();
  // Reset the barriers Map state between tests by re-requiring the module
  jest.resetModules();
});

// ── GET /barriers ─────────────────────────────────────────────────────────────
describe('GET /barriers', () => {
  it('retorna lista de barreras', async () => {
    const { GET } = require('./route');

    const req = makeRequest('GET', '/api/parqueo/barriers', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('cada barrera tiene id, name, location, is_open, is_blocked', async () => {
    const { GET } = require('./route');

    const req = makeRequest('GET', '/api/parqueo/barriers', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    const barrier = body.data[0];
    expect(barrier).toHaveProperty('id');
    expect(barrier).toHaveProperty('name');
    expect(barrier).toHaveProperty('location');
    expect(barrier).toHaveProperty('is_open');
    expect(barrier).toHaveProperty('is_blocked');
  });

  it('retorna barrera específica por barrier_id', async () => {
    const { GET } = require('./route');

    const req = makeRequest('GET', '/api/parqueo/barriers?barrier_id=barrier-entrada-a', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('barrier-entrada-a');
  });

  it('retorna 404 para barrier_id inexistente', async () => {
    const { GET } = require('./route');

    const req = makeRequest('GET', '/api/parqueo/barriers?barrier_id=noexiste', { role: 'ADMIN' });
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});

// ── POST /barriers/[id]/command ───────────────────────────────────────────────
describe('POST /barriers/[id]/command', () => {
  it('ejecuta comando OPEN correctamente', async () => {
    const { POST } = require('./[id]/command/route');
    prisma.barrierLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/barriers/barrier-entrada-a/command', {
      role: 'ADMIN',
      body: { action: 'OPEN', reason: 'Prueba manual' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'barrier-entrada-a' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.is_open).toBe(true);
    expect(body.data.is_blocked).toBe(false);
  });

  it('ejecuta comando CLOSE correctamente', async () => {
    const { POST } = require('./[id]/command/route');
    prisma.barrierLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/barriers/barrier-salida-a/command', {
      role: 'SECURITY',
      body: { action: 'CLOSE' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'barrier-salida-a' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.is_open).toBe(false);
  });

  it('ejecuta comando BLOCK correctamente', async () => {
    const { POST } = require('./[id]/command/route');
    prisma.barrierLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/barriers/barrier-entrada-b/command', {
      role: 'ADMIN',
      body: { action: 'BLOCK', reason: 'Emergencia' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'barrier-entrada-b' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.is_blocked).toBe(true);
    expect(body.data.is_open).toBe(false);
  });

  it('persiste el comando en BarrierLog', async () => {
    const { POST } = require('./[id]/command/route');
    const freshPrisma = require('@/lib/prisma').default;
    freshPrisma.barrierLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/barriers/barrier-salida-b/command', {
      role: 'ADMIN',
      body: { action: 'OPEN', reason: 'Test persistencia' },
    });
    await POST(req, { params: Promise.resolve({ id: 'barrier-salida-b' }) });

    expect(freshPrisma.barrierLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          barrier_id: 'barrier-salida-b',
          action: 'OPEN',
        }),
      }),
    );
  });

  it('actualiza last_action y last_action_at', async () => {
    const { POST } = require('./[id]/command/route');
    prisma.barrierLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/barriers/barrier-entrada-a/command', {
      role: 'ADMIN',
      body: { action: 'CLOSE' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'barrier-entrada-a' }) });
    const body = await res.json();

    expect(body.data.last_action).toBe('CLOSE');
    expect(body.data.last_action_at).not.toBeNull();
  });

  it('retorna 404 para barrera inexistente', async () => {
    const { POST } = require('./[id]/command/route');

    const req = makeRequest('POST', '/api/parqueo/barriers/noexiste/command', {
      role: 'ADMIN',
      body: { action: 'OPEN' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});
