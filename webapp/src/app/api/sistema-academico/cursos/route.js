import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cursos = await prisma.curso.findMany({ include: { horarios: { include: { catedratico: true } } }, orderBy: { nombre: "asc" } });
    return Response.json({ success: true, data: cursos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { codigo, nombre, creditos } = await request.json();
    if (!codigo || !nombre || !creditos) return Response.json({ success: false, error: "codigo, nombre y creditos son requeridos" }, { status: 400 });
    const existe = await prisma.curso.findUnique({ where: { codigo } });
    if (existe) return Response.json({ success: false, error: `El curso ${codigo} ya existe` }, { status: 409 });
    const curso = await prisma.curso.create({ data: { codigo, nombre, creditos: parseInt(creditos) } });
    return Response.json({ success: true, data: curso }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
