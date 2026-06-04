import { armarNotasAlumnoLocal, obtenerNombreAlumno, obtenerNombreCarrera } from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;

    if (!carnet) {
      return Response.json({ success: false, message: "El carnet es requerido" }, { status: 400 });
    }

    const data = armarNotasAlumnoLocal(carnet);

    return Response.json({
      success: true,
      alumno: {
        carnet: data.alumno.carnet,
        nombre: data.alumno.nombreCompleto,
        email: data.alumno.email,
        carrera: obtenerNombreCarrera(data.alumno),
      },
      notas: data.notas,
      resumen: data.resumen,
    });
  } catch (error) {
    console.error("[GET_NOTAS_ALUMNO]", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo las notas" },
      { status: 500 }
    );
  }
}