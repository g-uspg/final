<<<<<<< HEAD
import prisma from "@/lib/prisma";
import {
  crearError,
  obtenerCatalogos,
  buscarAlumnoPorCarnet,
  buscarCursoPorParametro,
  obtenerIdAlumno,
  obtenerIdCurso,
=======
import {
  armarNotasAlumno,
  obtenerNombreAlumno,
  obtenerNombreCarrera,
>>>>>>> 6d184056691181342bd3d7ea4ec4fda0633c5733
} from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

<<<<<<< HEAD
export async function POST(request) {
  try {
    const body = await request.json();
    const { carnet, curso, id_evaluacion, valor, registrado_por } = body;
    const origin = request.nextUrl.origin;

    if (!carnet || !curso || !id_evaluacion || valor === undefined) {
      return Response.json(
        { success: false, message: "Carnet, curso, id_evaluacion y valor son requeridos" },
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

    // Verificar que la evaluación pertenece al curso
    const evaluacion = await prisma.evaluacion.findFirst({
      where: {
        id_evaluacion: parseInt(id_evaluacion),
        id_curso: idCurso,
      },
    });

    if (!evaluacion) {
      throw crearError(`La evaluación ${id_evaluacion} no pertenece al curso ${curso}`, 400);
    }

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

    // Validar valor
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum < 0 || valorNum > 100) {
      throw crearError("El valor de la nota debe estar entre 0 y 100", 400);
    }

    // Crear o actualizar nota
    const nota = await prisma.nota.upsert({
      where: {
        id_matricula_id_evaluacion: {
          id_matricula: matricula.id_matricula,
          id_evaluacion: parseInt(id_evaluacion),
        },
      },
      update: {
        valor: valorNum,
        registrado_por: registrado_por || "sistema",
        fecha_registro: new Date(),
      },
      create: {
        id_matricula: matricula.id_matricula,
        id_evaluacion: parseInt(id_evaluacion),
        valor: valorNum,
        registrado_por: registrado_por || "sistema",
      },
    });

    return Response.json({
      success: true,
      message: "Nota registrada correctamente",
      nota,
    });
  } catch (error) {
    console.error("[POST_NOTA]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error registrando la nota",
=======
export async function GET(request, { params }) {
  try {
    const { carnet } = await params;
    const origin = request.nextUrl.origin;

    if (!carnet) {
      return Response.json({ success: false, message: "El carnet es requerido" }, { status: 400 });
    }

    const { alumno, idAlumno, notas, resumen } = await armarNotasAlumno(origin, carnet);

    return Response.json({
      success: true,
      alumno: {
        id: idAlumno,
        carnet: alumno.carnet,
        nombre: obtenerNombreAlumno(alumno),
        email: alumno.email ?? null,
        correoInstitucional: alumno.correoInstitucional ?? null,
        carrera: obtenerNombreCarrera(alumno),
      },
      notas,
      resumen,
    });
  } catch (error) {
    console.error("[GET_NOTAS_ALUMNO]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error obteniendo las notas del alumno",
>>>>>>> 6d184056691181342bd3d7ea4ec4fda0633c5733
        error: error.message,
      },
      { status: error.status || 500 }
    );
  }
}