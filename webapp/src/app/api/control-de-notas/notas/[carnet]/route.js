import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;

    if (!carnet) {
      return Response.json(
        { success: false, message: "El carnet es requerido" },
        { status: 400 }
      );
    }

    console.log("🔍 [API Notas] Buscando alumno con carnet:", carnet);

    // 1. Buscar alumno en grupo1_academico
    const alumno = await prisma.alumno.findUnique({
      where: { carnet },
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
      console.log("❌ [API Notas] Alumno no encontrado");
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ [API Notas] Alumno encontrado:", alumno.nombre, alumno.apellido);

    // 2. Obtener matrículas del schema notas usando el ID del alumno
    const matriculas = await prisma.matricula.findMany({
      where: {
        id_alumno: alumno.id
      },
      include: {
        notas: {
          include: {
            evaluacion: true
          }
        },
        cierre: true
      },
      orderBy: {
        periodo: 'desc'
      }
    });

    console.log("📚 [API Notas] Matrículas encontradas:", matriculas.length);

    // 3. Crear un mapa de cursos del grupo1 para enriquecer los datos
    const cursosDelAlumno = {};
    alumno.asignaciones.forEach(asig => {
      cursosDelAlumno[asig.curso.id] = asig.curso;
    });

    // 4. Procesar las notas
    const notasFormateadas = [];
    
    for (const matricula of matriculas) {
      const curso = cursosDelAlumno[matricula.id_curso];

      if (!curso) {
        // Si no está en asignaciones, buscar el curso directamente
        const cursoDirecto = await prisma.curso.findUnique({
          where: { id: matricula.id_curso }
        });
        
        if (cursoDirecto) {
          cursosDelAlumno[matricula.id_curso] = cursoDirecto;
        } else {
          console.warn(`⚠️ [API Notas] Curso ID ${matricula.id_curso} no encontrado`);
          continue;
        }
      }

      const cursoData = cursosDelAlumno[matricula.id_curso];

      // Calcular zona y examen final
      let zona = 0;
      let examenFinal = 0;

      matricula.notas.forEach(nota => {
        const nombreEval = nota.evaluacion.nombre.toLowerCase();
        const valor = parseFloat(nota.valor);

        if (nombreEval.includes('zona')) {
          zona += valor;
        } else if (nombreEval.includes('final') || nombreEval.includes('examen')) {
          examenFinal += valor;
        }
      });

      // Nota final desde cierre o suma de evaluaciones
      const notaFinal = matricula.cierre?.nota_final
        ? parseFloat(matricula.cierre.nota_final)
        : zona + examenFinal;

      const estado = notaFinal >= 61 ? 'aprobado' : 'reprobado';

      notasFormateadas.push({
        curso: cursoData.codigo,
        nombreCurso: cursoData.nombre,
        periodo: matricula.periodo,
        zona: Math.round(zona),
        examenFinal: Math.round(examenFinal),
        notaFinal: Math.round(notaFinal),
        estado: estado,
        creditos: cursoData.creditos
      });
    }

    console.log("✅ [API Notas] Notas procesadas:", notasFormateadas.length);

    // 5. Calcular resumen
    const cursosAprobados = notasFormateadas.filter(n => n.estado === 'aprobado').length;
    const cursosReprobados = notasFormateadas.filter(n => n.estado === 'reprobado').length;
    const creditosAprobados = notasFormateadas
      .filter(n => n.estado === 'aprobado')
      .reduce((sum, n) => sum + n.creditos, 0);

    const sumaNotasFinales = notasFormateadas.reduce((sum, n) => sum + n.notaFinal, 0);
    const promedioGeneral = notasFormateadas.length > 0
      ? Math.round((sumaNotasFinales / notasFormateadas.length) * 10) / 10
      : 0;

    return Response.json({
      success: true,
      alumno: {
        carnet: alumno.carnet,
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        email: alumno.email,
        carrera: alumno.carrera?.nombre || "Sin asignar"
      },
      notas: notasFormateadas,
      resumen: {
        promedioGeneral,
        totalCursos: notasFormateadas.length,
        cursosAprobados,
        cursosReprobados,
        creditosAprobados
      }
    });

  } catch (error) {
    console.error("❌ [API Notas] Error:", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo las notas" },
      { status: 500 }
    );
  }
}
