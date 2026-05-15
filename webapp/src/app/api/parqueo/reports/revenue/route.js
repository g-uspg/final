import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();

    const payments = await prisma.payment.findMany({
      where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' },
      select: { amount: true, payment_method: true, created_at: true },
    });

    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMethod = {};
    for (const p of payments) {
      byMethod[p.payment_method] = (byMethod[p.payment_method] ?? 0) + Number(p.amount);
    }

    return res.ok({ from: start, to: end, total_revenue: parseFloat(total.toFixed(2)), by_method: byMethod, transaction_count: payments.length });
  } catch (e) {
    return res.error(e.message);
  }
}
