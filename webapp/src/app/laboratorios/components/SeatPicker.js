'use client'

import { agruparAsientosPorFila } from '@/lib/laboratorios/asientos'

const STATUS_CLASS = {
  disponible: 'lab-seat--disponible',
  ocupado: 'lab-seat--ocupado',
  bloqueado: 'lab-seat--bloqueado',
  seleccionado: 'lab-seat--seleccionado',
}

export default function SeatPicker({
  asientos = [],
  seleccionados = [],
  onToggle,
  loading = false,
  maxSeleccion = 1,
}) {
  const filas = agruparAsientosPorFila(asientos)

  if (loading) {
    return (
      <div className="lab-seat-map lab-seat-map--loading">
        <i className="fa fa-spinner fa-spin mr-2" aria-hidden="true" />
        Cargando butacas...
      </div>
    )
  }

  if (filas.length === 0) {
    return (
      <p className="text-sm opacity-60 py-4">
        Selecciona fecha y hora para ver las butacas disponibles.
      </p>
    )
  }

  return (
    <div className="lab-seat-picker">
      <div className="lab-seat-screen">
        <i className="fa fa-desktop" aria-hidden="true" /> Pantalla / Pizarra
      </div>

      <p className="text-xs opacity-60 text-center mb-2">
        30 estaciones · Fila A estándar · Fila B alto rendimiento (acceso remoto)
      </p>

      <div className="lab-seat-map" role="group" aria-label="Selección de butacas">
        {filas.map(([fila, seats], idx) => (
          <div key={fila}>
            <div className="lab-seat-row">
              <span className="lab-seat-row-label">{fila}</span>
              <div className="lab-seat-row-seats">
                {seats.map((seat) => {
                  const seatId = Number(seat.id)
                  const isSelected = seleccionados.some((s) => Number(s) === seatId)
                  const status = isSelected ? 'seleccionado' : seat.estado
                  const disabled = seat.estado !== 'disponible' && !isSelected

                  return (
                    <button
                      key={seatId}
                      type="button"
                      title={`${seat.etiqueta} — ${seat.estado}`}
                      disabled={disabled}
                      className={`lab-seat ${STATUS_CLASS[status] || ''}`}
                      onClick={() => {
                        if (disabled && !isSelected) return
                        onToggle(seatId, maxSeleccion)
                      }}
                      aria-pressed={isSelected}
                      aria-label={`Butaca ${seat.etiqueta}, ${seat.estado}`}
                    >
                      {seat.numero}
                    </button>
                  )
                })}
              </div>
            </div>
            {idx === 0 && filas.length === 2 && (
              <div className="lab-seat-aisle" aria-hidden="true">
                — Pasillo —
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="lab-seat-legend">
        <span><i className="lab-seat lab-seat--disponible lab-seat--legend" /> Disponible</span>
        <span><i className="lab-seat lab-seat--ocupado lab-seat--legend" /> Ocupada</span>
        <span><i className="lab-seat lab-seat--seleccionado lab-seat--legend" /> Tu selección</span>
        <span><i className="lab-seat lab-seat--bloqueado lab-seat--legend" /> No disponible</span>
      </div>
    </div>
  )
}
