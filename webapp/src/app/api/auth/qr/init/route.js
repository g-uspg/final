export const dynamic = 'force-dynamic'

import * as res from '@/lib/response'
import {
  crearChallengeQr,
  enmascararEmail,
  resolverUsuarioPorQr,
} from '@/lib/laboratorios/qr-challenge'

/** POST /api/auth/qr/init — Paso 1: validar QR y emitir challenge para Google/correo */
export async function POST(request) {
  try {
    const body = await request.json()
    const code = (body.code ?? body.qr_code ?? '').trim()
    if (!code) return res.error('Código QR requerido.', 400)

    const identidad = await resolverUsuarioPorQr(code)
    if (!identidad) {
      return res.error('Carné QR no reconocido.', 404)
    }

    const challenge = crearChallengeQr(code)
    const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

    return res.ok({
      challenge,
      emailHint: enmascararEmail(identidad.email),
      nombre: identidad.nombre,
      carnet: identidad.carnet,
      googleEnabled,
      nextStep: googleEnabled ? 'google' : 'email',
    })
  } catch (err) {
    console.error('[auth/qr/init]', err)
    return res.error(err.message || 'Error al iniciar login QR')
  }
}
