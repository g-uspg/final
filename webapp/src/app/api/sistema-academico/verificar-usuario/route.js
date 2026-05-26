import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "Se requiere el parámetro id" }, { status: 400 });

    const alumno = await prisma.alumno.findUnique({ where: { carnet: id }, select: { id: true, carnet: true, nombre: true, apellido: true, email: true } });
    if (alumno) return Response.json({ found: true, id: alumno.carnet, nombre: alumno.nombre, apellido: alumno.apellido, email: alumno.email, rol: "ALUMNO", activo: true });

    const catedratico = await prisma.catedraticoAcademico.findUnique({ where: { codigo: id }, select: { id: true, codigo: true, nombre: true, apellido: true, email: true } });
    if (catedratico) return Response.json({ found: true, id: catedratico.codigo, nombre: catedratico.nombre, apellido: catedratico.apellido, email: catedratico.email, rol: "CATEDRATICO", activo: true });

    return Response.json({ found: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
