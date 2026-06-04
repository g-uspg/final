import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const cursos = await prisma.curso.findMany({
      orderBy: { nombre: "asc" },
      include: { horarios: { include: { catedratico: true } } },
    });
    return Response.json({ success: true, data: cursos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { codigo, nombre, creditos } = body;

    if (!codigo || !nombre || !creditos) {
      return Response.json(
        { success: false, error: "Todos los campos son requeridos: codigo, nombre, creditos" },
        { status: 400 }
      );
    }

    if (creditos < 1 || creditos > 10) {
      return Response.json({ success: false, error: "Los créditos deben estar entre 1 y 10" }, { status: 400 });
    }

    const existeCodigo = await prisma.curso.findUnique({ where: { codigo } });
    if (existeCodigo) {
      return Response.json({ success: false, error: `El curso con código ${codigo} ya existe` }, { status: 409 });
    }

    const curso = await prisma.curso.create({
      data: { codigo, nombre, creditos: parseInt(creditos) },
    });
    return Response.json({ success: true, data: curso }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, codigo, nombre, creditos } = body;

    if (!id) {
      return Response.json({ success: false, error: "id es requerido" }, { status: 400 });
    }

    const curso = await prisma.curso.findUnique({ where: { id: parseInt(id) } });
    if (!curso) {
      return Response.json({ success: false, error: "Curso no encontrado" }, { status: 404 });
    }

    if (creditos && (creditos < 1 || creditos > 10)) {
      return Response.json({ success: false, error: "Los créditos deben estar entre 1 y 10" }, { status: 400 });
    }

    const cursoActualizado = await prisma.curso.update({
      where: { id: parseInt(id) },
      data: {
        ...(codigo && { codigo }),
        ...(nombre && { nombre }),
        ...(creditos && { creditos: parseInt(creditos) }),
      },
    });

    return Response.json({ success: true, data: cursoActualizado });
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

    await prisma.curso.delete({
      where: { id: parseInt(id) },
    });

    return Response.json({ success: true, message: "Curso eliminado correctamente" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
