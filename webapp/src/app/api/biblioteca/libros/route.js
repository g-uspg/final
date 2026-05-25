import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const libros = await prisma.libro.findMany({
      include: {
        categoria: true,
        autor: true,
      },
    });
    return NextResponse.json(libros);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { titulo, isbn, stock, categoriaId, autorId } = body;

    const libro = await prisma.libro.create({
      data: {
        titulo,
        isbn,
        stock: parseInt(stock),
        categoriaId: parseInt(categoriaId),
        autorId: parseInt(autorId),
        activo: true
      },
    });
    return NextResponse.json(libro);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, titulo, isbn, stock, categoriaId, autorId, activo } = body;

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const updateData = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (isbn !== undefined) updateData.isbn = isbn;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (activo !== undefined) updateData.activo = activo;
    if (categoriaId !== undefined) updateData.categoria = { connect: { id: parseInt(categoriaId) } };
    if (autorId !== undefined) updateData.autor = { connect: { id: parseInt(autorId) } };

    const libro = await prisma.libro.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json(libro);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


