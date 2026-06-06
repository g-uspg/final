import pg from 'pg'
import prismaAcademico from '@/lib/prisma-academico'
import prismaParqueo from '@/lib/prisma'
import { prisma as prismaLab } from '@/lib/prisma-laboratorios'
import { getSemestreActual, etiquetaSemestre } from '@/lib/laboratorios/semestre'

export function normalizarCodigoQr(raw) {
  const text = (raw || '').trim()
  if (!text) return ''
  if (text.startsWith('USPG-LAB:')) return text.slice('USPG-LAB:'.length)
  try {
    const url = new URL(text)
    const part = url.pathname.split('/').filter(Boolean).pop()
    return part || text
  } catch {
    return text
  }
}

let _pool = null

function getPool() {
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    })
  }
  return _pool
}

/** Resuelve carné: grupo1 Alumno → auth User → usuario lab cache. */
export async function resolverCarnetEstudiante({ jwtUser, labUsuario }) {
  if (labUsuario?.carnet) {
    return { carnet: labUsuario.carnet, fuente: 'grupo3_laboratorios' }
  }

  if (jwtUser?.sub || jwtUser?.email) {
    const alumno = await prismaAcademico.alumno.findFirst({
      where: {
        OR: [
          ...(jwtUser.sub ? [{ parqueo_user_id: jwtUser.sub }] : []),
          ...(jwtUser.email ? [{ email: jwtUser.email.toLowerCase() }] : []),
        ],
      },
      select: { carnet: true, nombre: true, apellido: true },
    })
    if (alumno?.carnet) {
      return {
        carnet: alumno.carnet,
        nombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
        fuente: 'grupo1_academico',
      }
    }
  }

  if (jwtUser?.sub) {
    const user = await prismaParqueo.user.findUnique({
      where: { id: jwtUser.sub },
      select: { carnet: true, first_name: true, last_name: true },
    })
    if (user?.carnet) {
      return {
        carnet: user.carnet,
        nombre: `${user.first_name} ${user.last_name}`.trim(),
        fuente: 'auth',
      }
    }
  }

  return null
}

export async function resolverCarnetPorQr(qrCode) {
  const code = normalizarCodigoQr(qrCode)
  if (!code) return null
  const user = await prismaParqueo.user.findFirst({
    where: { qr_code: code, deleted_at: null, is_active: true },
    select: { id: true, carnet: true, email: true, first_name: true, last_name: true, role: true },
  })
  if (!user) return null

  let carnet = user.carnet
  if (!carnet) {
    const alumno = await prismaAcademico.alumno.findFirst({
      where: { OR: [{ parqueo_user_id: user.id }, { email: user.email.toLowerCase() }] },
      select: { carnet: true },
    })
    carnet = alumno?.carnet ?? null
  }

  return {
    parqueoUserId: user.id,
    carnet,
    email: user.email,
    nombre: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
  }
}

export async function consultarMatriculaGrupo6(carnet, semestre = getSemestreActual()) {
  if (!carnet) return null
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT id_matricula, carnet, ciclo, anio, estado, fecha_pago, precio
       FROM grupo6_pago_alumnos.matricula
       WHERE carnet = $1
         AND anio = $2
         AND estado = 'Confirmado'
         AND (
           UPPER(TRIM(ciclo)) = UPPER($3)
           OR ciclo ILIKE $4
           OR ciclo ILIKE $5
         )
       ORDER BY fecha_pago DESC
       LIMIT 1`,
      [carnet, semestre.anio, semestre.ciclo, `%${semestre.ciclo}%`, `%${semestre.etiqueta}%`]
    )
    return rows[0] || null
  } finally {
    client.release()
  }
}

export async function consultarSolvenciaGrupo6(carnet) {
  if (!carnet) {
    return { solvente: false, motivo: 'Sin carné institucional.', cuotasPendientes: 0, totalPendiente: 0 }
  }

  const client = await getPool().connect()
  try {
    const { rows: deudaRows } = await client.query(
      `SELECT
         COALESCE(SUM(precio + COALESCE(monto_mora, 0)), 0) AS total_pendiente,
         COUNT(*) FILTER (
           WHERE estado_pago IN ('Pendiente', 'Parcial', 'Vencido')
         ) AS cuotas_pendientes
       FROM grupo6_pago_alumnos.mensualidad
       WHERE carnet = $1
         AND estado_pago IN ('Pendiente', 'Parcial', 'Vencido')`,
      [carnet]
    )

    const totalPendiente = Number(deudaRows[0]?.total_pendiente || 0)
    const cuotasPendientes = Number(deudaRows[0]?.cuotas_pendientes || 0)
    const solvente = totalPendiente === 0 && cuotasPendientes === 0

    return {
      solvente,
      motivo: solvente
        ? 'Alumno solvente'
        : 'Mensualidades pendientes o vencidas (Grupo 6).',
      cuotasPendientes,
      totalPendiente,
    }
  } finally {
    client.release()
  }
}

export async function verificarAlumnoInscrito(carnet) {
  if (!carnet) return null
  return prismaAcademico.alumno.findUnique({
    where: { carnet },
    select: { id: true, carnet: true, nombre: true, apellido: true, email: true, carreraId: true },
  })
}

/** Elegibilidad institucional: Grupo 1 (inscripción) + Grupo 6 (matrícula y solvencia). */
export async function verificarElegibilidadInstitucional({ jwtUser, labUsuario }) {
  const semestre = getSemestreActual()
  const carnetInfo = await resolverCarnetEstudiante({ jwtUser, labUsuario })

  if (!carnetInfo?.carnet) {
    return {
      semestre,
      carnet: null,
      inscrito: false,
      matriculaSemestreActual: false,
      solvente: false,
      motivoSolvencia: 'No se encontró carné vinculado al usuario.',
      alumno: null,
      matricula: null,
    }
  }

  const [alumno, matricula, solvencia] = await Promise.all([
    verificarAlumnoInscrito(carnetInfo.carnet),
    consultarMatriculaGrupo6(carnetInfo.carnet, semestre),
    consultarSolvenciaGrupo6(carnetInfo.carnet),
  ])

  if (labUsuario?.id && carnetInfo.carnet && labUsuario.carnet !== carnetInfo.carnet) {
    prismaLab.usuario
      .update({ where: { id: labUsuario.id }, data: { carnet: carnetInfo.carnet } })
      .catch(() => {})
  }

  return {
    semestre,
    carnet: carnetInfo.carnet,
    nombre: carnetInfo.nombre || (alumno ? `${alumno.nombre} ${alumno.apellido}` : null),
    fuenteCarnet: carnetInfo.fuente,
    inscrito: !!alumno,
    matriculaSemestreActual: !!matricula,
    matricula,
    alumno,
    solvente: solvencia.solvente,
    motivoSolvencia: solvencia.motivo,
    cuotasPendientes: solvencia.cuotasPendientes,
    totalPendienteGrupo6: solvencia.totalPendiente,
    semestreEtiqueta: etiquetaSemestre(semestre),
  }
}
