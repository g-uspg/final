import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const multas = await prisma.multa.findMany({
      include: {
        prestamo: {
          include: {
            libro: true,
            usuario: true,
          }
        },
      },
      orderBy: { fechaMulta: 'desc' }
    });
    return NextResponse.json(multas);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, pagada } = body;
    
    const multa = await prisma.multa.update({
      where: { id: parseInt(id) },
      data: { pagada: pagada },
    });
    return NextResponse.json(multa);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
