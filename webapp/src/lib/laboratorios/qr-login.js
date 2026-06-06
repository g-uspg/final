import prisma from '@/lib/prisma'
import { signAccess, signRefresh } from '@/lib/jwt'
import { verificarQrInstitucional } from '@/lib/laboratorios/qr-institucional'
import { esCorreoInstitucional } from '@/lib/laboratorios/qr-challenge'

export async function completarLoginQr({ qrCode, email }) {
  const correo = email?.trim().toLowerCase()
  if (!correo || !esCorreoInstitucional(correo)) {
    return { ok: false, error: 'Debes usar tu correo institucional @uspg.edu.gt' }
  }

  const verificacion = await verificarQrInstitucional(qrCode)
  if (!verificacion.ok) {
    return { ok: false, error: verificacion.error || 'QR no válido.' }
  }

  const user = await prisma.user.findFirst({
    where: { qr_code: qrCode.trim(), deleted_at: null, is_active: true },
  })

  if (!user) {
    return { ok: false, error: 'Usuario no encontrado para este QR.' }
  }

  if (user.email.toLowerCase() !== correo) {
    return {
      ok: false,
      error: 'El correo no coincide con el titular del carné QR.',
    }
  }

  if (!verificacion.puedeUsarLab && user.role === 'STUDENT') {
    return {
      ok: false,
      error: verificacion.motivo || 'No cumples requisitos institucionales (inscripción/solvencia).',
      institucional: verificacion.institucional,
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  })

  const payload = {
    sub: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
    source: 'uspg',
    carnet: user.carnet,
    loginMethod: 'qr_google',
  }

  const access_token = signAccess(payload)
  const refresh_token = signRefresh(payload)

  return {
    ok: true,
    access_token,
    refresh_token,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.first_name,
      apellido: user.last_name,
      carnet: user.carnet,
      role: user.role,
      source: 'uspg',
    },
    institucional: verificacion.institucional,
  }
}
