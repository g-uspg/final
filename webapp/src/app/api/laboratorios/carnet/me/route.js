export const dynamic = 'force-dynamic'

import * as res from '@/lib/response'
import { getUserFromRequest } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { getOrCreateLabUsuario, getLabEligibility } from '@/lib/laboratorios/usuario-lab'
import { verificarElegibilidadInstitucional } from '@/lib/laboratorios/integracion-grupo6'

/** GET /api/laboratorios/carnet/me — Carné digital + estatus institucional del estudiante */
export async function GET(request) {
  const jwtUser = getUserFromRequest(request)
  if (!jwtUser) return res.error('No autenticado', 401)

  try {
    const [dbUser, labUsuario] = await Promise.all([
      prisma.user.findUnique({
        where: { id: jwtUser.sub },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          carnet: true,
          qr_code: true,
          role: true,
        },
      }),
      getOrCreateLabUsuario(jwtUser),
    ])

    if (!dbUser?.qr_code) return res.error('Sin carné QR asignado.', 404)

    const [eligibility, institucional] = await Promise.all([
      getLabEligibility(jwtUser, labUsuario),
      verificarElegibilidadInstitucional({ jwtUser, labUsuario }),
    ])

    const puedeIngresar =
      eligibility.canReserve && institucional.solvente && institucional.matriculaSemestreActual

    return res.ok({
      nombre: `${dbUser.first_name} ${dbUser.last_name}`.trim(),
      email: dbUser.email,
      carnet: dbUser.carnet || institucional.carnet,
      qrCode: dbUser.qr_code,
      qrPayload: `USPG-LAB:${dbUser.qr_code}`,
      semestre: institucional.semestreEtiqueta,
      puedeIngresar,
      status: puedeIngresar
        ? 'AUTORIZADO'
        : !institucional.inscrito
          ? 'NO_INSCRITO'
          : !institucional.matriculaSemestreActual
            ? 'SIN_MATRICULA'
            : !institucional.solvente
              ? 'MOROSO'
              : 'RESTRINGIDO',
      statusLabel: puedeIngresar
        ? 'Acceso autorizado'
        : eligibility.reason || institucional.motivoSolvencia || 'Acceso restringido',
      institucional: {
        inscrito: institucional.inscrito,
        matriculaSemestreActual: institucional.matriculaSemestreActual,
        solvente: institucional.solvente,
        semestre: institucional.semestreEtiqueta,
      },
      modoCobro: eligibility.modoCobro,
    })
  } catch (err) {
    console.error('[lab/carnet/me]', err)
    return res.error(err.message || 'Error al cargar carné')
  }
}
