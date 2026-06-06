import { anclarAudit } from '@/lib/blockchain'
import { prisma } from '@/lib/prisma-laboratorios'

/**
 * Ancla evento de laboratorio en blockchain (Polygon Amoy) y guarda registro local.
 * La BD sigue siendo la fuente de verdad; la cadena es auditoría inmutable.
 */
export async function anclarEventoLab({ sesionId, usuarioId, action, data }) {
  const sessionKey = sesionId || usuarioId || `lab-${Date.now()}`
  const payload = {
    ...data,
    usuarioId: usuarioId ?? null,
    sesionId: sesionId ?? null,
    ts: new Date().toISOString(),
  }

  const chain = await anclarAudit({
    sessionId: sessionKey,
    action: `LAB_${action}`,
    data: payload,
  })

  const record = await prisma.blockchainAuditLab
    .create({
      data: {
        sesionId: sesionId ?? null,
        usuarioId: usuarioId ?? null,
        action: `LAB_${action}`,
        dataHash: chain?.dataHash ?? '',
        txHash: chain?.txHash ?? null,
        status: chain ? 'CONFIRMED' : 'FAILED',
      },
    })
    .catch((err) => {
      console.error('[blockchain-lab] No se pudo guardar audit local:', err.message)
      return null
    })

  return { blockchain: chain, audit: record }
}
