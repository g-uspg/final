import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const usuarios = await prisma.usuarioBiblioteca.findMany();
    return NextResponse.json(usuarios);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, email, carnet } = body;
    
    const usuario = await prisma.usuarioBiblioteca.create({
      data: { nombre, email, carnet },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
