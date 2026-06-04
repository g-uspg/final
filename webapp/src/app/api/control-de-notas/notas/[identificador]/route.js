import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { identificador } = params;
    
    if (!identificador) {
      return Response.json(
        { success: false, message: "Identificador requerido" },
        { status: 400 }
      );
    }

    // Primero buscar el alumno en grupo1_academico
    const alumno = await prisma.alumno.findFirst({
      where: {
        OR: [
          { carnet: identificador },
          { id: parseInt(identificador) || -1 }
        ]
      },
      include: {
        carrera: true
      }
    });

    if (!alumno) {
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    // Obtener todas las matrículas del alumno desde el schema notas
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

    // Necesitamos obtener info de los cursos desde grupo1_academico
    const cursoIds = [...new Set(matriculas.map(m => m.id_curso))];
    const cursos = await prisma.curso.findMany({
      where: {
        id: {
          in: cursoIds
        }
      }
    });

    // Crear un mapa de cursos para acceso rápido
    const cursosMap = {};
    cursos.forEach(c => {
      cursosMap[c.id] = c;
    });

    // Procesar las notas
    const notasFormateadas = matriculas.map(matricula => {
      const curso = cursosMap[matricula.id_curso];
      
      // Calcular la nota final sumando todas las evaluaciones
      const sumaNotas = matricula.notas.reduce((sum, nota) => {
        return sum + parseFloat(nota.valor);
      }, 0);

      const notaFinal = matricula.cierre?.nota_final 
        ? parseFloat(matricula.cierre.nota_final)
        : sumaNotas;

      const zona = matricula.notas
        .filter(n => n.evaluacion.nombre.toLowerCase().includes('zona'))
        .reduce((sum, n) => sum + parseFloat(n.valor), 0);

      const examenFinal = matricula.notas
        .filter(n => n.evaluacion.nombre.toLowerCase().includes('final'))
        .reduce((sum, n) => sum + parseFloat(n.valor), 0);

      const estado = notaFinal >= 61 ? 'aprobado' : 'reprobado';

      return {
        curso: curso?.codigo || `CRS-${matricula.id_curso}`,
        nombreCurso: curso?.nombre || 'Curso sin nombre',
        periodo: matricula.periodo,
        zona: Math.round(zona),
        examenFinal: Math.round(examenFinal),
        notaFinal: Math.round(notaFinal),
        estado: estado,
        creditos: curso?.creditos || 0
      };
    });

    // Calcular resumen
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
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        carnet: alumno.carnet,
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
    console.error("Error obteniendo notas:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}