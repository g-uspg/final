import mockData from "@/app/mocks/control-de-notas-mocks/mockData";

export const NOTA_APROBACION = 61;

// Helper para buscar alumno en mocks
export function buscarAlumnoEnMocks(identificador) {
  // Buscar por carnet o id
  const alumno = mockData.alumnos.find(a => 
    a.carnet === identificador || 
    a.id === identificador
  );
  
  if (!alumno) {
    throw new Error(`Alumno con identificador ${identificador} no encontrado`);
  }
  
  return alumno;
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function parseMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export function obtenerNombreAlumno(alumno) {
  return `${alumno?.nombre ?? ""} ${alumno?.apellido ?? ""}`.trim() || "Alumno";
}

export function obtenerNombreCarrera(alumno) {
  return alumno?.carrera ?? null;
}

export function buscarCursoPorCodigo(cursos, codigoCurso) {
  return cursos.find((c) => c.curso === codigoCurso || c.id === codigoCurso);
}

// 🔧 ARMAR NOTAS: Usa mocks locales
export function armarNotasAlumnoLocal(carnet) {
  const alumno = buscarAlumnoEnMocks(carnet);
  const notas = mockData.notas[carnet] || [];
  
  // Calcular resumen
  const aprobados = notas.filter(n => n.estado === "aprobado");
  const reprobados = notas.filter(n => n.estado === "reprobado");
  
  const promedioGeneral = notas.length > 0 
    ? Number((notas.reduce((a, n) => a + n.notaFinal, 0) / notas.length).toFixed(2))
    : 0;

  const creditosAprobados = aprobados.reduce((a, n) => a + (n.creditos || 0), 0);

  return {
    alumno: {
      ...alumno,
      nombreCompleto: obtenerNombreAlumno(alumno)
    },
    carnet: alumno.carnet,
    notas,
    resumen: {
      promedioGeneral,
      totalCursos: notas.length,
      cursosAprobados: aprobados.length,
      cursosReprobados: reprobados.length,
      creditosAprobados,
    },
  };
}

// 🔧 SOLVENCIA: Usa mocks locales
export function obtenerSolvenciaLocal(carnet) {
  const alumno = buscarAlumnoEnMocks(carnet);
  const notas = mockData.notas[carnet] || [];
  const solvenciaPago = mockData.solvenciaPagos[carnet] || { solvente: true, montoPendiente: 0 };
  
  const cursosReprobados = notas.filter(n => n.estado === "reprobado");
  const solventeNotas = cursosReprobados.length === 0;
  
  return {
    alumno,
    solvenciaGeneral: solventeNotas && solvenciaPago.solvente,
    solvenciaNotas: {
      solvente: solventeNotas,
      totalReprobados: cursosReprobados.length,
      cursosReprobados: cursosReprobados.map(c => ({
        curso: c.curso,
        nombreCurso: c.nombreCurso,
        notaFinal: c.notaFinal,
        periodo: c.periodo
      }))
    },
    solvenciaPagos: {
      solvente: solvenciaPago.solvente,
      montoPendiente: parseMoney(solvenciaPago.montoPendiente),
      mensualidadesPendientes: solvenciaPago.montoPendiente > 0 ? 1 : 0,
      enMora: !solvenciaPago.solvente
    }
  };
}

// 🔧 ASISTENCIAS: Usa mocks locales
export function obtenerAsistenciasLocal(carnet, codigoCurso) {
  const alumno = buscarAlumnoEnMocks(carnet);
  
  // mockData.asistencias[carnet][curso]
  const asistenciasAlumno = mockData.asistencias[carnet];
  if (!asistenciasAlumno) {
    return null;
  }
  
  const asistenciaCurso = asistenciasAlumno[codigoCurso.toUpperCase()];
  if (!asistenciaCurso) {
    return null;
  }

  return {
    alumno,
    curso: asistenciaCurso,
    resumen: {
      total: asistenciaCurso.totalClases || 0,
      presentes: asistenciaCurso.asistencias || 0,
      ausentes: asistenciaCurso.ausencias || 0,
      porcentaje: asistenciaCurso.porcentajeAsistencia || 0
    }
  };
}