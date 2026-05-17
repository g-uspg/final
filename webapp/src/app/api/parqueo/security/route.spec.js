const prisma = require('@/lib/prisma').default;
const { makeRequest, TEST_USERS } = require('../../../../../test/helpers/auth');
const { mockSession, mockVehicle } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /security/audit ───────────────────────────────────────────────────────
describe('GET /security/audit', () => {
  let GET_AUDIT;
  beforeAll(() => {
    GET_AUDIT = require('./audit/route').GET;
  });

  function mockAuditLog(action = 'LOGIN', overrides = {}) {
    return {
      id: `log-${Date.now()}`,
      action,
      resource: 'user',
      resource_id: 'u1',
      metadata: {},
      ip_address: '127.0.0.1',
      created_at: new Date(),
      user: { id: TEST_USERS.ADMIN.id, first_name: 'Admin', last_name: 'USPG', role: 'ADMIN' },
      ...overrides,
    };
  }

  it('retorna lista paginada de logs de auditoría', async () => {
    prisma.auditLog.count.mockResolvedValue(5);
    prisma.auditLog.findMany.mockResolvedValue([mockAuditLog('LOGIN'), mockAuditLog('LOGOUT')]);

    const req = makeRequest('GET', '/api/parqueo/security/audit', { role: 'ADMIN' });
    const res = await GET_AUDIT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 5);
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  it('mapea event_type y severity correctamente', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([mockAuditLog('ACCESS_DENIED')]);

    const req = makeRequest('GET', '/api/parqueo/security/audit', { role: 'ADMIN' });
    const res = await GET_AUDIT(req);
    const body = await res.json();

    const log = body.data.data[0];
    expect(log).toHaveProperty('event_type', 'ACCESS_DENIED');
    expect(log).toHaveProperty('severity', 'HIGH');
  });

  it('BLACKLIST_ATTEMPT tiene severity CRITICAL', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([mockAuditLog('BLACKLIST_ATTEMPT')]);

    const req = makeRequest('GET', '/api/parqueo/security/audit', { role: 'ADMIN' });
    const res = await GET_AUDIT(req);
    const body = await res.json();

    expect(body.data.data[0].severity).toBe('CRITICAL');
  });

  it('filtra por action', async () => {
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.auditLog.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/security/audit?action=LOGIN', { role: 'ADMIN' });
    await GET_AUDIT(req);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: expect.objectContaining({ contains: 'LOGIN' }) }) }),
    );
  });
});

// ── GET /security/blacklist ───────────────────────────────────────────────────
describe('GET /security/blacklist', () => {
  let GET_BLACKLIST;
  beforeAll(() => {
    GET_BLACKLIST = require('./blacklist/route').GET;
  });

  it('retorna entradas de blacklist paginadas', async () => {
    prisma.blacklist.count.mockResolvedValue(2);
    prisma.blacklist.findMany.mockResolvedValue([
      { id: 'bl-1', vehicle_id: 'v1', reason: 'Test', is_active: true, vehicle: mockVehicle(), added_by: null, removed_by: null, created_at: new Date() },
    ]);

    const req = makeRequest('GET', '/api/parqueo/security/blacklist', { role: 'ADMIN' });
    const res = await GET_BLACKLIST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 2);
    expect(body.data.data).toHaveLength(1);
  });

  it('filtra por is_active=true', async () => {
    prisma.blacklist.count.mockResolvedValue(0);
    prisma.blacklist.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/security/blacklist?is_active=true', { role: 'ADMIN' });
    await GET_BLACKLIST(req);

    expect(prisma.blacklist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: true }) }),
    );
  });
});

// ── GET /security/failed-attempts ─────────────────────────────────────────────
describe('GET /security/failed-attempts', () => {
  let GET_FAILED;
  beforeAll(() => {
    GET_FAILED = require('./failed-attempts/route').GET;
  });

  it('retorna lista combinada de intentos fallidos', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1', action: 'ACCESS_DENIED', metadata: { placa: 'P-001ABC' },
        created_at: new Date(), user: null,
      },
    ]);
    prisma.vehicle.findMany.mockResolvedValue([
      mockVehicle({ blacklisted: true, overrides: { placa: 'P-002BL', updated_at: new Date() } }),
    ]);

    const req = makeRequest('GET', '/api/parqueo/security/failed-attempts', { role: 'ADMIN' });
    const res = await GET_FAILED(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('cada entrada tiene timestamp, placa, reason, method, access_point', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'LOGIN_FAILED', metadata: {}, created_at: new Date(), user: null },
    ]);
    prisma.vehicle.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/security/failed-attempts', { role: 'ADMIN' });
    const res = await GET_FAILED(req);
    const body = await res.json();

    const entry = body.data[0];
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('reason');
    expect(entry).toHaveProperty('method');
    expect(entry).toHaveProperty('access_point');
  });
});

// ── GET /security/suspicious ──────────────────────────────────────────────────
describe('GET /security/suspicious', () => {
  let GET_SUSPICIOUS;
  beforeAll(() => {
    GET_SUSPICIOUS = require('./suspicious/route').GET;
  });

  it('retorna blacklisted_sessions, long_sessions, failed_entries', async () => {
    prisma.parkingSession.findMany
      .mockResolvedValueOnce([mockSession({ status: 'ACTIVE' })])  // blacklistedSessions
      .mockResolvedValueOnce([]);                                    // longSessions
    prisma.auditLog.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/security/suspicious', { role: 'ADMIN' });
    const res = await GET_SUSPICIOUS(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('blacklisted_sessions');
    expect(body.data).toHaveProperty('long_sessions');
    expect(body.data).toHaveProperty('failed_entries');
  });
});
