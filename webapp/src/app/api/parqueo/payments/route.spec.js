const prisma = require('@/lib/prisma').default;
const { POST, GET } = require('./route');
const { makeRequest } = require('../../../../../test/helpers/auth');
const { mockSession, mockPayment } = require('../../../../../test/fixtures');


beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST /payments ────────────────────────────────────────────────────────────
describe('POST /payments — Crear pago', () => {
  it('crea pago en estado PENDING para sesión completada', async () => {
    const session = mockSession({ status: 'COMPLETED', overrides: { payment: null, is_paid: false, amount_due: 25 } });
    const payment = mockPayment({ status: 'PENDING', overrides: { session_id: session.id, amount: 25 } });

    prisma.parkingSession.findUnique.mockResolvedValue(session);
    prisma.payment.create.mockResolvedValue(payment);

    const req = makeRequest('POST', '/api/parqueo/payments', {
      role: 'SECURITY',
      body: { session_id: session.id, payment_method: 'CASH' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.status).toBe('PENDING');
  });

  it('usa el amount_due de la sesión', async () => {
    const session = mockSession({ status: 'COMPLETED', overrides: { payment: null, amount_due: 15 } });
    prisma.parkingSession.findUnique.mockResolvedValue(session);
    prisma.payment.create.mockResolvedValue(mockPayment({ overrides: { amount: 15 } }));

    const req = makeRequest('POST', '/api/parqueo/payments', {
      role: 'SECURITY',
      body: { session_id: session.id, payment_method: 'CASH' },
    });
    await POST(req);

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 15 }) }),
    );
  });

  it('retorna 404 si la sesión no existe', async () => {
    prisma.parkingSession.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/payments', {
      role: 'SECURITY',
      body: { session_id: 'noexiste', payment_method: 'CASH' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('retorna error si ya existe un pago para la sesión', async () => {
    const payment = mockPayment({ status: 'COMPLETED' });
    const session = mockSession({ status: 'COMPLETED', overrides: { payment } });
    prisma.parkingSession.findUnique.mockResolvedValue(session);

    const req = makeRequest('POST', '/api/parqueo/payments', {
      role: 'SECURITY',
      body: { session_id: session.id, payment_method: 'CASH' },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna error si la sesión aún está activa', async () => {
    const session = mockSession({ status: 'ACTIVE', overrides: { payment: null } });
    prisma.parkingSession.findUnique.mockResolvedValue(session);

    const req = makeRequest('POST', '/api/parqueo/payments', {
      role: 'SECURITY',
      body: { session_id: session.id, payment_method: 'CASH' },
    });
    const res = await POST(req);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ── GET /payments ─────────────────────────────────────────────────────────────
describe('GET /payments', () => {
  it('retorna lista paginada de pagos', async () => {
    prisma.payment.count.mockResolvedValue(3);
    prisma.payment.findMany.mockResolvedValue([mockPayment(), mockPayment(), mockPayment()]);

    const req = makeRequest('GET', '/api/parqueo/payments?page=1&limit=20', { role: 'ADMIN' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total', 3);
    expect(body.data.data).toHaveLength(3);
  });

  it('filtra por status', async () => {
    prisma.payment.count.mockResolvedValue(0);
    prisma.payment.findMany.mockResolvedValue([]);

    const req = makeRequest('GET', '/api/parqueo/payments?status=COMPLETED', { role: 'ADMIN' });
    await GET(req);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });
});

// ── POST /payments/[id]/confirm ───────────────────────────────────────────────
describe('POST /payments/[id]/confirm', () => {
  let POST_CONFIRM;
  beforeAll(() => {
    POST_CONFIRM = require('./[id]/confirm/route').POST;
  });

  it('confirma pago PENDING → COMPLETED y marca sesión is_paid', async () => {
    const payment = mockPayment({ status: 'PENDING' });
    const confirmed = { ...payment, status: 'COMPLETED', paid_at: new Date() };

    prisma.payment.findUnique.mockResolvedValue(payment);
    prisma.$transaction.mockImplementation(async (ops) => Promise.all(ops));
    prisma.payment.update.mockResolvedValue(confirmed);
    prisma.parkingSession.update.mockResolvedValue({});

    const req = makeRequest('POST', `/api/parqueo/payments/${payment.id}/confirm`, {
      role: 'ADMIN',
      body: { transaction_reference: 'TXN-001' },
    });
    const res = await POST_CONFIRM(req, { params: Promise.resolve({ id: payment.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.parkingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_paid: true }) }),
    );
  });

  it('retorna error si el pago no está en PENDING', async () => {
    const payment = mockPayment({ status: 'COMPLETED' });
    prisma.payment.findUnique.mockResolvedValue(payment);

    const req = makeRequest('POST', `/api/parqueo/payments/${payment.id}/confirm`, {
      role: 'ADMIN',
      body: {},
    });
    const res = await POST_CONFIRM(req, { params: Promise.resolve({ id: payment.id }) });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 404 si el pago no existe', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/payments/noexiste/confirm', { role: 'ADMIN', body: {} });
    const res = await POST_CONFIRM(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});

// ── POST /payments/[id]/refund ────────────────────────────────────────────────
describe('POST /payments/[id]/refund', () => {
  let POST_REFUND;
  beforeAll(() => {
    POST_REFUND = require('./[id]/refund/route').POST;
  });

  it('reembolsa pago COMPLETED → REFUNDED (solo ADMIN)', async () => {
    const payment = mockPayment({ status: 'COMPLETED' });
    const refunded = { ...payment, status: 'REFUNDED' };
    prisma.payment.findUnique.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue(refunded);

    const req = makeRequest('POST', `/api/parqueo/payments/${payment.id}/refund`, { role: 'ADMIN' });
    const res = await POST_REFUND(req, { params: Promise.resolve({ id: payment.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('REFUNDED');
  });

  it('retorna error si el pago no está COMPLETED', async () => {
    const payment = mockPayment({ status: 'PENDING' });
    prisma.payment.findUnique.mockResolvedValue(payment);

    const req = makeRequest('POST', `/api/parqueo/payments/${payment.id}/refund`, { role: 'ADMIN' });
    const res = await POST_REFUND(req, { params: Promise.resolve({ id: payment.id }) });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('retorna 404 si el pago no existe', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    const req = makeRequest('POST', '/api/parqueo/payments/noexiste/refund', { role: 'ADMIN' });
    const res = await POST_REFUND(req, { params: Promise.resolve({ id: 'noexiste' }) });

    expect(res.status).toBe(404);
  });
});
