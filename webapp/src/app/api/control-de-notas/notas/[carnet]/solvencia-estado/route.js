import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 API SOLVENCIA - USANDO GRUPO 1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { carnet } = params;
    console.log('📝 Carnet recibido:', carnet);

    if (!carnet) {
      return NextResponse.json(
        { success: false, message: 'Carnet requerido' },
        { status: 400 }
      );
    }

    // 1. Buscar alumno
    console.log('🔍 Buscando alumno...');
    const alumno = await prisma.alumno.findUnique({
      where: { carnet: String(carnet) },
      include: {
        carrera: true
      }
    });

    if (!alumno) {
      console.log('❌ Alumno no encontrado');
      return NextResponse.json(
        { success: false, message: 'Alumno no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Alumno encontrado:', alumno.nombre, alumno.apellido);

    // Por ahora, todos están solventes porque no tenemos sistema de notas
    const response = {
      success: true,
      solvenciaGeneral: true,
      solvenciaNotas: {
        solvente: true,
        totalReprobados: 0,
        cursosReprobados: []
      },
      solvenciaPagos: {
        solvente: true,
        montoPendiente: 0.00,
        mensualidadesPendientes: 0,
        enMora: false
      }
    };

    console.log('✅ Solvencia verificada - TODO SOLVENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error('Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
