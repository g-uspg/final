import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 API NOTAS - USANDO GRUPO 1');
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

    // 1. Buscar alumno en grupo1_academico
    console.log('🔍 Buscando alumno en grupo1_academico...');
    const alumno = await prisma.alumno.findUnique({
      where: { carnet: String(carnet) },
      include: {
        carrera: true,
        asignaciones: {
          include: {
            curso: true
          }
        }
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
    console.log('📚 Asignaciones (cursos):', alumno.asignaciones.length);

    // 2. Convertir asignaciones a formato de notas
    // Por ahora sin calificaciones, solo mostramos los cursos asignados
    const notasFormateadas = alumno.asignaciones.map(asignacion => ({
      curso: asignacion.curso.codigo,
      nombreCurso: asignacion.curso.nombre,
      periodo: asignacion.ciclo || '2024-01',
      zona: 0,
      examenFinal: 0,
      notaFinal: 0,
      estado: 'pendiente',
      creditos: asignacion.curso.creditos
    }));

    console.log('✅ Cursos procesados:', notasFormateadas.length);

    // 3. Calcular resumen (todo en 0 por ahora)
    const resumen = {
      promedioGeneral: 0,
      totalCursos: notasFormateadas.length,
      cursosAprobados: 0,
      cursosReprobados: 0,
      creditosAprobados: 0
    };

    const response = {
      success: true,
      alumno: {
        carnet: alumno.carnet,
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        email: alumno.email,
        carrera: alumno.carrera?.nombre || 'Sin asignar'
      },
      notas: notasFormateadas,
      resumen: resumen
    };

    console.log('✅ Respuesta enviada');
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
