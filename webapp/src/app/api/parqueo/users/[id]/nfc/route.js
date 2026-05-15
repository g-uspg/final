import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { nfc_card_id } = await request.json();
    const existing = await prisma.user.findUnique({ where: { nfc_card_id } });
    if (existing && existing.id !== id) return res.conflict('NFC ya asignada a otro usuario');
    await prisma.user.update({ where: { id }, data: { nfc_card_id } });
    return res.ok(null, 'NFC asignada');
  } catch (e) {
    return res.error(e.message);
  }
}
