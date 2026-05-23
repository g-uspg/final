import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const prestamos = await prisma.lib_Prestamo.findMany({
      include: {
        libro: true,
        usuario: true,
        multas: true,
      },
      orderBy: { fechaPrestamo: 'desc' }
    });
    return NextResponse.json(prestamos);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { libroId, usuarioId, fechaDevolucionEsc } = body;
    
    const prestamo = await prisma.lib_Prestamo.create({
      data: {
        libroId: parseInt(libroId),
        usuarioId: parseInt(usuarioId),
        fechaDevolucionEsc: new Date(fechaDevolucionEsc),
        estado: "PENDIENTE",
      },
    });
    return NextResponse.json(prestamo);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, fechaDevolucionReal, estado } = body;
    
    const prestamo = await prisma.lib_Prestamo.update({
      where: { id: parseInt(id) },
      data: {
        fechaDevolucionReal: fechaDevolucionReal ? new Date(fechaDevolucionReal) : undefined,
        estado: estado,
      },
    });
    return NextResponse.json(prestamo);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
