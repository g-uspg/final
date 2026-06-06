'use client'

import { useState, useTransition } from 'react'
import { crearEspacio } from '../actions'

const TIPOS_ESPACIO = [
  { value: 'SALON',            label: 'Salón de clases',   icon: 'fa-chalkboard' },
  { value: 'AUDITORIO',        label: 'Auditorio',          icon: 'fa-users' },
  { value: 'LABORATORIO_ADMIN',label: 'Laboratorio',        icon: 'fa-flask' },
  { value: 'SALA_REUNIONES',   label: 'Sala de reuniones',  icon: 'fa-handshake-o' },
  { value: 'CANCHA',           label: 'Cancha deportiva',   icon: 'fa-soccer-ball-o' },
  { value: 'OTRO',             label: 'Otro',               icon: 'fa-building' },
]

const ESTADOS_ESPACIO = [
  { value: 'DISPONIBLE',        label: 'Disponible' },
  { value: 'MANTENIMIENTO',     label: 'En mantenimiento' },
  { value: 'FUERA_DE_SERVICIO', label: 'Fuera de servicio' },
]

export default function NuevoEspacioModal({ onClose }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    tipo: 'SALON',
    capacidad: '30',
    ubicacion: '',
    descripcion: '',
    piso: '',
    estado: 'DISPONIBLE',
    tieneProyector: false,
    tieneAireAcondicionado: false,
    tieneInternetWifi: false,
    tienePizarron: false,
    tienePizarronDigital: false,
    notasRecursos: '',
    activo: true,
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }))

  const handleSubmit = () => {
    if (!form.nombre.trim())    { setError('El nombre es requerido.');     return }
    if (!form.codigo.trim())    { setError('El código es requerido.');     return }
    if (!form.ubicacion.trim()) { setError('La ubicación es requerida.');  return }
    const cap = parseInt(form.capacidad)
    if (!cap || cap < 1)        { setError('La capacidad debe ser mayor a 0.'); return }

    setError(null)
    startTransition(async () => {
      const result = await crearEspacio({
        ...form,
        capacidad: cap,
        piso: form.piso ? parseInt(form.piso) : null,
      })
      if (result.success) {
        onClose('Espacio creado correctamente.', 'success')
      } else {
        setError(result.error || 'No se pudo crear el espacio.')
      }
    })
  }

  return (
      <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="adm-modal adm-modal--wide">
          <div className="adm-modal-header">
            <h2><i className="fa fa-building" /> Nuevo Espacio</h2>
            <button type="button" className="adm-modal-close" onClick={() => onClose()} aria-label="Cerrar">
              <i className="fa fa-times" />
            </button>
          </div>

          <div className="adm-modal-body">
            {error && (
                <div className="adm-alert adm-alert-error">
                  <i className="fa fa-exclamation-circle" /> {error}
                </div>
            )}

            {/* Tipo */}
            <div className="adm-form-group">
              <label className="adm-label">Tipo de espacio *</label>
              <div className="adm-tipo-grid">
                {TIPOS_ESPACIO.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        className={`adm-tipo-btn ${form.tipo === t.value ? 'active' : ''}`}
                        onClick={() => set('tipo', t.value)}
                    >
                      <i className={`fa ${t.icon}`} />
                      <span>{t.label}</span>
                    </button>
                ))}
              </div>
            </div>

            {/* Nombre y código */}
            <div className="adm-form-grid">
              <div className="adm-form-group">
                <label className="adm-label">Nombre *</label>
                <input
                    className="adm-input"
                    placeholder="Ej: Salón 101 — Edificio A"
                    value={form.nombre}
                    onChange={(e) => set('nombre', e.target.value)}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Código *</label>
                <input
                    className="adm-input"
                    placeholder="Ej: SAL-101"
                    value={form.codigo}
                    onChange={(e) => set('codigo', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* Ubicación y piso */}
            <div className="adm-form-grid">
              <div className="adm-form-group">
                <label className="adm-label">Ubicación *</label>
                <input
                    className="adm-input"
                    placeholder="Ej: Edificio Central, Ala Norte"
                    value={form.ubicacion}
                    onChange={(e) => set('ubicacion', e.target.value)}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Piso</label>
                <input
                    className="adm-input"
                    type="number"
                    min="0"
                    placeholder="Ej: 2"
                    value={form.piso}
                    onChange={(e) => set('piso', e.target.value)}
                />
              </div>
            </div>

            {/* Capacidad y estado */}
            <div className="adm-form-grid">
              <div className="adm-form-group">
                <label className="adm-label">Capacidad (personas) *</label>
                <input
                    className="adm-input"
                    type="number"
                    min="1"
                    value={form.capacidad}
                    onChange={(e) => set('capacidad', e.target.value)}
                />
              </div>
              <div className="adm-form-group">
                <label className="adm-label">Estado inicial</label>
                <select
                    className="adm-input"
                    value={form.estado}
                    onChange={(e) => set('estado', e.target.value)}
                >
                  {ESTADOS_ESPACIO.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div className="adm-form-group">
              <label className="adm-label">Descripción</label>
              <textarea
                  className="adm-input adm-textarea"
                  rows={2}
                  placeholder="Descripción opcional del espacio"
                  value={form.descripcion}
                  onChange={(e) => set('descripcion', e.target.value)}
              />
            </div>

            {/* Recursos disponibles */}
            <div className="adm-form-group">
              <label className="adm-label">Recursos disponibles</label>
              <div className="adm-checkbox-grid">
                <label className="adm-checkbox-item">
                  <input type="checkbox" checked={form.tieneProyector}
                         onChange={() => toggle('tieneProyector')} />
                  <span><i className="fa fa-video-camera" style={{ marginRight: 6 }} />Proyector</span>
                </label>
                <label className="adm-checkbox-item">
                  <input type="checkbox" checked={form.tieneAireAcondicionado}
                         onChange={() => toggle('tieneAireAcondicionado')} />
                  <span><i className="fa fa-snowflake-o" style={{ marginRight: 6 }} />Aire acondicionado</span>
                </label>
                <label className="adm-checkbox-item">
                  <input type="checkbox" checked={form.tieneInternetWifi}
                         onChange={() => toggle('tieneInternetWifi')} />
                  <span><i className="fa fa-wifi" style={{ marginRight: 6 }} />Internet / WiFi</span>
                </label>
                <label className="adm-checkbox-item">
                  <input type="checkbox" checked={form.tienePizarron}
                         onChange={() => toggle('tienePizarron')} />
                  <span><i className="fa fa-pencil-square-o" style={{ marginRight: 6 }} />Pizarrón</span>
                </label>
                <label className="adm-checkbox-item">
                  <input type="checkbox" checked={form.tienePizarronDigital}
                         onChange={() => toggle('tienePizarronDigital')} />
                  <span><i className="fa fa-desktop" style={{ marginRight: 6 }} />Pizarrón digital</span>
                </label>
              </div>
            </div>

            {/* Notas de recursos */}
            <div className="adm-form-group">
              <label className="adm-label">Notas sobre recursos</label>
              <input
                  className="adm-input"
                  placeholder="Ej: El proyector requiere cable HDMI propio"
                  value={form.notasRecursos}
                  onChange={(e) => set('notasRecursos', e.target.value)}
              />
            </div>
          </div>

          <div className="adm-modal-footer">
            <button type="button" className="adm-btn-ghost" onClick={() => onClose()} disabled={pending}>
              Cancelar
            </button>
            <button type="button" className="adm-btn-primary" onClick={handleSubmit} disabled={pending}>
              {pending
                  ? <><i className="fa fa-spinner fa-spin" /> Creando…</>
                  : <><i className="fa fa-plus" /> Crear Espacio</>}
            </button>
          </div>
        </div>
      </div>
  )
}