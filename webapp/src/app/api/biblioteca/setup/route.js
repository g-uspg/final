import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categorias = await prisma.lib_Categoria.findMany();
    const autores = await prisma.lib_Autor.findMany();
    return NextResponse.json({ categorias, autores });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, nombre } = body;
    
    let result;
    if (type === 'categoria') {
      result = await prisma.lib_Categoria.create({ data: { nombre } });
    } else if (type === 'autor') {
      result = await prisma.lib_Autor.create({ data: { nombre } });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
