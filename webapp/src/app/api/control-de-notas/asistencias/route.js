import prisma from "@/lib/prisma";
import {
  crearError,
  obtenerCatalogos,
  buscarAlumnoPorCarnet,
  buscarCursoPorParametro,
  obtenerIdAlumno,
  obtenerIdCurso,
} from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { carnet, curso, fecha, presente, origen } = body;
    const origin = request.nextUrl.origin;

    if (!carnet || !curso || !fecha) {
      return Response.json(
        { success: false, message: "Carnet, curso y fecha son requeridos" },
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
      orderBy: { periodo: "desc" },
    });

    if (!matricula) {
      throw crearError(`El alumno no está matriculado en el curso ${curso}`, 404);
    }

    // Registrar asistencia
    const asistencia = await prisma.asistencia.upsert({
      where: {
        id_matricula_fecha: {
          id_matricula: matricula.id_matricula,
          fecha: new Date(fecha),
        },
      },
      update: {
        presente: presente === true || presente === "true",
        origen: origen || "manual",
      },
      create: {
        id_matricula: matricula.id_matricula,
        fecha: new Date(fecha),
        presente: presente === true || presente === "true",
        origen: origen || "manual",
      },
    });

    return Response.json({
      success: true,
      message: "Asistencia registrada correctamente",
      asistencia,
    });
  } catch (error) {
    console.error("[POST_ASISTENCIA]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error registrando la asistencia",
        error: error.message,
      },
      { status: error.status || 500 }
    );
  }
}