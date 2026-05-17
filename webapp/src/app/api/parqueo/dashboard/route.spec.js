const prisma = require('@/lib/prisma').default;
const { GET } = require('./route');
const { makeRequest } = require('../../../../../test/helpers/auth');
const { mockSession, mockSpace } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /dashboard — Stats principales ────────────────────────────────────────
describe('GET /dashboard', () => {
  function mockDashboardCounts() {
    prisma.parkingSpace.count
      .mockResolvedValueOnce(500)  // total active spaces
      .mockResolvedValueOnce(250)  // available
      .mockResolvedValueOnce(230); // occupied
    prisma.parkingSession.count
      .mockResolvedValueOnce(230)  // active sessions
      .mockResolvedValueOnce(45);  // today entries
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 350 } });
    prisma.user.count.mockResolvedValue(1200);
    prisma.vehicle.count.mockResolvedValue(3);
  }

  it('retorna estructura completa de stats', async () => {
    mockDashboardCounts();

    const req = makeRequest('GET', '/api/parqueo/dashboard', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('spaces');
    expect(body.data).toHaveProperty('sessions');
    expect(body.data).toHaveProperty('revenue');
    expect(body.data).toHaveProperty('users');
    expect(body.data).toHaveProperty('alerts');
  });

  it('spaces incluye total, available, occupied y occupancy_rate', async () => {
    mockDashboardCounts();

    const req = makeRequest('GET', '/api/parqueo/dashboard', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.spaces).toHaveProperty('total', 500);
    expect(body.data.spaces).toHaveProperty('available', 250);
    expect(body.data.spaces).toHaveProperty('occupied', 230);
    expect(body.data.spaces).toHaveProperty('occupancy_rate');
    expect(typeof body.data.spaces.occupancy_rate).toBe('number');
  });

  it('revenue.today es 0 cuando no hay pagos completados', async () => {
    prisma.parkingSpace.count.mockResolvedValue(0);
    prisma.parkingSession.count.mockResolvedValue(0);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.user.count.mockResolvedValue(0);
    prisma.vehicle.count.mockResolvedValue(0);

    const req = makeRequest('GET', '/api/parqueo/dashboard', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.revenue.today).toBe(0);
  });
});

// ── GET /dashboard/activity ───────────────────────────────────────────────────
describe('GET /dashboard/activity', () => {
  let GET_ACTIVITY;
  beforeAll(() => {
    GET_ACTIVITY = require('./activity/route').GET;
  });

  it('retorna recent_sessions, recent_payments, recent_notifications', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([mockSession()]);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/dashboard/activity', { role: 'ADMIN' });
    const res = await GET_ACTIVITY(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('recent_sessions');
    expect(body.data).toHaveProperty('recent_payments');
    expect(body.data).toHaveProperty('recent_notifications');
  });
});

// ── GET /dashboard/alerts ─────────────────────────────────────────────────────
describe('GET /dashboard/alerts', () => {
  let GET_ALERTS;
  beforeAll(() => {
    GET_ALERTS = require('./alerts/route').GET;
  });

  it('retorna alert_count y alerts array', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([]);
    prisma.parkingSpace.count.mockResolvedValue(20);

    const req = makeRequest('GET', '/api/parqueo/dashboard/alerts', { role: 'ADMIN' });
    const res = await GET_ALERTS(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('alert_count');
    expect(Array.isArray(body.data.alerts)).toBe(true);
  });

  it('genera alerta BLACKLIST cuando hay sesiones con vehículo en lista negra', async () => {
    const blacklistedSession = mockSession({ status: 'ACTIVE' });
    prisma.parkingSession.findMany
      .mockResolvedValueOnce([blacklistedSession])  // blacklisted_active
      .mockResolvedValueOnce([]);                    // long_sessions
    prisma.parkingSpace.count.mockResolvedValue(50);

    const req = makeRequest('GET', '/api/parqueo/dashboard/alerts', { role: 'ADMIN' });
    const res = await GET_ALERTS(req);
    const body = await res.json();

    const blacklistAlert = body.data.alerts.find(a => a.type === 'BLACKLIST');
    expect(blacklistAlert).toBeDefined();
    expect(blacklistAlert.severity).toBe('CRITICAL');
  });

  it('genera alerta LONG_SESSION para sesiones de más de 8 horas', async () => {
    const oldSession = mockSession({ status: 'ACTIVE', overrides: { entry_time: new Date(Date.now() - 9 * 3600000) } });
    prisma.parkingSession.findMany
      .mockResolvedValueOnce([])            // blacklisted_active
      .mockResolvedValueOnce([oldSession]); // long_sessions
    prisma.parkingSpace.count.mockResolvedValue(50);

    const req = makeRequest('GET', '/api/parqueo/dashboard/alerts', { role: 'ADMIN' });
    const res = await GET_ALERTS(req);
    const body = await res.json();

    const longAlert = body.data.alerts.find(a => a.type === 'LONG_SESSION');
    expect(longAlert).toBeDefined();
  });

  it('genera alerta LOW_AVAILABILITY con menos de 10 espacios disponibles', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([]);
    prisma.parkingSpace.count.mockResolvedValue(3);

    const req = makeRequest('GET', '/api/parqueo/dashboard/alerts', { role: 'ADMIN' });
    const res = await GET_ALERTS(req);
    const body = await res.json();

    const lowAlert = body.data.alerts.find(a => a.type === 'LOW_AVAILABILITY');
    expect(lowAlert).toBeDefined();
    expect(lowAlert.severity).toBe('CRITICAL');
  });
});

// ── GET /dashboard/traffic ────────────────────────────────────────────────────
describe('GET /dashboard/traffic', () => {
  let GET_TRAFFIC;
  beforeAll(() => {
    GET_TRAFFIC = require('./traffic/route').GET;
  });

  it('retorna hourly_entries con exactamente 24 elementos', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/dashboard/traffic', { role: 'ADMIN' });
    const res = await GET_TRAFFIC(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('hourly_entries');
    expect(body.data.hourly_entries).toHaveLength(24);
  });

  it('cuenta sesiones por hora correctamente', async () => {
    const hour8session = { entry_time: new Date(new Date().setHours(8, 0, 0, 0)), exit_time: null };
    const hour8session2 = { entry_time: new Date(new Date().setHours(8, 30, 0, 0)), exit_time: null };
    const hour14session = { entry_time: new Date(new Date().setHours(14, 0, 0, 0)), exit_time: null };
    prisma.parkingSession.findMany.mockResolvedValue([hour8session, hour8session2, hour14session]);

    const req = makeRequest('GET', '/api/parqueo/dashboard/traffic', { role: 'ADMIN' });
    const res = await GET_TRAFFIC(req);
    const body = await res.json();

    expect(body.data.hourly_entries[8]).toBe(2);
    expect(body.data.hourly_entries[14]).toBe(1);
  });

  it('retorna date en formato YYYY-MM-DD', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/dashboard/traffic', { role: 'ADMIN' });
    const res = await GET_TRAFFIC(req);
    const body = await res.json();

    expect(body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
