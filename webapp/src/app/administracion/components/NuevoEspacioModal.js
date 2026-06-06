'use client'

import { useState, useTransition } from 'react'
import { crearEspacio } from '../actions'

const TIPOS = [
  { value: 'SALON',            label: 'Salón' },
  { value: 'AUDITORIO',        label: 'Auditorio' },
  { value: 'LABORATORIO_ADMIN',label: 'Laboratorio' },
  { value: 'SALA_REUNIONES',   label: 'Sala de Reuniones' },
  { value: 'CANCHA',           label: 'Cancha / Área Deportiva' },
  { value: 'OTRO',             label: 'Otro' },
]

// Recursos que aplican según el tipo de espacio
const RECURSOS_POR_TIPO = {
  SALON: [
    { key: 'tieneProyector',         label: 'Proyector',         icon: 'fa-video-camera' },
    { key: 'tieneAireAcondicionado', label: 'Aire Acondicionado', icon: 'fa-snowflake-o' },
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',   icon: 'fa-wifi' },
    { key: 'tienePizarron',          label: 'Pizarrón',          icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Pizarrón Digital',  icon: 'fa-desktop' },
  ],
  AUDITORIO: [
    { key: 'tieneProyector',         label: 'Proyector / Pantalla', icon: 'fa-video-camera' },
    { key: 'tieneAireAcondicionado', label: 'Aire Acondicionado',   icon: 'fa-snowflake-o' },
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',      icon: 'fa-wifi' },
    { key: 'tienePizarron',          label: 'Pizarrón',             icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Pizarrón Digital',     icon: 'fa-desktop' },
  ],
  LABORATORIO_ADMIN: [
    { key: 'tieneProyector',         label: 'Proyector',         icon: 'fa-video-camera' },
    { key: 'tieneAireAcondicionado', label: 'Aire Acondicionado', icon: 'fa-snowflake-o' },
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',   icon: 'fa-wifi' },
    { key: 'tienePizarron',          label: 'Pizarrón',          icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Pizarrón Digital',  icon: 'fa-desktop' },
  ],
  SALA_REUNIONES: [
    { key: 'tieneProyector',         label: 'Proyector / TV',    icon: 'fa-video-camera' },
    { key: 'tieneAireAcondicionado', label: 'Aire Acondicionado', icon: 'fa-snowflake-o' },
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',   icon: 'fa-wifi' },
    { key: 'tienePizarron',          label: 'Pizarrón',          icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Pizarrón Digital',  icon: 'fa-desktop' },
  ],
  CANCHA: [
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',         icon: 'fa-wifi' },
    { key: 'tieneAireAcondicionado', label: 'Techo / Área Cubierta',   icon: 'fa-home' },
    { key: 'tieneProyector',         label: 'Marcador Electrónico',    icon: 'fa-television' },
    { key: 'tienePizarron',          label: 'Pizarrón Táctico',        icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Sistema de Sonido',       icon: 'fa-volume-up' },
  ],
  OTRO: [
    { key: 'tieneProyector',         label: 'Proyector',         icon: 'fa-video-camera' },
    { key: 'tieneAireAcondicionado', label: 'Aire Acondicionado', icon: 'fa-snowflake-o' },
    { key: 'tieneInternetWifi',      label: 'Internet / WiFi',   icon: 'fa-wifi' },
    { key: 'tienePizarron',          label: 'Pizarrón',          icon: 'fa-chalkboard' },
    { key: 'tienePizarronDigital',   label: 'Pizarrón Digital',  icon: 'fa-desktop' },
  ],
}

// Placeholder de capacidad sugerida por tipo
const CAPACIDAD_DEFAULT = {
  SALON: '30',
  AUDITORIO: '150',
  LABORATORIO_ADMIN: '25',
  SALA_REUNIONES: '12',
  CANCHA: '22',
  OTRO: '20',
}

// Placeholder de código por tipo
const CODIGO_PLACEHOLDER = {
  SALON: 'Ej: SAL-A101',
  AUDITORIO: 'Ej: AUD-01',
  LABORATORIO_ADMIN: 'Ej: LAB-B201',
  SALA_REUNIONES: 'Ej: SR-101',
  CANCHA: 'Ej: CAN-01',
  OTRO: 'Ej: ESP-01',
}

const NOMBRE_PLACEHOLDER = {
  SALON: 'Ej: Salón A-101',
  AUDITORIO: 'Ej: Auditorio Central',
  LABORATORIO_ADMIN: 'Ej: Laboratorio de Redes',
  SALA_REUNIONES: 'Ej: Sala de Reuniones B1',
  CANCHA: 'Ej: Cancha de Fútbol',
  OTRO: 'Ej: Espacio Multiusos',
}

export default function NuevoEspacioModal({ onClose }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'SALON',
    capacidad: '30',
    ubicacion: '',
    piso: '',
    tieneProyector: false,
    tieneAireAcondicionado: false,
    tieneInternetWifi: false,
    tienePizarron: false,
    tienePizarronDigital: false,
    notasRecursos: '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }))

  // Al cambiar tipo: resetear recursos y sugerir capacidad
  const handleTipoChange = (nuevoTipo) => {
    setForm((f) => ({
      ...f,
      tipo: nuevoTipo,
      capacidad: CAPACIDAD_DEFAULT[nuevoTipo] || f.capacidad,
      // Resetear todos los recursos al cambiar tipo para evitar confusión
      tieneProyector: false,
      tieneAireAcondicionado: false,
      tieneInternetWifi: false,
      tienePizarron: false,
      tienePizarronDigital: false,
    }))
  }

  const handleSubmit = () => {
    if (!form.codigo || !form.nombre || !form.ubicacion || !form.capacidad) {
      setError('Completa los campos requeridos: código, nombre, ubicación y capacidad.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await crearEspacio(form)
      if (result.success) {
        onClose('Espacio creado correctamente.', 'success')
      } else {
        setError(result.error)
      }
    })
  }

  const recursosDelTipo = RECURSOS_POR_TIPO[form.tipo] || RECURSOS_POR_TIPO.OTRO
  const esCancha = form.tipo === 'CANCHA'

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-modal-header">
          <h2><i className="fa fa-plus-circle" aria-hidden="true" /> Nuevo Espacio</h2>
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

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-label">Código *</label>
              <input
                className="adm-input"
                placeholder={CODIGO_PLACEHOLDER[form.tipo]}
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value)}
              />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">Tipo *</label>
              <select className="adm-input" value={form.tipo} onChange={(e) => handleTipoChange(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="adm-form-group">
            <label className="adm-label">Nombre *</label>
            <input
              className="adm-input"
              placeholder={NOMBRE_PLACEHOLDER[form.tipo]}
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
            />
          </div>

          <div className="adm-form-group">
            <label className="adm-label">Descripción</label>
            <textarea
              className="adm-input adm-textarea"
              placeholder="Descripción del espacio (opcional)"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
            />
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-label">Ubicación *</label>
              <input
                className="adm-input"
                placeholder={esCancha ? 'Ej: Campus Norte, Área Exterior' : 'Ej: Edificio A, Nivel 1'}
                value={form.ubicacion}
                onChange={(e) => set('ubicacion', e.target.value)}
              />
            </div>
            <div className="adm-form-group">
              <label className="adm-label">{esCancha ? 'Nivel / Área' : 'Piso'}</label>
              <input
                className="adm-input"
                type={esCancha ? 'text' : 'number'}
                min={esCancha ? undefined : '0'}
                placeholder={esCancha ? 'Ej: Planta baja' : 'Ej: 2'}
                value={form.piso}
                onChange={(e) => set('piso', e.target.value)}
              />
            </div>
          </div>

          <div className="adm-form-group">
            <label className="adm-label">Capacidad ({esCancha ? 'jugadores / personas' : 'personas'}) *</label>
            <input
              className="adm-input"
              type="number"
              min="1"
              value={form.capacidad}
              onChange={(e) => set('capacidad', e.target.value)}
            />
          </div>

          {/* ── Recursos adaptados al tipo ─────────────────────────── */}
          <div className="adm-form-group">
            <label className="adm-label">
              {esCancha ? 'Instalaciones disponibles' : 'Recursos disponibles'}
            </label>

            {esCancha && (
              <div style={{
                fontSize: '11px',
                color: '#94a3b8',
                background: 'rgba(148,163,184,0.07)',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <i className="fa fa-info-circle" />
                Los recursos para canchas reflejan instalaciones deportivas, no equipos de aula.
              </div>
            )}

            <div className="adm-checkbox-grid">
              {recursosDelTipo.map(({ key, label, icon }) => (
                <label key={key} className="adm-checkbox-item">
                  <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} />
                  <span><i className={`fa ${icon} mr-1 opacity-60`} />{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="adm-form-group">
            <label className="adm-label">Notas sobre recursos</label>
            <input
              className="adm-input"
              placeholder={
                esCancha
                  ? 'Ej: Cancha de pasto sintético, iluminación nocturna'
                  : 'Ej: Proyector marca Epson, 3000 lúmenes'
              }
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
              ? <><i className="fa fa-spinner fa-spin" /> Guardando…</>
              : <><i className="fa fa-save" /> Crear Espacio</>}
          </button>
        </div>
      </div>
    </div>
  )
}
