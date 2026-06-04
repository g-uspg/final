import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const catedraticos = await prisma.catedraticoAcademico.findMany({
      orderBy: { createdAt: "desc" },
      include: { horarios: { include: { curso: true } } },
    });
    return Response.json({ success: true, data: catedraticos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { codigo, nombre, apellido, email } = body;

    if (!codigo || !nombre || !apellido || !email) {
      return Response.json(
        { success: false, error: "Todos los campos son requeridos: codigo, nombre, apellido, email" },
        { status: 400 }
      );
    }

    const existeCodigo = await prisma.catedraticoAcademico.findUnique({ where: { codigo } });
    if (existeCodigo) {
      return Response.json({ success: false, error: `El código ${codigo} ya está registrado` }, { status: 409 });
    }

    const existeEmail = await prisma.catedraticoAcademico.findUnique({ where: { email } });
    if (existeEmail) {
      return Response.json({ success: false, error: `El email ${email} ya está registrado` }, { status: 409 });
    }

    const catedratico = await prisma.catedraticoAcademico.create({
      data: { codigo, nombre, apellido, email },
    });
    return Response.json({ success: true, data: catedratico }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, codigo, nombre, apellido, email } = body;

    if (!id) {
      return Response.json({ success: false, error: "id es requerido" }, { status: 400 });
    }

    const catedratico = await prisma.catedraticoAcademico.findUnique({ where: { id: parseInt(id) } });
    if (!catedratico) {
      return Response.json({ success: false, error: "Catedrático no encontrado" }, { status: 404 });
    }

    const catedraticoActualizado = await prisma.catedraticoAcademico.update({
      where: { id: parseInt(id) },
      data: {
        ...(codigo && { codigo }),
        ...(nombre && { nombre }),
        ...(apellido && { apellido }),
        ...(email && { email }),
      },
    });

    return Response.json({ success: true, data: catedraticoActualizado });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ success: false, error: "id es requerido" }, { status: 400 });
    }

    await prisma.catedraticoAcademico.delete({
      where: { id: parseInt(id) },
    });

    return Response.json({ success: true, message: "Catedrático eliminado correctamente" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
