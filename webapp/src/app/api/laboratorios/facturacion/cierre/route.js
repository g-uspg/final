export const dynamic = 'force-dynamic'

import * as res from '@/lib/response'
import { requireServerRole } from '@/lib/server-auth'
import { cerrarFacturasDelMes, periodoActual } from '@/lib/laboratorios/facturacion-mensual'

/**
 * POST /api/laboratorios/facturacion/cierre
 * Cierra facturas mensuales abiertas del mes indicado (solo admin).
 * Body opcional: { mes, anio }
 */
export async function POST(request) {
  try {
    await requireServerRole('ADMIN')
    const body = await request.json().catch(() => ({}))
    const periodo = body.mes && body.anio ? { mes: Number(body.mes), anio: Number(body.anio) } : periodoActual()
    const result = await cerrarFacturasDelMes(periodo)
    return res.ok({
      mensaje: `Facturas cerradas: ${result.cerradas}`,
      periodo,
      ...result,
    })
  } catch (err) {
    console.error('[lab/facturacion/cierre]', err)
    return res.error(err.message || 'No se pudo cerrar facturación')
  }
}
