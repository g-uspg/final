import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!user) return res.notFound('Usuario no encontrado');
    const updated = await prisma.user.update({ where: { id }, data: { is_active: !user.is_active } });
    return res.ok({ is_active: updated.is_active }, `Usuario ${updated.is_active ? 'activado' : 'desactivado'}`);
  } catch (e) {
    return res.error(e.message);
  }
}
