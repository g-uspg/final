import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const vehicles = await prisma.vehicle.findMany({ where: { user_id: id, deleted_at: null } });
    return res.ok(vehicles);
  } catch (e) {
    return res.error(e.message);
  }
}
