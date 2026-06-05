import { prisma } from '@/lib/prisma-laboratorios'
import prismaAcademico from '@/lib/prisma-academico'
import prismaParqueo from '@/lib/prisma'

function mapJwtRoleToLab(jwtRole) {
  if (jwtRole === 'ADMIN') return { rol: 'ADMINISTRADOR', categoria: 'CATEDRATICO' }
  if (jwtRole === 'TEACHER') return { rol: 'CATEDRATICO', categoria: 'CATEDRATICO' }
  if (jwtRole === 'VISITOR') return { rol: 'ESTUDIANTE', categoria: 'EVENTO_EXTERNO' }
  return { rol: 'ESTUDIANTE', categoria: 'ESTUDIANTE_UNIVERSITARIO' }
}

export async function getOrCreateLabUsuario(jwtUser) {
  if (!jwtUser?.sub || !jwtUser?.email) return null

  const email = jwtUser.email.toLowerCase()

  let usuario = await prisma.usuario.findFirst({
    where: { OR: [{ parqueoUserId: jwtUser.sub }, { correo: email }] },
  })

  if (usuario && !usuario.parqueoUserId) {
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { parqueoUserId: jwtUser.sub },
    })
  }

  if (!usuario) {
    const nameParts = (jwtUser.name || email.split('@')[0]).trim().split(/\s+/)
    const nombre = nameParts[0] || 'Usuario'
    const apellido = nameParts.slice(1).join(' ') || null
    const { rol, categoria } = mapJwtRoleToLab(jwtUser.role)

    let carrera = null
    if (jwtUser.role === 'STUDENT') {
      const alumno = await prismaAcademico.alumno.findFirst({
        where: { OR: [{ parqueo_user_id: jwtUser.sub }, { email }] },
        include: { carrera: true },
      })
      carrera = alumno?.carrera?.nombre ?? null
    }

    usuario = await prisma.usuario.create({
      data: {
        correo: email,
        nombre,
        apellido,
        rol,
        categoria,
        carrera,
        parqueoUserId: jwtUser.sub,
        activo: true,
      },
    })
  }

  return usuario
}

export async function getLabEligibility(jwtUser, labUsuario) {
  if (!jwtUser || !labUsuario) {
    return { canReserve: false, reason: 'Sesión no válida.', inscrito: false, modoCobro: null }
  }

  if (['ADMIN', 'TEACHER'].includes(jwtUser.role)) {
    return { canReserve: true, reason: null, inscrito: true, modoCobro: 'ADMIN' }
  }

  if (!labUsuario.activo) {
    return { canReserve: false, reason: 'Tu cuenta de laboratorio está inactiva.', inscrito: false, modoCobro: null }
  }

  if (labUsuario.sancionado) {
    return { canReserve: false, reason: 'Tu cuenta está suspendida por sanciones.', inscrito: false, modoCobro: null }
  }

  const cuotaSemestral = await prisma.pago.findFirst({
    where: {
      usuarioId: labUsuario.id,
      tipoCobro: 'CUOTA_SEMESTRAL',
      estado: 'PAGADO',
    },
    orderBy: { createdAt: 'desc' },
  })

  const modoCobro = cuotaSemestral ? 'INCLUIDO' : 'PAGO_HORA'

  if (labUsuario.categoria === 'ESTUDIANTE_UNIVERSITARIO' || jwtUser.role === 'STUDENT') {
    const alumno = await prismaAcademico.alumno.findFirst({
      where: { OR: [{ parqueo_user_id: jwtUser.sub }, { email: jwtUser.email?.toLowerCase() }] },
    })

    let inscrito = !!alumno

    if (!inscrito && jwtUser.role === 'STUDENT') {
      const parqueoUser = await prismaParqueo.user.findUnique({ where: { id: jwtUser.sub } })
      inscrito = !!parqueoUser?.is_active && parqueoUser.role === 'STUDENT'
    }

    if (!inscrito) {
      return {
        canReserve: false,
        reason: 'Debes estar inscrito en la universidad para reservar laboratorios.',
        inscrito: false,
        modoCobro,
        cuotaSemestralPagada: !!cuotaSemestral,
      }
    }

    return {
      canReserve: true,
      reason: null,
      inscrito: true,
      modoCobro,
      cuotaSemestralPagada: !!cuotaSemestral,
    }
  }

  if (['EVENTO_EXTERNO', 'PERSONAL_COLEGIO', 'PERSONAL_IGLESIA'].includes(labUsuario.categoria)) {
    return {
      canReserve: true,
      reason: null,
      inscrito: false,
      modoCobro: 'PAGO_HORA',
      cuotaSemestralPagada: false,
      esExterno: true,
    }
  }

  return {
    canReserve: false,
    reason: 'No tienes permiso para reservar laboratorios.',
    inscrito: false,
    modoCobro: null,
  }
}

export function isLabAdminRole(jwtRole) {
  return jwtRole === 'ADMIN' || jwtRole === 'TEACHER'
}

export function isLabClientRole(jwtRole) {
  return jwtRole === 'STUDENT' || jwtRole === 'VISITOR'
}
