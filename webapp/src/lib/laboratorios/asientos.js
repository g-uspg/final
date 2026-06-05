/** 30 plazas: 2 filas × 15 butacas (laboratorio de computación). */
export const DEFAULT_FILAS = ['A', 'B']
export const DEFAULT_COLUMNAS = 15
export const TOTAL_ASIENTOS = DEFAULT_FILAS.length * DEFAULT_COLUMNAS

/** Fila B = estaciones de alto rendimiento con acceso remoto simulado. */
export const FILA_ACCESO_REMOTO = 'B'

/** Asientos simulados ocupados (demo). */
export const ASIENTOS_SIMULADOS_DEMO = [
  { fila: 'A', numero: 4 },
  { fila: 'A', numero: 5 },
  { fila: 'A', numero: 6 },
  { fila: 'A', numero: 12 },
  { fila: 'B', numero: 3 },
  { fila: 'B', numero: 7 },
  { fila: 'B', numero: 8 },
  { fila: 'B', numero: 14 },
]

export function etiquetaAsiento(fila, numero) {
  return `${fila}${numero}`
}

export function etiquetasAsientosReserva(reserva) {
  const labels =
    reserva?.asientosReservados
      ?.map((ra) => ra.asiento?.etiqueta)
      .filter(Boolean) || []
  return labels.length > 0 ? labels.join(', ') : null
}

export function agruparAsientosPorFila(asientos) {
  const map = new Map()
  for (const a of asientos) {
    if (!map.has(a.fila)) map.set(a.fila, [])
    map.get(a.fila).push(a)
  }
  for (const fila of map.keys()) {
    map.get(fila).sort((x, y) => x.numero - y.numero)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}
