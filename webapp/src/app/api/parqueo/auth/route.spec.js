const prisma = require('@/lib/prisma').default;
const { POST, GET } = require('./route');
const { makeRequest, generateTestToken, generateRefreshToken, generateExpiredToken, TEST_USERS } = require('../../../../../test/helpers/auth');
const { mockUser } = require('../../../../../test/fixtures');
const bcrypt = require('bcryptjs');


const PASSWORD = 'password123';
const HASH     = bcrypt.hashSync(PASSWORD, 4); // rounds bajos para tests rápidos

function buildUser(overrides = {}) {
  return mockUser({ role: 'ADMIN', overrides: { password_hash: HASH, ...overrides } });
}

async function parseBody(response) {
  return response.json();
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST Login ────────────────────────────────────────────────────────────────
describe('POST /auth — Login', () => {
  it('should return 200 with access_token and refresh_token on valid credentials', async () => {
    const user = buildUser();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);
    prisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: PASSWORD } });
    const res = await POST(req);
    const body = await parseBody(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('access_token');
    expect(body.data).toHaveProperty('refresh_token');
    expect(body.data.user.email).toBe(user.email);
  });

  it('should update last_login_at on successful login', async () => {
    const user = buildUser();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);
    prisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: PASSWORD } });
    await POST(req);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ last_login_at: expect.any(Date) }) }),
    );
  });

  it('should create LOGIN entry in AuditLog', async () => {
    const user = buildUser();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);
    prisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: PASSWORD } });
    await POST(req);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOGIN' }) }),
    );
  });

  it('should return 401 when email does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: 'noexiste@uspg.edu.gt', password: PASSWORD } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 when password is incorrect', async () => {
    const user = buildUser();
    prisma.user.findUnique.mockResolvedValue(user);

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: 'wrongpassword' } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 when user is inactive (is_active=false)', async () => {
    const user = buildUser({ is_active: false });
    prisma.user.findUnique.mockResolvedValue(user);

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: PASSWORD } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 when user is soft-deleted (deleted_at set)', async () => {
    const user = buildUser({ deleted_at: new Date() });
    prisma.user.findUnique.mockResolvedValue(user);

    const req = makeRequest('POST', '/api/parqueo/auth', { body: { email: user.email, password: PASSWORD } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 400 when body is empty', async () => {
    const req = makeRequest('POST', '/api/parqueo/auth', { body: {} });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ── POST Refresh ──────────────────────────────────────────────────────────────
describe('POST /auth?action=refresh — Refresh token', () => {
  it('should return new access_token with valid refresh token', async () => {
    const user = buildUser();
    const refresh_token = generateRefreshToken('ADMIN');
    prisma.user.findUnique.mockResolvedValue({ ...user, id: TEST_USERS.ADMIN.id });

    const req = makeRequest('POST', '/api/parqueo/auth?action=refresh', { body: { refresh_token } });
    const res = await POST(req);
    const body = await parseBody(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('access_token');
  });

  it('should return 401 with expired refresh token', async () => {
    const expired = generateExpiredToken('ADMIN');
    const req = makeRequest('POST', '/api/parqueo/auth?action=refresh', { body: { refresh_token: expired } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 with malformed refresh token', async () => {
    const req = makeRequest('POST', '/api/parqueo/auth?action=refresh', { body: { refresh_token: 'bad.token.value' } });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ── POST Logout ───────────────────────────────────────────────────────────────
describe('POST /auth?action=logout — Logout', () => {
  it('should return 200 with valid token', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/auth?action=logout', { role: 'ADMIN' });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('should create LOGOUT entry in AuditLog', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest('POST', '/api/parqueo/auth?action=logout', { role: 'ADMIN' });
    await POST(req);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOGOUT' }) }),
    );
  });
});

// ── GET Me ────────────────────────────────────────────────────────────────────
describe('GET /auth — Me', () => {
  it('should return authenticated user profile with vehicles', async () => {
    const user = buildUser({ id: TEST_USERS.ADMIN.id });
    prisma.user.findUnique.mockResolvedValue({ ...user, vehicles: [] });

    const req = makeRequest('GET', '/api/parqueo/auth', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await parseBody(res);

    expect(res.status).toBe(200);
    expect(body.data.email).toBe(user.email);
    expect(body.data).not.toHaveProperty('password_hash');
  });

  it('should return 401 without token', async () => {
    const req = makeRequest('GET', '/api/parqueo/auth');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const req = new Request('http://localhost:3000/api/parqueo/auth', {
      method: 'GET',
      headers: { Authorization: 'Bearer bad.invalid.token' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
