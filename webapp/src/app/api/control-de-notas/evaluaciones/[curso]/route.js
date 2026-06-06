import prisma from "@/lib/prisma";
import {
  crearError,
  obtenerCatalogos,
  buscarCursoPorParametro,
  obtenerIdCurso,
  obtenerCodigoCurso,
} from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { curso } = await params;
    const origin = request.nextUrl.origin;

    if (!curso) {
      return Response.json({ success: false, message: "Curso es requerido" }, { status: 400 });
    }

    const { cursos } = await obtenerCatalogos(origin);
    const cursoEncontrado = buscarCursoPorParametro(cursos, curso);

    if (!cursoEncontrado) {
      throw crearError(`No se encontró curso ${curso}`, 404);
    }

    const idCurso = obtenerIdCurso(cursoEncontrado);
    if (!idCurso) {
      throw crearError("El curso no tiene un id válido", 400);
    }

    const evaluaciones = await prisma.evaluacion.findMany({
      where: { id_curso: idCurso },
      orderBy: { id_evaluacion: "asc" },
    });

    return Response.json({
      success: true,
      curso: {
        id: idCurso,
        codigo: obtenerCodigoCurso(cursoEncontrado, idCurso),
        nombre: cursoEncontrado.nombre,
      },
      evaluaciones,
    });
  } catch (error) {
    console.error("[GET_EVALUACIONES_CURSO]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error obteniendo las evaluaciones del curso",
        error: error.message,
      },
      { status: error.status || 500 }
    );
  }
}