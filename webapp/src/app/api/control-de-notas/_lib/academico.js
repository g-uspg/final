import prisma from "@/lib/prisma"; // Para el schema de notas (grupo 2)

export const NOTA_APROBACION = 61;

// 🔧 RUTAS APIs GRUPO 1 (ajústa si están en otra ubicación)
const API_BASE = {
  ALUMNOS: "webapp/src/app/api/alumnos",
  CURSOS: "webapp/src/app/api/cursos", 
  BUSCAR: "webapp/src/app/api/buscar",
  ASIGNACIONES: "webapp/src/app/api/asignaciones",
  ASISTENCIAS: "webapp/src/app/api/asistencias",
  CARRERAS: "webapp/src/app/api/carreras"
};

// Helper para hacer fetch con auth (reenvía el token del usuario)
async function fetchApi(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    cache: "no-store"
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || `Error ${res.status}`);
  }
  
  const data = await res.json();
  return data.data || data; // Algunas APIs devuelven {success, data}, otras directo
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object" && typeof value.toString === "function") {
    const n = Number(value.toString());
    return Number.isNaN(n) ? fallback : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function parseMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const limpio = String(value).replace(/[^\d.-]/g, "");
  const n = Number(limpio);
  return Number.isNaN(n) ? 0 : n;
}

export function obtenerIdAlumno(alumno) {
  return Number(alumno?.id ?? alumno?.id_alumno ?? alumno?.alumnoId);
}

export function obtenerIdCurso(curso) {
  return Number(curso?.id ?? curso?.id_curso ?? curso?.cursoId);
}

export function obtenerNombreAlumno(alumno) {
  const nombre = alumno?.nombre ?? "";
  const apellido = alumno?.apellido ?? "";
  const completo = `${nombre} ${apellido}`.trim();
  return completo || alumno?.name || "Alumno";
}

export function obtenerNombreCarrera(alumno) {
  return alumno?.carrera?.nombre ?? alumno?.carreraNombre ?? null;
}

export function obtenerCodigoCurso(curso, idCurso = null) {
  return curso?.codigo ?? curso?.code ?? String(idCurso ?? obtenerIdCurso(curso));
}

export function obtenerNombreCurso(curso) {
  return curso?.nombre ?? curso?.name ?? "Curso sin nombre";
}

// 🔧 BUSCAR ALUMNO: Usa /api/buscar?id={carnet} o filtra de /api/alumnos
export async function buscarAlumnoPorIdentificador(origin, identificador) {
  try {
    // Intentar buscar usando la API específica de búsqueda
    const url = `${origin}${API_BASE.BUSCAR}?id=${encodeURIComponent(identificador)}`;
    const resultado = await fetchApi(url);
    
    if (resultado.found && resultado.rol === "ALUMNO") {
      return {
        id: resultado.id, // carnet
        carnet: resultado.id,
        nombre: resultado.nombre,
        apellido: resultado.apellido,
        email: resultado.email,
        activo: resultado.activo,
        carrera: null // La API buscar no devuelve carrera, la obtendremos de /api/alumnos si es necesario
      };
    }
  } catch (e) {
    console.log("API buscar no disponible o no encontró, intentando lista...");
  }

  // Fallback: Obtener lista completa y filtrar
  try {
    const alumnos = await fetchApi(`${origin}${API_BASE.ALUMNOS}`);
    const encontrado = alumnos.find(a => 
      String(a.carnet) === String(identificador) || 
      String(a.id) === String(identificador)
    );
    
    if (encontrado) return encontrado;
  } catch (e) {
    console.error("Error obteniendo lista de alumnos:", e);
  }

  throw new Error(`Alumno con identificador ${identificador} no encontrado`);
}

// 🔧 OBTENER CURSOS: Usa /api/cursos
export async function obtenerCursos(origin) {
  try {
    return await fetchApi(`${origin}${API_BASE.CURSOS}`);
  } catch (e) {
    console.error("Error obteniendo cursos:", e);
    return [];
  }
}

export function buscarCursoPorId(cursos, idCurso) {
  return cursos.find((c) => obtenerIdCurso(c) === Number(idCurso));
}

export function esEvaluacionFinal(nombre) {
  const n = String(nombre || "").toLowerCase();
  return n.includes("final") || n.includes("examen final") || n.includes("ordinario");
}

export function construirNotaDesdeMatricula(matricula, curso) {
  const notas = matricula.notas ?? [];
  let zona = 0;
  let examenFinal = 0;

  for (const nota of notas) {
    const valor = toNumber(nota.valor);
    const nombreEvaluacion = nota.evaluacion?.nombre ?? "";
    if (esEvaluacionFinal(nombreEvaluacion)) {
      examenFinal += valor;
    } else {
      zona += valor;
    }
  }

  const notaCalculada = zona + examenFinal;
  const notaFinal = toNumber(matricula.cierre?.nota_final, notaCalculada);
  const estado = notaFinal >= NOTA_APROBACION ? "aprobado" : "reprobado";

  return {
    curso: obtenerCodigoCurso(curso, matricula.id_curso),
    nombreCurso: obtenerNombreCurso(curso),
    periodo: matricula.periodo,
    zona,
    examenFinal,
    notaFinal,
    estado,
    creditos: toNumber(curso?.creditos),
  };
}

// 🔧 OBTENER MATRÍCULAS: Desde Prisma (schema notas - Grupo 2)
export async function obtenerMatriculasAlumno(idAlumno) {
  return prisma.matricula.findMany({
    where: { id_alumno: Number(idAlumno) },
    include: {
      notas: { include: { evaluacion: true } },
      cierre: true,
    },
    orderBy: [{ periodo: "desc" }, { id_matricula: "desc" }],
  });
}

// 🔧 ARMAR NOTAS: Combina API Grupo 1 (alumnos/cursos) + Prisma Grupo 2 (notas)
export async function armarNotasAlumno(origin, identificador) {
  // 1. Buscar alumno en APIs Grupo 1
  const alumno = await buscarAlumnoPorIdentificador(origin, identificador);
  
  // 2. Obtener cursos de API Grupo 1
  const cursos = await obtenerCursos(origin);
  
  // 3. Obtener matrículas/notas de Prisma (Grupo 2)
  // Nota: Usamos el ID numérico del alumno si existe, o buscamos por carnet
  const idAlumno = obtenerIdAlumno(alumno);
  
  if (!idAlumno) {
    throw new Error("El alumno no tiene un ID numérico válido para consultar notas");
  }

  const matriculas = await obtenerMatriculasAlumno(idAlumno);
  
  const notas = matriculas.map((matricula) => {
    const curso = buscarCursoPorId(cursos, matricula.id_curso);
    return construirNotaDesdeMatricula(matricula, curso);
  });

  const aprobados = notas.filter((n) => n.estado === "aprobado");
  const reprobados = notas.filter((n) => n.estado === "reprobado");

  const promedioGeneral =
    notas.length > 0
      ? Number((notas.reduce((acc, n) => acc + toNumber(n.notaFinal), 0) / notas.length).toFixed(2))
      : 0;

  const creditosAprobados = aprobados.reduce((acc, n) => acc + toNumber(n.creditos), 0);

  return {
    alumno,
    idAlumno,
    cursos,
    matriculas,
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

// 🔧 SOLVENCIA: Llama a la API del Grupo 6 (pagos)
export async function obtenerSolvenciaPagos(origin, carnet) {
  try {
    const [estadoSolvencia, estadoMora] = await Promise.all([
      fetchApi(`${origin}/api/solvencia/${encodeURIComponent(carnet)}`),
      fetchApi(`${origin}/api/mora/${encodeURIComponent(carnet)}`)
    ]);

    const totalPendiente = parseMoney(estadoMora.total_pendiente);
    const totalMora = parseMoney(estadoMora.total_mora);
    const montoPendiente = totalPendiente + totalMora;

    const pagosPendientes = Array.isArray(estadoMora.detalle)
      ? estadoMora.detalle.map((item) => ({
          mes: item.mes,
          estado: item.estado,
          precio: parseMoney(item.precio),
          mora: parseMoney(item.mora),
          diasMora: Number(item.dias_mora ?? 0),
          fechaLimite: item.fecha_limite,
        }))
      : [];

    const solvente =
      estadoSolvencia.solvente === true &&
      estadoSolvencia.matricula_activa === true &&
      estadoSolvencia.facultado_procesos_academicos === true &&
      estadoMora.en_mora !== true &&
      montoPendiente <= 0;

    return {
      solvente,
      montoPendiente,
      montoMensualidades: totalPendiente,
      montoMora: totalMora,
      mensualidadesPendientes: Number(estadoSolvencia.mensualidades_pendientes ?? pagosPendientes.length),
      matriculaActiva: estadoSolvencia.matricula_activa === true,
      facultadoProcesosAcademicos: estadoSolvencia.facultado_procesos_academicos === true,
      enMora: estadoMora.en_mora === true,
      pagosPendientes,
      raw: { solvencia: estadoSolvencia, mora: estadoMora },
    };
  } catch (e) {
    // Si falla la API de pagos, devolver como solvente para no bloquear
    console.warn("Error obteniendo solvencia de pagos:", e);
    return {
      solvente: true,
      montoPendiente: 0,
      mensualidadesPendientes: 0,
      enMora: false,
      pagosPendientes: []
    };
  }
}