import { FILA_ACCESO_REMOTO } from '@/lib/laboratorios/asientos'

export const TARIFA_HORA_REMOTA = 25

const MARGEN_MINUTOS = 10

export function hostRemotoParaAsiento(etiqueta) {
  return `lab-pc-${String(etiqueta || 'b1').toLowerCase()}.uspg.local`
}

export function evaluarAccesoRemoto(reserva, now = new Date()) {
  if (!reserva) {
    return { puede: false, razon: 'Reserva no encontrada.' }
  }

  if (reserva.estado !== 'APROBADA') {
    return { puede: false, razon: 'La reserva debe estar aprobada por el técnico.' }
  }

  const fin = new Date(reserva.fechaFin)
  if (fin <= now) {
    return { puede: false, razon: 'El horario de la reserva ya finalizó.' }
  }

  const asientos =
    reserva.asientosReservados?.map((ra) => ra.asiento).filter(Boolean) || []
  const remoto = asientos.filter((a) => a.fila === FILA_ACCESO_REMOTO)

  if (remoto.length === 0) {
    return {
      puede: false,
      razon:
        'Solo las estaciones de la fila B (alto rendimiento) permiten acceso remoto desde casa.',
    }
  }

  const inicio = new Date(reserva.fechaInicio)
  const margenMs = MARGEN_MINUTOS * 60 * 1000
  if (now.getTime() < inicio.getTime() - margenMs) {
    return {
      puede: false,
      razon: `Podrás conectarte desde ${inicio.toLocaleString('es-GT')} (10 min antes).`,
      proximo: true,
    }
  }

  const asiento = remoto[0]
  return {
    puede: true,
    asiento,
    host: hostRemotoParaAsiento(asiento.etiqueta),
    etiqueta: asiento.etiqueta,
  }
}

export function minutosTranscurridos(inicio, fin = new Date()) {
  const ms = Math.max(0, new Date(fin).getTime() - new Date(inicio).getTime())
  return Math.ceil(ms / 60000)
}

export function montoPorMinutos(minutos, tarifaHora = TARIFA_HORA_REMOTA) {
  const horas = minutos / 60
  return Math.round(horas * tarifaHora * 100) / 100
}
