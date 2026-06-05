import {
  armarNotasAlumno,
  obtenerNombreAlumno,
  obtenerNombreCarrera,
  obtenerSolvenciaPagos,
} from "@/app/api/control-de-notas/_lib/academico";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;
    const origin = request.nextUrl.origin;

    if (!carnet) {
      return Response.json({ success: false, message: "El carnet es requerido" }, { status: 400 });
    }

    const { alumno, idAlumno, notas } = await armarNotasAlumno(origin, carnet);

    const cursosReprobados = notas.filter((n) => n.estado === "reprobado");
    const solvenciaNotas = {
      solvente: cursosReprobados.length === 0,
      totalReprobados: cursosReprobados.length,
      cursosReprobados,
    };

    const solvenciaPagos = await obtenerSolvenciaPagos(origin, carnet);
    const solvenciaGeneral = solvenciaNotas.solvente && solvenciaPagos.solvente;

    return Response.json({
      success: true,
      alumno: {
        id: idAlumno,
        carnet: alumno.carnet,
        nombre: obtenerNombreAlumno(alumno),
        carrera: obtenerNombreCarrera(alumno),
      },
      solvenciaGeneral,
      solvenciaNotas,
      solvenciaPagos,
    });
  } catch (error) {
    console.error("[GET_SOLVENCIA_ALUMNO]", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Error obteniendo la solvencia del alumno",
        error: error.message,
      },
      { status: error.status || 500 }
    );
  }
}