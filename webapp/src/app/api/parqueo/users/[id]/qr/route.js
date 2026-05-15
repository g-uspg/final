import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const qr_code = `USP-QR-${uuid()}-${Date.now()}`;
    const qr_image = await QRCode.toDataURL(qr_code);
    await prisma.user.update({ where: { id }, data: { qr_code } });
    return res.ok({ qr_code, qr_image }, 'QR regenerado');
  } catch (e) {
    return res.error(e.message);
  }
}
