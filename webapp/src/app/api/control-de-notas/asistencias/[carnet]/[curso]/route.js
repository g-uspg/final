import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet, curso } = await params;

    if (!carnet || !curso) {
      return Response.json(
        { success: false, message: "Carnet y curso son requeridos" },
        { status: 400 }
      );
    }

    // 1. Buscar alumno
    const alumno = await prisma.alumno.findUnique({
      where: { carnet }
    });

    if (!alumno) {
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    // 2. Buscar curso por código
    const cursoData = await prisma.curso.findUnique({
      where: { codigo: curso.toUpperCase() },
      include: {
        horarios: true
      }
    });

    if (!cursoData) {
      return Response.json(
        { success: false, message: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // 3. Obtener asistencias del alumno para este curso
    const asistencias = await prisma.asistencia.findMany({
      where: {
        alumnoId: alumno.id,
        horario: {
          cursoId: cursoData.id
        }
      },
      include: {
        horario: {
          include: {
            catedratico: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // 4. Calcular resumen
    const total = asistencias.length;
    const presentes = asistencias.filter(a => a.presente).length;
    const ausentes = total - presentes;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

    // 5. Formatear registros
    const registros = asistencias.map(a => ({
      fecha: a.fecha.toISOString().split('T')[0],
      presente: a.presente,
      horario: {
        dia: a.horario.dia,
        horaInicio: a.horario.horaInicio,
        horaFin: a.horario.horaFin,
        salon: a.horario.salon,
        catedratico: `${a.horario.catedratico.nombre} ${a.horario.catedratico.apellido}`
      }
    }));

    return Response.json({
      success: true,
      alumno: {
        id: alumno.carnet,
        carnet: alumno.carnet,
        nombre: `${alumno.nombre} ${alumno.apellido}`
      },
      curso: {
        codigo: cursoData.codigo,
        nombre: cursoData.nombre,
        creditos: cursoData.creditos
      },
      asistencias: registros,
      resumen: {
        total,
        presentes,
        ausentes,
        porcentaje
      }
    });

  } catch (error) {
    console.error("[GET_ASISTENCIAS]", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo asistencias" },
      { status: 500 }
    );
  }
}
