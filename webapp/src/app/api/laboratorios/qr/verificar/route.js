export const dynamic = 'force-dynamic'

import * as res from '@/lib/response'
import { verificarQrInstitucional } from '@/lib/laboratorios/qr-institucional'

/**
 * POST /api/laboratorios/qr/verificar
 * Body: { code | qr_code, reservaId?, laboratorioId? }
 *
 * Verifica carné QR institucional (auth.User.qr_code) contra:
 * - Grupo 1: inscripción académica
 * - Grupo 6: matrícula semestre actual + solvencia
 * - Grupo 3: elegibilidad laboratorios
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const code = body.code ?? body.qr_code
    const result = await verificarQrInstitucional(code, {
      reservaId: body.reservaId ?? null,
      laboratorioId: body.laboratorioId ? Number(body.laboratorioId) : null,
    })

    if (!result.ok) {
      return res.error(result.error || 'Verificación fallida', 403)
    }

    return res.ok(result)
  } catch (err) {
    console.error('[lab/qr/verificar]', err)
    return res.error(err.message || 'Error al verificar QR')
  }
}
