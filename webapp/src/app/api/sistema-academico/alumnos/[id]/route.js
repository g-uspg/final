import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) return Response.json({ success: false, error: "ID inválido" }, { status: 400 });
    const alumno = await prisma.alumno.findUnique({ where: { id } });
    if (!alumno) return Response.json({ success: false, error: "Alumno no encontrado" }, { status: 404 });
    await prisma.asistencia.deleteMany({ where: { alumnoId: id } });
    await prisma.asignacion.deleteMany({ where: { alumnoId: id } });
    await prisma.alumno.delete({ where: { id } });
    return Response.json({ success: true, message: `Alumno ${alumno.carnet} eliminado correctamente` });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
