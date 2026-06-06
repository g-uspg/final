import { prisma } from '@/lib/prisma-laboratorios'

export function periodoActual(fecha = new Date()) {
  return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() }
}

export async function obtenerFacturaAbierta(usuarioId, fecha = new Date()) {
  const { mes, anio } = periodoActual(fecha)
  return prisma.facturaMensualLab.findUnique({
    where: { usuarioId_mes_anio: { usuarioId, mes, anio } },
  })
}

export async function acumularEnFacturaMensual(usuarioId, { monto, minutos = 0, sesiones = 1 }) {
  const { mes, anio } = periodoActual()
  const montoNum = Number(monto) || 0

  return prisma.facturaMensualLab.upsert({
    where: { usuarioId_mes_anio: { usuarioId, mes, anio } },
    create: {
      usuarioId,
      mes,
      anio,
      totalMonto: montoNum,
      totalMinutos: minutos,
      totalSesiones: sesiones,
      estado: 'ABIERTA',
    },
    update: {
      totalMonto: { increment: montoNum },
      totalMinutos: { increment: minutos },
      totalSesiones: { increment: sesiones },
    },
  })
}

export async function registrarCobroSesionLab(
  usuarioId,
  { laboratorioId, reservaId, minutos, monto, tipoCobro, notas, sesionId }
) {
  const montoNum = Number(monto) || 0
  if (montoNum <= 0) return null

  const factura = await acumularEnFacturaMensual(usuarioId, { monto: montoNum, minutos, sesiones: 1 })

  const pago = await prisma.pago.create({
    data: {
      usuarioId,
      laboratorioId: laboratorioId ?? null,
      reservaId: reservaId ?? null,
      monto: montoNum,
      tipoCobro,
      metodoPago: 'FACTURACION_MENSUAL',
      estado: 'PENDIENTE',
      notas,
      facturaMensualId: factura.id,
    },
  })

  return { pago, factura }
}

export async function cerrarFacturasDelMes({ mes, anio } = periodoActual()) {
  const abiertas = await prisma.facturaMensualLab.findMany({
    where: { mes, anio, estado: 'ABIERTA', totalMonto: { gt: 0 } },
  })

  if (abiertas.length === 0) return { cerradas: 0 }

  await prisma.facturaMensualLab.updateMany({
    where: { id: { in: abiertas.map((f) => f.id) } },
    data: { estado: 'CERRADA', fechaCierre: new Date() },
  })

  return { cerradas: abiertas.length, facturas: abiertas }
}

export async function resumenFacturacionUsuario(usuarioId) {
  const pendientes = await prisma.pago.aggregate({
    where: {
      usuarioId,
      estado: 'PENDIENTE',
      tipoCobro: { in: ['PAGO_HORA', 'FACTURACION_MENSUAL'] },
    },
    _sum: { monto: true },
    _count: true,
  })

  let facturaAbierta = null
  if (prisma.facturaMensualLab?.findUnique) {
    facturaAbierta = await obtenerFacturaAbierta(usuarioId)
  }

  return {
    totalPendiente: Number(pendientes._sum.monto ?? 0),
    registrosPendientes: pendientes._count,
    facturaMesActual: facturaAbierta
      ? {
          id: facturaAbierta.id,
          mes: facturaAbierta.mes,
          anio: facturaAbierta.anio,
          total: Number(facturaAbierta.totalMonto),
          minutos: facturaAbierta.totalMinutos,
          sesiones: facturaAbierta.totalSesiones,
          estado: facturaAbierta.estado,
        }
      : null,
  }
}
