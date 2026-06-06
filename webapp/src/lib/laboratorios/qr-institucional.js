import { prisma } from '@/lib/prisma-laboratorios'
import { getOrCreateLabUsuario, getLabEligibility } from '@/lib/laboratorios/usuario-lab'
import {
  resolverCarnetPorQr,
  verificarElegibilidadInstitucional,
} from '@/lib/laboratorios/integracion-grupo6'
import { evaluarAccesoRemoto } from '@/lib/laboratorios/sesion-remota'
import { anclarEventoLab } from '@/lib/laboratorios/blockchain-lab'

export async function verificarQrInstitucional(code, { reservaId = null, laboratorioId = null } = {}) {
  if (!code?.trim()) {
    return { ok: false, error: 'Código QR requerido.' }
  }

  const identidad = await resolverCarnetPorQr(code.trim())
  if (!identidad) {
    return { ok: false, error: 'QR institucional no reconocido o usuario inactivo.' }
  }

  const jwtLike = {
    sub: identidad.parqueoUserId,
    email: identidad.email,
    role: identidad.role,
    name: identidad.nombre,
  }

  const labUsuario = await getOrCreateLabUsuario(jwtLike)
  if (!labUsuario) {
    return { ok: false, error: 'No se pudo vincular usuario de laboratorios.' }
  }

  const [eligibility, institucional] = await Promise.all([
    getLabEligibility(jwtLike, labUsuario),
    verificarElegibilidadInstitucional({ jwtUser: jwtLike, labUsuario }),
  ])

  let reserva = null
  let accesoRemoto = null
  if (reservaId) {
    reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: {
        laboratorio: { select: { id: true, nombre: true, codigo: true } },
        asientosReservados: { include: { asiento: true } },
      },
    })
    if (reserva && reserva.usuarioId !== labUsuario.id) {
      return { ok: false, error: 'La reserva no pertenece a este estudiante.' }
    }
    accesoRemoto = reserva ? evaluarAccesoRemoto(reserva) : null
  }

  const puedeUsarLab = eligibility.canReserve && !labUsuario.sancionado

  const auditData = {
    carnet: institucional.carnet,
    carnetMask: institucional.carnet ? `${institucional.carnet.slice(0, 3)}***` : null,
    laboratorioId: laboratorioId ?? reserva?.laboratorioId ?? null,
    reservaId,
    puedeUsarLab,
    matricula: institucional.matriculaSemestreActual,
    semestre: institucional.semestreEtiqueta,
    modoCobro: eligibility.modoCobro,
  }

  const chain = await anclarEventoLab({
    usuarioId: labUsuario.id,
    action: puedeUsarLab ? 'QR_VERIFICADO_OK' : 'QR_VERIFICADO_DENEGADO',
    data: auditData,
  })

  return {
    ok: true,
    puedeUsarLab,
    motivo: puedeUsarLab ? 'Acceso institucional verificado.' : eligibility.reason,
    estudiante: {
      nombre: institucional.nombre || identidad.nombre,
      carnet: institucional.carnet,
      correo: identidad.email,
    },
    institucional: {
      inscrito: institucional.inscrito,
      matriculaSemestreActual: institucional.matriculaSemestreActual,
      semestre: institucional.semestreEtiqueta,
      solvente: institucional.solvente,
      cuotasPendientes: institucional.cuotasPendientes,
    },
    laboratorios: {
      modoCobro: eligibility.modoCobro,
      sancionado: labUsuario.sancionado,
    },
    reserva: reserva
      ? {
          id: reserva.id,
          laboratorio: reserva.laboratorio?.nombre,
          estado: reserva.estado,
          accesoRemoto,
        }
      : null,
    blockchain: chain.blockchain,
  }
}
