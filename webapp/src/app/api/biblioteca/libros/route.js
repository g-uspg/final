import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const libros = await prisma.lib_Libro.findMany({
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
    
    const libro = await prisma.lib_Libro.create({
      data: {
        titulo,
        isbn,
        stock: parseInt(stock),
        categoriaId: parseInt(categoriaId),
        autorId: parseInt(autorId),
      },
    });
    return NextResponse.json(libro);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
