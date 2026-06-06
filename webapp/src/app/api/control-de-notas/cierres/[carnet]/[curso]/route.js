import prisma from "@/lib/prisma";
import {
  crearError,
  obtenerCatalogos,
  buscarAlumnoPorCarnet,
  buscarCursoPorParametro,
  obtenerIdAlumno,
  obtenerIdCurso,
  NOTA_APROBACION,
} from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { carnet, curso } = await params;
    const origin = request.nextUrl.origin;

    if (!carnet || !curso) {
      return Response.json(
        { success: false, message: "Carnet y curso son requeridos" },
        { status: 400 }
      );
    }

    const { alumnos, cursos } = await obtenerCatalogos(origin);
    const alumno = buscarAlumnoPorCarnet(alumnos, carnet);
    if (!alumno) throw crearError(`No se encontró alumno con carnet ${carnet}`, 404);

    const cursoEncontrado = buscarCursoPorParametro(cursos, curso);
    if (!cursoEncontrado) throw crearError(`No se encontró curso ${curso}`, 404);

    const idAlumno = obtenerIdAlumno(alumno);
    const idCurso = obtenerIdCurso(cursoEncontrado);

    if (!idAlumno) throw crearError("El alumno no tiene un id válido", 400);
    if (!idCurso) throw crearError("El curso no tiene un id válido", 400);

    // Obtener matrícula
    const matricula = await prisma.matricula.findFirst({
      where: {
        id_alumno: idAlumno,
        id_curso: idCurso,
      },
      include: {
        notas: {
          include: { evaluacion: true },
        },
      },
      orderBy: { periodo: "desc" },
    });

    if (!matricula) {
      throw crearError(`El alumno no está matriculado en el curso ${curso}`, 404);
    }

    // Calcular nota final ponderada
    let sumaPonderada = 0;
    let sumaPorcentajes = 0;

    for (const nota of matricula.notas) {
      const porcentaje = nota.evaluacion.porcentaje;
      sumaPonderada += nota.valor * (porcentaje / 100);
      sumaPorcentajes += porcentaje;
    }

    const notaFinal = sumaPorcentajes > 0 ? Number((sumaPonderada).toFixed(2)) : null;

    // Crear o actualizar cierre
    const cierre = await prisma.cierre.upsert({
      where: { id_matricula: matricula.id_matricula },
      update: {
        nota_final: notaFinal,
        estado: "cerrado",
        fecha_cierre: new Date(),
      },
      create: {
        id_matricula: matricula.id_matricula,
        nota_final: notaFinal,
        estado: "cerrado",
        fecha_cierre: new Date(),
        solvencia_validada: false,
      },
    });

    const estadoFinal = notaFinal >= NOTA_APROBACION ? "aprobado" : "reprobado";

    return Response.json({
      success: true,
      message: "Nota final calculada y cerrada correctamente",
      cierre: {
        id: cierre.id_cierre,
        nota_final: cierre.nota_final,
        estado: cierre.estado,
        fecha_cierre: cierre.fecha_cierre,
      },
      resultado: {
        notaFinal,
        estado: estadoFinal,
        notaAprobacion: NOTA_APROBACION,
      },
    });
  } catch (error) {
    console.error("[POST_CIERRE]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error cerrando la nota del curso",
        error: error.message,
      },
      { status: error.status || 500 }
    );
  }
}