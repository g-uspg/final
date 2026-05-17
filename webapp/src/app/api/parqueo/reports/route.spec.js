const prisma = require('@/lib/prisma').default;
const { makeRequest } = require('../../../../../test/helpers/auth');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /reports/revenue ──────────────────────────────────────────────────────
describe('GET /reports/revenue', () => {
  let GET_REVENUE;
  beforeAll(() => {
    GET_REVENUE = require('./revenue/route').GET;
  });

  it('retorna estructura completa de ingresos', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([
      { amount_due: 10, is_paid: true, duration_minutes: 120, vehicle_id: 'v1', space_id: 's1', entry_time: new Date() },
      { amount_due: 5,  is_paid: false, duration_minutes: 60, vehicle_id: 'v2', space_id: 's2', entry_time: new Date() },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/revenue', { role: 'ADMIN' });
    const res = await GET_REVENUE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total_revenue');
    expect(body.data).toHaveProperty('total_entries');
    expect(body.data).toHaveProperty('unique_vehicles');
    expect(body.data).toHaveProperty('avg_per_session');
    expect(body.data).toHaveProperty('daily');
    expect(Array.isArray(body.data.daily)).toBe(true);
  });

  it('calcula total como suma de todos los amount_due', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([
      { amount_due: 10, is_paid: true, duration_minutes: 60, vehicle_id: 'v1', space_id: 's1', entry_time: new Date() },
      { amount_due: 15, is_paid: true, duration_minutes: 90, vehicle_id: 'v2', space_id: 's2', entry_time: new Date() },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/revenue', { role: 'ADMIN' });
    const res = await GET_REVENUE(req);
    const body = await res.json();

    expect(body.data.total_revenue).toBe(25);
    expect(body.data.total_entries).toBe(2);
  });

  it('calcula unique_vehicles correctamente', async () => {
    prisma.parkingSession.findMany.mockResolvedValue([
      { amount_due: 5, is_paid: true, duration_minutes: 30, vehicle_id: 'v1', space_id: 's1', entry_time: new Date() },
      { amount_due: 5, is_paid: true, duration_minutes: 30, vehicle_id: 'v1', space_id: 's2', entry_time: new Date() },
      { amount_due: 5, is_paid: true, duration_minutes: 30, vehicle_id: 'v2', space_id: 's3', entry_time: new Date() },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/revenue', { role: 'ADMIN' });
    const res = await GET_REVENUE(req);
    const body = await res.json();

    expect(body.data.unique_vehicles).toBe(2);
  });

  it('agrupa daily por fecha correctamente', async () => {
    const day1 = new Date('2026-05-10T10:00:00Z');
    const day2 = new Date('2026-05-11T10:00:00Z');
    prisma.parkingSession.findMany.mockResolvedValue([
      { amount_due: 5, is_paid: true, duration_minutes: 60, vehicle_id: 'v1', space_id: 's1', entry_time: day1 },
      { amount_due: 10, is_paid: true, duration_minutes: 60, vehicle_id: 'v2', space_id: 's2', entry_time: day2 },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/revenue', { role: 'ADMIN' });
    const res = await GET_REVENUE(req);
    const body = await res.json();

    expect(body.data.daily).toHaveLength(2);
    const d1 = body.data.daily.find(d => d.date === '2026-05-10');
    const d2 = body.data.daily.find(d => d.date === '2026-05-11');
    expect(d1).toBeDefined();
    expect(d2).toBeDefined();
    expect(d1.total).toBe(5);
    expect(d2.total).toBe(10);
  });
});

// ── GET /reports/occupancy ────────────────────────────────────────────────────
describe('GET /reports/occupancy', () => {
  let GET_OCCUPANCY;
  beforeAll(() => {
    GET_OCCUPANCY = require('./occupancy/route').GET;
  });

  it('retorna hourly con 24 elementos', async () => {
    prisma.parkingSpace.count.mockResolvedValue(500);
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/reports/occupancy', { role: 'ADMIN' });
    const res = await GET_OCCUPANCY(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('hourly');
    expect(body.data.hourly).toHaveLength(24);
  });

  it('retorna by_zone con zonas A, B, C, D', async () => {
    prisma.parkingSpace.count.mockResolvedValue(500);
    prisma.parkingSession.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/reports/occupancy', { role: 'ADMIN' });
    const res = await GET_OCCUPANCY(req);
    const body = await res.json();

    expect(body.data.by_zone).toHaveProperty('A');
    expect(body.data.by_zone).toHaveProperty('B');
    expect(body.data.by_zone).toHaveProperty('C');
    expect(body.data.by_zone).toHaveProperty('D');
    expect(body.data.by_zone.A).toHaveProperty('entries');
    expect(body.data.by_zone.A).toHaveProperty('avg_duration');
    expect(body.data.by_zone.A).toHaveProperty('avg_occupancy');
  });

  it('retorna avg_duration, max_duration, avg_rate, peak_rate', async () => {
    prisma.parkingSpace.count.mockResolvedValue(100);
    prisma.parkingSession.findMany.mockResolvedValue([
      { duration_minutes: 60, entry_time: new Date(), amount_due: 5, space: { zone: 'A' } },
      { duration_minutes: 120, entry_time: new Date(), amount_due: 10, space: { zone: 'B' } },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/occupancy', { role: 'ADMIN' });
    const res = await GET_OCCUPANCY(req);
    const body = await res.json();

    expect(body.data).toHaveProperty('avg_duration');
    expect(body.data).toHaveProperty('max_duration');
    expect(body.data).toHaveProperty('avg_rate');
    expect(body.data).toHaveProperty('peak_rate');
  });
});

// ── GET /reports/top-users ────────────────────────────────────────────────────
describe('GET /reports/top-users', () => {
  let GET_TOP_USERS;
  beforeAll(() => {
    GET_TOP_USERS = require('./top-users/route').GET;
  });

  it('retorna users con campos aplanados', async () => {
    prisma.parkingSession.groupBy.mockResolvedValue([
      { user_id: 'u1', _count: { id: 5 }, _sum: { amount_due: 25, duration_minutes: 300 } },
    ]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', first_name: 'Ana', last_name: 'García', carnet: '202301001', role: 'STUDENT' });
    prisma.parkingSession.findMany.mockResolvedValue([
      { space: { zone: 'A' } }, { space: { zone: 'A' } }, { space: { zone: 'B' } },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/top-users', { role: 'ADMIN' });
    const res = await GET_TOP_USERS(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('users');
    const user = body.data.users[0];
    expect(user).toHaveProperty('first_name');
    expect(user).toHaveProperty('last_name');
    expect(user).toHaveProperty('visits');
    expect(user).toHaveProperty('total_minutes');
    expect(user).toHaveProperty('total_spent');
    expect(user).toHaveProperty('favorite_zone');
  });

  it('calcula favorite_zone como la zona con más visitas', async () => {
    prisma.parkingSession.groupBy.mockResolvedValue([
      { user_id: 'u1', _count: { id: 3 }, _sum: { amount_due: 15, duration_minutes: 180 } },
    ]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', first_name: 'Bob', last_name: 'Smith', carnet: '202301002', role: 'STUDENT' });
    prisma.parkingSession.findMany.mockResolvedValue([
      { space: { zone: 'C' } }, { space: { zone: 'C' } }, { space: { zone: 'A' } },
    ]);

    const req = makeRequest('GET', '/api/parqueo/reports/top-users', { role: 'ADMIN' });
    const res = await GET_TOP_USERS(req);
    const body = await res.json();

    expect(body.data.users[0].favorite_zone).toBe('C');
  });
});

// ── GET /reports/prediction ───────────────────────────────────────────────────
describe('GET /reports/prediction', () => {
  let GET_PREDICTION;
  beforeAll(() => {
    GET_PREDICTION = require('./prediction/route').GET;
  });

  it('retorna campos requeridos', async () => {
    prisma.parkingSpace.count
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(200);
    prisma.parkingSpace.groupBy.mockResolvedValue([{ zone: 'A', _count: { id: 80 } }]);

    const req = makeRequest('GET', '/api/parqueo/reports/prediction', { role: 'ADMIN' });
    const res = await GET_PREDICTION(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('hour');
    expect(body.data).toHaveProperty('occupancy_pct');
    expect(body.data).toHaveProperty('expected_entries');
    expect(body.data).toHaveProperty('expected_exits');
    expect(body.data).toHaveProperty('busiest_zone');
    expect(body.data).toHaveProperty('confidence');
  });

  it('hour es la próxima hora (0-23)', async () => {
    prisma.parkingSpace.count.mockResolvedValue(0);
    prisma.parkingSpace.groupBy.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/reports/prediction', { role: 'ADMIN' });
    const res = await GET_PREDICTION(req);
    const body = await res.json();

    const expectedHour = (new Date().getHours() + 1) % 24;
    expect(body.data.hour).toBe(expectedHour);
  });
});
