import prisma from "@/lib/prisma";

export const NOTA_APROBACION = 61;

// Rutas a tus APIs existentes
export const ALUMNOS_API = "/api/control-de-notas/prueba/alumnos";
export const CURSOS_API = "/api/control-de-notas/prueba/cursos";

export function crearError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
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

async function consumirJson(origin, path) {
  const url = path.startsWith("http") ? path : `${origin}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw crearError(`Respuesta inválida de ${path}`, 502);
  }
  if (!res.ok) {
    throw crearError(data?.message || data?.error || `Error consumiendo ${path}`, res.status);
  }
  return data;
}

export async function consumirApiAcademica(origin, path) {
  const data = await consumirJson(origin, path);
  if (data?.success === false) {
    throw crearError(data.message || data.error || `Error consumiendo ${path}`, 500);
  }
  return data?.data ?? data;
}

export async function consumirApiGrupo6(origin, path) {
  const data = await consumirJson(origin, path);
  return data?.data ?? data;
}

export async function obtenerCatalogos(origin) {
  const [alumnos, cursos] = await Promise.all([
    consumirApiAcademica(origin, ALUMNOS_API),
    consumirApiAcademica(origin, CURSOS_API),
  ]);
  return {
    alumnos: Array.isArray(alumnos) ? alumnos : [],
    cursos: Array.isArray(cursos) ? cursos : [],
  };
}

export function buscarAlumnoPorCarnet(alumnos, carnet) {
  return alumnos.find((a) => String(a.carnet) === String(carnet));
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
  return completo || alumno?.name || alumno?.nombreCompleto || "Alumno";
}

export function obtenerNombreCarrera(alumno) {
  return alumno?.carrera?.nombre ?? alumno?.carreraNombre ?? alumno?.nombreCarrera ?? null;
}

export function obtenerCodigoCurso(curso, idCurso = null) {
  return curso?.codigo ?? curso?.code ?? String(idCurso ?? obtenerIdCurso(curso));
}

export function obtenerNombreCurso(curso) {
  return curso?.nombre ?? curso?.name ?? "Curso sin nombre";
}

export function buscarCursoPorId(cursos, idCurso) {
  return cursos.find((c) => obtenerIdCurso(c) === Number(idCurso));
}

export function buscarCursoPorParametro(cursos, parametro) {
  return cursos.find((c) => {
    const idCurso = obtenerIdCurso(c);
    const codigoCurso = obtenerCodigoCurso(c, idCurso);
    return String(idCurso) === String(parametro) || String(codigoCurso) === String(parametro);
  });
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

export async function armarNotasAlumno(origin, carnet) {
  const { alumnos, cursos } = await obtenerCatalogos(origin);
  const alumno = buscarAlumnoPorCarnet(alumnos, carnet);

  if (!alumno) throw crearError(`No se encontró alumno con carnet ${carnet}`, 404);

  const idAlumno = obtenerIdAlumno(alumno);
  if (!idAlumno) throw crearError("El alumno no tiene un id válido para buscar matrículas", 400);

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

export async function obtenerSolvenciaPagos(origin, carnet) {
  const [estadoSolvencia, estadoMora] = await Promise.all([
    consumirApiGrupo6(origin, `/api/solvencia/${encodeURIComponent(carnet)}`),
    consumirApiGrupo6(origin, `/api/mora/${encodeURIComponent(carnet)}`),
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
}