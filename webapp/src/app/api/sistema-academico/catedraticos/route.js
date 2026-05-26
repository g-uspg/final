import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const catedraticos = await prisma.catedraticoAcademico.findMany({ include: { horarios: { include: { curso: true } } }, orderBy: { createdAt: "desc" } });
    return Response.json({ success: true, data: catedraticos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { codigo, nombre, apellido, email } = await request.json();
    if (!codigo || !nombre || !apellido || !email) return Response.json({ success: false, error: "Todos los campos son requeridos" }, { status: 400 });
    const existeCodigo = await prisma.catedraticoAcademico.findUnique({ where: { codigo } });
    if (existeCodigo) return Response.json({ success: false, error: `El código ${codigo} ya está registrado` }, { status: 409 });
    const existeEmail = await prisma.catedraticoAcademico.findUnique({ where: { email } });
    if (existeEmail) return Response.json({ success: false, error: `El email ${email} ya está registrado` }, { status: 409 });
    const catedratico = await prisma.catedraticoAcademico.create({ data: { codigo, nombre, apellido, email } });
    return Response.json({ success: true, data: catedratico }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
