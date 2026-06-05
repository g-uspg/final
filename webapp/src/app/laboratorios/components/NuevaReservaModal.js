'use client'

import { useState, useEffect, useCallback } from 'react'
import { crearReserva, getAsientosDisponibles } from '../actions'
import SeatPicker from './SeatPicker'

const DURACION_DEFAULT_MIN = 60

function toLocalDatetime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addMinutesToLocal(datetimeLocal, minutes) {
  const start = new Date(datetimeLocal)
  if (Number.isNaN(start.getTime())) return ''
  return toLocalDatetime(new Date(start.getTime() + minutes * 60000))
}

export default function NuevaReservaModal({
  laboratorios,
  usuarios = [],
  onClose = () => {},
  laboratorioIdDefault,
  usuarioIdLocked,
  usuarioLabel,
  cursoLibreDefault = null,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [labId, setLabId] = useState(
    String(cursoLibreDefault?.laboratorioId || laboratorioIdDefault || laboratorios[0]?.id || '')
  )
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [asientos, setAsientos] = useState([])
  const [asientosLoading, setAsientosLoading] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])

  const dismiss = () => onClose()
  const cursoId = cursoLibreDefault?.id || ''
  const maxAsientos = cursoId ? 1 : 4
  const duracionMin = cursoLibreDefault?.duracionMinutos || DURACION_DEFAULT_MIN
  const rangoValido =
    Boolean(fechaInicio && fechaFin) && new Date(fechaFin) > new Date(fechaInicio)

  const cargarAsientos = useCallback(async () => {
    if (!labId || !fechaInicio || !fechaFin || !rangoValido) {
      setAsientos([])
      return
    }
    setAsientosLoading(true)
    try {
      const data = await getAsientosDisponibles(Number(labId), fechaInicio, fechaFin)
      setAsientos(data)
      setSeleccionados((prev) => prev.filter((id) => data.find((s) => s.id === id && s.estado === 'disponible')))
    } catch {
      setAsientos([])
    } finally {
      setAsientosLoading(false)
    }
  }, [labId, fechaInicio, fechaFin, rangoValido])

  useEffect(() => {
    const t = setTimeout(cargarAsientos, 300)
    return () => clearTimeout(t)
  }, [cargarAsientos])

  useEffect(() => {
    if (!fechaInicio) return
    if (!fechaFin || new Date(fechaFin) <= new Date(fechaInicio)) {
      setFechaFin(addMinutesToLocal(fechaInicio, duracionMin))
    }
  }, [fechaInicio, fechaFin, duracionMin])

  function handleInicioChange(val) {
    setFechaInicio(val)
    setSeleccionados([])
    if (val) {
      setFechaFin(addMinutesToLocal(val, duracionMin))
    }
  }

  function handleToggleAsiento(id, max) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (max === 1) return [id]
      if (prev.length >= max) return prev
      return [...prev, id]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (seleccionados.length === 0) {
      setError('Selecciona al menos una butaca disponible.')
      setLoading(false)
      return
    }

    if (!rangoValido) {
      setError('La hora de fin debe ser posterior al inicio.')
      setLoading(false)
      return
    }

    const formData = new FormData(e.target)
    formData.set('asientoIds', seleccionados.join(','))
    if (cursoId) formData.set('cursoLibreId', cursoId)

    const result = await crearReserva(formData)
    if (result?.success) {
      onClose('Reservación enviada. Pendiente de aprobación del técnico.', 'success')
    } else {
      setError(result?.error || 'Error al crear reservación')
      setLoading(false)
      await cargarAsientos()
    }
  }

  const propositoDefault = cursoLibreDefault
    ? `Sesión: ${cursoLibreDefault.nombre}`
    : ''

  return (
    <div className="lab-modal-overlay" onClick={dismiss}>
      <div className="lab-modal lab-modal--wide" onClick={(ev) => ev.stopPropagation()}>
        <h3 className="text-xl font-semibold mb-1">Nueva reservación</h3>
        {cursoLibreDefault && (
          <div className="lab-curso-chips mb-4">
            {(cursoLibreDefault.certificadoUSPG ?? cursoLibreDefault.certificado_uspg) && (
              <span className="lab-chip lab-chip--cert">
                <i className="fa fa-certificate" aria-hidden="true" />
                Certificado USPG
              </span>
            )}
            {(cursoLibreDefault.usaLLM ?? cursoLibreDefault.usa_llm) && (
              <span className="lab-chip lab-chip--llm">
                <i className="fa fa-comments" aria-hidden="true" />
                Práctica LLM
              </span>
            )}
          </div>
        )}
        {error && (
          <div className="mb-3 p-3 text-sm text-red-400 border border-red-500/30 rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Laboratorio</label>
            <select
              name="laboratorioId"
              className="lab-input"
              value={labId}
              onChange={(e) => {
                setLabId(e.target.value)
                setSeleccionados([])
              }}
              required
              disabled={!!cursoLibreDefault}
            >
              {laboratorios.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {cursoId && <input type="hidden" name="cursoLibreId" value={cursoId} />}

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Solicitante</label>
            {usuarioIdLocked ? (
              <>
                <input type="hidden" name="usuarioId" value={usuarioIdLocked} />
                <div className="lab-input opacity-80 cursor-default">{usuarioLabel || 'Tu cuenta'}</div>
              </>
            ) : (
              <select name="usuarioId" className="lab-input" required>
                <option value="">Seleccionar usuario</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido || ''} — {u.correo}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Inicio</label>
              <input
                type="datetime-local"
                name="fechaInicio"
                required
                className="lab-input"
                value={fechaInicio}
                onChange={(e) => handleInicioChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Fin</label>
              <input
                type="datetime-local"
                name="fechaFin"
                required
                className="lab-input"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => {
                  setFechaFin(e.target.value)
                  setSeleccionados([])
                }}
              />
              <p className="text-xs opacity-50 mt-1">
                Duración mínima sugerida: {duracionMin} min (se ajusta al cambiar inicio).
              </p>
            </div>
          </div>

          {!rangoValido && fechaInicio && fechaFin && (
            <p className="text-sm text-amber-500">
              <i className="fa fa-exclamation-triangle mr-1" aria-hidden="true" />
              La hora de fin debe ser posterior al inicio para ver las butacas.
            </p>
          )}

          <div>
            <label className="block text-xs uppercase opacity-70 mb-2">
              Selecciona tu butaca {maxAsientos === 1 ? '' : `(máx. ${maxAsientos})`}
            </label>
            <SeatPicker
              asientos={asientos}
              seleccionados={seleccionados}
              onToggle={handleToggleAsiento}
              loading={asientosLoading}
              maxSeleccion={maxAsientos}
            />
            <input type="hidden" name="asientoIds" value={seleccionados.join(',')} />
          </div>

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Personas</label>
            <input
              type="number"
              name="cantidadPersonas"
              min={1}
              value={seleccionados.length || 1}
              readOnly
              className="lab-input opacity-80"
            />
          </div>

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Propósito</label>
            <textarea
              name="proposito"
              required
              rows={2}
              className="lab-input"
              defaultValue={propositoDefault}
              placeholder="Clase, práctica, evento..."
            />
          </div>

          <p className="text-xs opacity-60">
            <i className="fa fa-info-circle" /> Las butacas rojas están ocupadas. Toda reservación requiere aprobación.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={dismiss} className="lab-btn-ghost">Cancelar</button>
            <button type="submit" className="lab-btn-primary" disabled={loading || seleccionados.length === 0}>
              {loading ? 'Enviando...' : 'Solicitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
