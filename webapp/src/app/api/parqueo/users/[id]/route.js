import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import bcrypt from 'bcryptjs';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!user) return res.notFound('Usuario no encontrado');
    const { password_hash: _, ...data } = user;
    return res.ok(data);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const dto = await request.json();
    const { password, ...rest } = dto;
    const data = { ...rest };
    if (password) data.password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({ where: { id }, data });
    const { password_hash: _, ...result } = user;
    return res.ok(result, 'Usuario actualizado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.user.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
    return res.ok(null, 'Usuario eliminado');
  } catch (e) {
    return res.error(e.message);
  }
}
