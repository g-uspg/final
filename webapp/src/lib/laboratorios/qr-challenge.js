import jwt from 'jsonwebtoken'
import { resolverCarnetPorQr } from '@/lib/laboratorios/integracion-grupo6'

const SECRET = process.env.JWT_SECRET

export function crearChallengeQr(qrCode) {
  return jwt.sign(
    { type: 'qr_login', qr: qrCode },
    SECRET,
    { expiresIn: '5m' }
  )
}

export function verificarChallengeQr(token) {
  const payload = jwt.verify(token, SECRET)
  if (payload.type !== 'qr_login' || !payload.qr) {
    throw new Error('Challenge QR inválido.')
  }
  return payload.qr
}

export async function resolverUsuarioPorQr(qrCode) {
  return resolverCarnetPorQr(qrCode?.trim())
}

export function enmascararEmail(email) {
  if (!email) return ''
  const [user, domain] = email.split('@')
  if (!domain) return email
  const visible = user.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(2, user.length - 2))}@${domain}`
}

export function esCorreoInstitucional(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@uspg.edu.gt')
}
