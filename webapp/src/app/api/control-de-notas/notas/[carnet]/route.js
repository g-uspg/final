import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { carnet } = params;

    if (!carnet) {
      return Response.json(
        { success: false, message: "Carnet no proporcionado" },
        { status: 400 }
      );
    }

    // Buscar al alumno por su carnet
    const alumno = await prisma.alumno.findUnique({
      where: { carnet },
      include: {
        carrera: true,
        asignaciones: {
          include: {
            curso: true,
          },
        },
      },
    });

    if (!alumno) {
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    // Procesar las notas de cada asignación
    const notas = alumno.asignaciones.map(asignacion => {
      const nota = asignacion.notaFinal;
      let estado = "pendiente";
      
      if (nota !== null) {
        // Asumiendo que la nota mínima para aprobar es 61 o 70 según la universidad
        estado = nota >= 61 ? "aprobado" : "reprobado";
      }

      return {
        id: asignacion.id,
        curso: asignacion.curso.codigo,
        nombreCurso: asignacion.curso.nombre,
        creditos: asignacion.curso.creditos,
        periodo: asignacion.periodo,
        nota: nota,
        estado: estado,
        calificaciones: {
          zona: asignacion.zona || null,
          examen: asignacion.examen || null,
          final: nota,
        },
      };
    });

    // Calcular resumen académico
    const totalCursos = notas.length;
    const cursosAprobados = notas.filter(n => n.estado === "aprobado").length;
    const cursosReprobados = notas.filter(n => n.estado === "reprobado").length;
    const cursosPendientes = notas.filter(n => n.estado === "pendiente").length;
    
    const creditosAprobados = notas
      .filter(n => n.estado === "aprobado")
      .reduce((sum, n) => sum + n.creditos, 0);
    
    const promedio = notas
      .filter(n => n.nota !== null)
      .reduce((sum, n) => sum + n.nota, 0) / (notas.filter(n => n.nota !== null).length || 1);

    const resumen = {
      totalCursos,
      cursosAprobados,
      cursosReprobados,
      cursosPendientes,
      creditosAprobados,
      promedio: promedio.toFixed(2),
    };

    return Response.json({
      success: true,
      data: {
        alumno: {
          carnet: alumno.carnet,
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          carrera: alumno.carrera?.nombre || "Sin asignar",
          email: alumno.email,
          correoInstitucional: alumno.correoInstitucional,
        },
        notas,
        resumen,
      },
    });
  } catch (error) {
    console.error("Error en API notas:", error);
    return Response.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
