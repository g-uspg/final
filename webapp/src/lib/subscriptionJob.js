import prisma from '@/lib/prisma';

// Marca suscripciones vencidas como EXPIRED, bloquea NFC y notifica al usuario.
export async function expireSubscriptions() {
  const now = new Date();

  const expired = await prisma.parkingSubscription.findMany({
    where: { status: 'ACTIVE', end_date: { lt: now } },
    select: { id: true, user_id: true, auto_renew: true, type: true, amount_paid: true },
  });

  if (expired.length === 0) return { expired: 0, renewed: 0 };

  const toExpire = [];
  const toRenew  = [];

  for (const sub of expired) {
    if (sub.auto_renew) toRenew.push(sub);
    else toExpire.push(sub);
  }

  // ── Auto-renovar ─────────────────────────────────────────────────────────
  let renewed = 0;
  for (const sub of toRenew) {
    const days = sub.type === 'SEMESTER' ? 180 : 30;
    const start = new Date();
    const end_date = new Date(start.getTime() + days * 86400000);
    await prisma.$transaction([
      prisma.parkingSubscription.update({
        where: { id: sub.id },
        data: { start_date: start, end_date, updated_at: new Date() },
      }),
      prisma.notification.create({
        data: {
          user_id: sub.user_id,
          type: 'INFO',
          title: 'Suscripción renovada automáticamente',
          message: `Tu suscripción de parqueo fue renovada por ${sub.type === 'SEMESTER' ? '6 meses' : '30 días'}.`,
        },
      }),
    ]);
    renewed++;
  }

  // ── Expirar y bloquear NFC ────────────────────────────────────────────────
  if (toExpire.length > 0) {
    const userIds = toExpire.map(s => s.user_id);
    await prisma.$transaction([
      prisma.parkingSubscription.updateMany({
        where: { id: { in: toExpire.map(s => s.id) } },
        data: { status: 'EXPIRED' },
      }),
      // Bloquear tarjeta NFC: desactivar acceso sin borrar el ID de la tarjeta
      prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { is_active: false },
      }),
      ...toExpire.map(s =>
        prisma.notification.create({
          data: {
            user_id: s.user_id,
            type: 'PAYMENT_REQUIRED',
            title: 'Suscripción vencida — acceso bloqueado',
            message: 'Tu suscripción de parqueo venció y tu acceso fue bloqueado automáticamente. Renuévala en línea para reactivarte.',
          },
        })
      ),
      ...toExpire.map(s =>
        prisma.auditLog.create({
          data: {
            user_id: s.user_id,
            action: 'SUBSCRIPTION_EXPIRED_AUTO_BLOCK',
            resource: 'parking_subscription',
            resource_id: s.id,
            metadata: { reason: 'end_date_passed', auto_renew: false },
          },
        })
      ),
    ]);
  }

  return { expired: toExpire.length, renewed };
}

// Envía alerta a usuarios cuya suscripción vence en los próximos `days` días.
export async function notifyExpiringSoon(days = 3) {
  const now = new Date();
  const limit = new Date(now.getTime() + days * 86400000);

  const expiring = await prisma.parkingSubscription.findMany({
    where: { status: 'ACTIVE', end_date: { gt: now, lte: limit } },
    select: { id: true, user_id: true, end_date: true, type: true },
  });

  if (expiring.length === 0) return { notified: 0 };

  await prisma.$transaction(
    expiring.map(s => {
      const daysLeft = Math.ceil((s.end_date - now) / 86400000);
      return prisma.notification.create({
        data: {
          user_id: s.user_id,
          type: 'RESERVATION_EXPIRING',
          title: `Tu suscripción vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
          message: `Tu suscripción ${s.type === 'SEMESTER' ? 'semestral' : 'mensual'} de parqueo vence el ${s.end_date.toLocaleDateString('es-GT')}. Renuévala para no perder el acceso.`,
          metadata: { subscription_id: s.id, end_date: s.end_date.toISOString(), days_remaining: daysLeft },
        },
      });
    })
  );

  return { notified: expiring.length };
}

// Reactiva el usuario cuando paga una nueva suscripción.
export async function reactivateUser(user_id) {
  await prisma.user.update({
    where: { id: user_id },
    data: { is_active: true },
  });
}
