import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request) {
  try {
    const { qr_code, space_id, operator_id } = await request.json();

    const user = await prisma.user.findFirst({
      where: { qr_code, deleted_at: null, is_active: true },
      include: { vehicles: { where: { deleted_at: null, is_authorized: true } } },
    });

    if (user) {
      return res.ok({ type: 'USER', valid: true, user: { id: user.id, name: `${user.first_name} ${user.last_name}`, role: user.role }, vehicles: user.vehicles });
    }

    const visitorQr = await prisma.visitorQR.findFirst({
      where: { qr_code, is_used: false, expires_at: { gt: new Date() } },
    });

    if (visitorQr) {
      await prisma.visitorQR.update({ where: { id: visitorQr.id }, data: { is_used: true, used_at: new Date() } });
      return res.ok({ type: 'VISITOR', valid: true, visitor: { name: visitorQr.visitor_name, plate: visitorQr.vehicle_plate, purpose: visitorQr.purpose } });
    }

    return res.unauthorized('QR inválido o expirado');
  } catch (e) {
    return res.error(e.message);
  }
}
