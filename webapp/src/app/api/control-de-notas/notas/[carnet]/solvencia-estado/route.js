import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { carnet } = params;

    if (!carnet) {
      return Response.json(
        { success: false, message: "Carnet no proporcionado" },
        { status: 400 }
      );
    }

    // Buscar al alumno
    const alumno = await prisma.alumno.findUnique({
      where: { carnet },
      include: {
        asignaciones: {
          include: {
            curso: true,
          },
        },
        pagos: true, // Asumiendo que hay un modelo de pagos
      },
    });

    if (!alumno) {
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    // Verificar solvencia académica (no tener cursos reprobados o pendientes)
    const cursosReprobados = alumno.asignaciones.filter(a => {
      const nota = a.notaFinal;
      return nota !== null && nota < 61;
    }).length;

    const cursosPendientes = alumno.asignaciones.filter(a => a.notaFinal === null).length;

    // Verificar solvencia financiera (pagos al día)
    const pagosVencidos = alumno.pagos?.filter(pago => 
      pago.estado === "PENDIENTE" && new Date(pago.fechaLimite) < new Date()
    ).length || 0;

    const solvenciaAcademica = cursosReprobados === 0 && cursosPendientes === 0;
    const solvenciaFinanciera = pagosVencidos === 0;
    const solvenciaGeneral = solvenciaAcademica && solvenciaFinanciera;

    // Detalles de solvencia
    const detalles = {
      academica: {
        solvente: solvenciaAcademica,
        cursosReprobados,
        cursosPendientes,
      },
      financiera: {
        solvente: solvenciaFinanciera,
        pagosVencidos,
      },
    };

    return Response.json({
      success: true,
      data: {
        carnet: alumno.carnet,
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        solvenciaGeneral,
        detalles,
        fechaConsulta: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error en API solvencia:", error);
    return Response.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
