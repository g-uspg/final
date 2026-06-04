import { obtenerSolvenciaLocal } from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;

    if (!carnet) {
      return Response.json({ success: false, message: "El carnet es requerido" }, { status: 400 });
    }

    const data = obtenerSolvenciaLocal(carnet);

    return Response.json({
      success: true,
      alumno: {
        carnet: data.alumno.carnet,
        nombre: `${data.alumno.nombre} ${data.alumno.apellido}`,
        carrera: data.alumno.carrera,
      },
      solvenciaGeneral: data.solvenciaGeneral,
      solvenciaNotas: data.solvenciaNotas,
      solvenciaPagos: data.solvenciaPagos,
    });
  } catch (error) {
    console.error("[GET_SOLVENCIA_ALUMNO]", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo la solvencia" },
      { status: 500 }
    );
  }
}
