import prisma from "@/lib/prisma";

export const NOTA_APROBACION = 61;
export const CURSOS_API = "webapp/src/app/api/sistema-academico/cursos";
export const ALUMNOS_API = "webapp/src/app/api/sistema-academico/alumnos";

// ... (mantén todas las funciones auxiliares que ya tenías: crearError, toNumber, parseMoney, etc.) ...

// Función nueva para buscar alumno por UUID o Carnet
export async function obtenerAlumnoPorIdentificador(origin, identificador) {
  // 1. Primero intentar buscar en la lista general por carnet (más rápido)
  try {
    const alumnos = await consumirApiAcademica(origin, ALUMNOS_API);
    const porCarnet = alumnos.find((a) => String(a.carnet) === String(identificador));
    if (porCarnet) return porCarnet;
  } catch (e) {
    console.log("No se pudo obtener lista de alumnos, intentando por ID...");
  }
  
  // 2. Si no encuentra, buscar directamente por ID/UUID
  // Esto asume que tu API de alumnos soporta: GET /api/control-de-notas/alumnos/{id}
  try {
    const alumno = await consumirApiAcademica(origin, `${ALUMNOS_API}/${identificador}`);
    return alumno;
  } catch (e) {
    // Si tampoco encuentra, retornar null
    return null;
  }
}

// Modificar armarNotasAlumno para usar la nueva función
export async function armarNotasAlumno(origin, identificador) {
  // 🔧 CAMBIO: Usar la nueva función que busca por ID o Carnet
  const alumno = await obtenerAlumnoPorIdentificador(origin, identificador);
  
  if (!alumno) {
    throw crearError(`No se encontró alumno con identificador ${identificador}`, 404);
  }

  // Obtener cursos para el mapeo
  const { cursos } = await obtenerCatalogos(origin).catch(() => ({ cursos: [] }));
  
  const idAlumno = obtenerIdAlumno(alumno);
  
  if (!idAlumno) {
    throw crearError("El alumno no tiene un id válido para buscar matrículas", 400);
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