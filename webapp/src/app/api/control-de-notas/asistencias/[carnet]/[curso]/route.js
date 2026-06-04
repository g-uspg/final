import { obtenerAsistenciasLocal } from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet, curso } = await params;

    if (!carnet || !curso) {
      return Response.json({ success: false, message: "Carnet y curso son requeridos" }, { status: 400 });
    }

    const data = obtenerAsistenciasLocal(carnet, curso);

    if (!data) {
      return Response.json({
        success: true,
        message: "No hay registros de asistencia para este curso",
        alumno: { carnet },
        curso: { codigo: curso },
        asistencias: [],
        resumen: { total: 0, presentes: 0, ausentes: 0, porcentaje: 0 }
      });
    }

    return Response.json({
      success: true,
      alumno: {
        id: data.alumno.carnet,
        carnet: data.alumno.carnet,
        nombre: `${data.alumno.nombre} ${data.alumno.apellido}`
      },
      curso: {
        codigo: data.curso.curso,
        nombre: data.curso.nombreCurso,
        periodo: data.curso.periodo
      },
      asistencias: data.curso.registros || [],
      resumen: data.resumen
    });
  } catch (error) {
    console.error("[GET_ASISTENCIAS_ALUMNO]", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo asistencias" },
      { status: 500 }
    );
  }
}