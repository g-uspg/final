export const dynamic = 'force-dynamic'

import * as res from '@/lib/response'
import { verificarChallengeQr } from '@/lib/laboratorios/qr-challenge'
import { completarLoginQr } from '@/lib/laboratorios/qr-login'

function makeResponse(body, status = 200, accessToken = null, refreshToken = null) {
  const response = Response.json(body, { status })
  if (accessToken) {
    response.headers.append(
      'Set-Cookie',
      `access_token=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
    )
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${refreshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`
    )
  }
  return response
}

/** POST /api/auth/qr/complete — Paso 2: confirmar correo institucional (o post-Google) */
export async function POST(request) {
  try {
    const body = await request.json()
    const { challenge, email } = body
    if (!challenge) return res.error('Challenge requerido.', 400)

    const qrCode = verificarChallengeQr(challenge)
    const result = await completarLoginQr({ qrCode, email })

    if (!result.ok) {
      return res.error(result.error, 403)
    }

    return makeResponse(
      {
        success: true,
        data: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          user: result.user,
        },
      },
      200,
      result.access_token,
      result.refresh_token
    )
  } catch (err) {
    console.error('[auth/qr/complete]', err)
    const msg = err.name === 'TokenExpiredError' ? 'El QR expiró. Escanea de nuevo.' : err.message
    return res.error(msg || 'No se pudo completar el login', 401)
  }
}
