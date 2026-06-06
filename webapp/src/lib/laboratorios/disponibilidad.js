const MESES_CORTOS = [
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sep.',
  'oct.',
  'nov.',
  'dic.',
]

/** Formato estable servidor/cliente (evita NBSP de Intl en hidratación). */
function formatHora(date) {
  const d = new Date(date)
  const hours24 = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const period = hours24 >= 12 ? 'p. m.' : 'a. m.'
  const hours12 = hours24 % 12 || 12
  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`
}

function formatFechaCorta(date) {
  const d = new Date(date)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${formatHora(date)}`
}

/** Calcula chip de disponibilidad para tarjetas de laboratorio. */
export function getDisponibilidadLab(lab) {
  if (lab.estado === 'MANTENIMIENTO') {
    return { status: 'mantenimiento', label: 'En mantenimiento', icon: 'fa-wrench' }
  }
  if (lab.estado === 'INACTIVO') {
    return { status: 'inactivo', label: 'Inactivo', icon: 'fa-ban' }
  }

  const now = Date.now()
  const reservas = (lab.reservas || []).filter((r) => r.estado === 'APROBADA')

  const actual = reservas.find((r) => {
    const ini = new Date(r.fechaInicio).getTime()
    const fin = new Date(r.fechaFin).getTime()
    return ini <= now && fin >= now
  })

  if (actual) {
    return {
      status: 'ocupado',
      label: `Ocupado hasta ${formatHora(actual.fechaFin)}`,
      icon: 'fa-clock-o',
    }
  }

  const proxima = reservas.find((r) => new Date(r.fechaInicio).getTime() > now)
  if (proxima) {
    return {
      status: 'proxima',
      label: `Libre · Próxima: ${formatFechaCorta(proxima.fechaInicio)}`,
      icon: 'fa-calendar',
    }
  }

  return { status: 'disponible', label: 'Disponible ahora', icon: 'fa-check-circle' }
}
