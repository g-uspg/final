import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;

    if (!carnet) {
      return Response.json(
        { success: false, message: "El carnet es requerido" },
        { status: 400 }
      );
    }

    console.log("🔍 [API Solvencia] Verificando solvencia para carnet:", carnet);

    // 1. Buscar alumno en grupo1_academico
    const alumno = await prisma.alumno.findUnique({
      where: { carnet },
      include: {
        carrera: true
      }
    });

    if (!alumno) {
      console.log("❌ [API Solvencia] Alumno no encontrado");
      return Response.json(
        { success: false, message: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ [API Solvencia] Alumno encontrado:", alumno.nombre, alumno.apellido);

    // 2. Obtener matrículas con notas del schema notas
    const matriculas = await prisma.matricula.findMany({
      where: {
        id_alumno: alumno.id
      },
      include: {
        cierre: true,
        notas: {
          include: {
            evaluacion: true
          }
        }
      }
    });

    console.log("📚 [API Solvencia] Matrículas a evaluar:", matriculas.length);

    // 3. Obtener cursos del grupo1 para nombres
    const cursosIds = [...new Set(matriculas.map(m => m.id_curso))];
    const cursos = await prisma.curso.findMany({
      where: {
        id: { in: cursosIds }
      }
    });

    const cursosMap = {};
    cursos.forEach(c => {
      cursosMap[c.id] = c;
    });

    // 4. Identificar cursos reprobados
    const cursosReprobados = [];

    matriculas.forEach(matricula => {
      const curso = cursosMap[matricula.id_curso];

      if (!curso) {
        console.warn(`⚠️ [API Solvencia] Curso ID ${matricula.id_curso} no encontrado`);
        return;
      }

      // Calcular nota final
      const sumaNotas = matricula.notas.reduce((sum, nota) => {
        return sum + parseFloat(nota.valor);
      }, 0);

      const notaFinal = matricula.cierre?.nota_final
        ? parseFloat(matricula.cierre.nota_final)
        : sumaNotas;

      // Si reprobó (nota < 61)
      if (notaFinal < 61) {
        cursosReprobados.push({
          curso: curso.codigo,
          nombreCurso: curso.nombre,
          notaFinal: Math.round(notaFinal),
          periodo: matricula.periodo
        });
      }
    });

    console.log("❌ [API Solvencia] Cursos reprobados:", cursosReprobados.length);

    const solvenciaNotas = {
      solvente: cursosReprobados.length === 0,
      totalReprobados: cursosReprobados.length,
      cursosReprobados
    };

    // 5. Solvencia de pagos (placeholder - integrar con sistema de pagos real)
    const solvenciaPagos = {
      solvente: true,
      montoPendiente: 0.00,
      mensualidadesPendientes: 0,
      enMora: false
    };

    const solvenciaGeneral = solvenciaNotas.solvente && solvenciaPagos.solvente;

    console.log("✅ [API Solvencia] Solvencia general:", solvenciaGeneral);

    return Response.json({
      success: true,
      solvenciaGeneral,
      solvenciaNotas,
      solvenciaPagos
    });

  } catch (error) {
    console.error("❌ [API Solvencia] Error:", error);
    return Response.json(
      { success: false, message: error.message || "Error obteniendo solvencia" },
      { status: 500 }
    );
  }
}
