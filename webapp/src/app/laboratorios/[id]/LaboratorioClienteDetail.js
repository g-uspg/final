'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TIPO_LAB_LABEL,
  TIPO_LAB_ICON,
  ESTADO_LAB_LABEL,
  ESTADO_RESERVA_LABEL,
  ESTADO_EQUIPO_LABEL,
} from '@/lib/laboratorios/constants'
import { getDisponibilidadLab } from '@/lib/laboratorios/disponibilidad'
import NuevaReservaModal from '../components/NuevaReservaModal'
import { useLabToast } from '../components/ToastProvider'
import { cancelarMiReserva } from '../actions'
import { etiquetasAsientosReserva } from '@/lib/laboratorios/asientos'

function estadoReservaClass(estado) {
  if (estado === 'APROBADA') return 'lab-badge-activo'
  if (estado === 'PENDIENTE') return 'lab-badge-pendiente'
  if (estado === 'RECHAZADA') return 'lab-badge-inactivo'
  return 'lab-badge-mantenimiento'
}

export default function LaboratorioClienteDetail({ laboratorio: lab, labUsuario, eligibility }) {
  const router = useRouter()
  const { showToast } = useLabToast()
  const [showReserva, setShowReserva] = useState(false)
  const [pending, startTransition] = useTransition()

  const disp = getDisponibilidadLab({
    ...lab,
    reservas: (lab.reservas || []).filter((r) => r.estado === 'APROBADA'),
  })

  const abrirReserva = () => {
    if (!eligibility.canReserve) {
      showToast(eligibility.reason || 'No puedes reservar.', 'error')
      return
    }
    setShowReserva(true)
  }

  const handleCancelar = (reservaId) => {
    if (!window.confirm('¿Cancelar esta reservación?')) return
    startTransition(async () => {
      const result = await cancelarMiReserva(reservaId)
      if (result.success) {
        showToast('Reservación cancelada.')
        router.refresh()
      } else {
        showToast(result.error || 'No se pudo cancelar.', 'error')
      }
    })
  }

  return (
    <div className="lab-module">
      {pending && <div className="lab-loading-bar" aria-hidden="true" />}

      <Link href="/laboratorios" className="text-sm opacity-70 hover:opacity-100 mb-4 inline-flex items-center gap-1">
        <i className="fa fa-arrow-left" aria-hidden="true" /> Volver
      </Link>

      <div className="lab-hero dashboard-card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 lab-icon-wrap">
              <i className={`fa ${TIPO_LAB_ICON[lab.tipo]} text-2xl`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60 mb-1">{lab.codigo}</p>
              <h1 className="!text-2xl !mb-1">{lab.nombre}</h1>
              <p className="!text-sm">{TIPO_LAB_LABEL[lab.tipo]} · Fase {lab.faseImplementacion}</p>
              <p className="!text-sm mt-2">
                <i className="fa fa-map-marker mr-1" aria-hidden="true" />
                {lab.ubicacion || 'Sin ubicación'}
              </p>
              <div className={`lab-avail lab-avail--${disp.status} mt-3 inline-flex`}>
                <i className={`fa ${disp.icon}`} aria-hidden="true" />
                {disp.label}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-badge lab-badge-activo">{ESTADO_LAB_LABEL[lab.estado]}</span>
            <button
              type="button"
              className="lab-btn-primary"
              disabled={!eligibility.canReserve}
              onClick={abrirReserva}
            >
              <i className="fa fa-calendar-plus-o" aria-hidden="true" /> Reservar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="dashboard-card lab-card">
          <h3 className="lab-card-title mb-3">Descripción</h3>
          <p className="text-sm opacity-80 mb-4">{lab.descripcion || 'Sin descripción.'}</p>
          <h4 className="text-xs uppercase opacity-60 mb-2">Configuraciones disponibles</h4>
          <div>
            {lab.configuraciones?.map((c) => (
              <span key={c.id} className="lab-config-chip">
                {c.etiqueta} ({c.cupo})
              </span>
            ))}
          </div>
        </div>

        <div className="dashboard-card lab-card">
          <h3 className="lab-card-title mb-3">Equipos operativos</h3>
          {(lab.equipos?.length ?? 0) === 0 ? (
            <p className="text-sm opacity-60">Sin equipos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {lab.equipos.map((e) => (
                <li key={e.id} className="flex justify-between text-sm py-1 border-b border-white/5">
                  <span>{e.nombre}</span>
                  <span className="opacity-60">{ESTADO_EQUIPO_LABEL[e.estado]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-card lab-card mt-6">
        <h3 className="lab-card-title mb-4">Mis reservaciones en este laboratorio</h3>
        {(lab.reservas?.length ?? 0) === 0 ? (
          <p className="text-sm opacity-60">No tienes reservaciones aquí.</p>
        ) : (
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Butacas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lab.reservas.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.fechaInicio).toLocaleString('es-GT')}</td>
                    <td>{new Date(r.fechaFin).toLocaleString('es-GT')}</td>
                    <td>{etiquetasAsientosReserva(r) || '—'}</td>
                    <td>
                      <span className={`lab-badge ${estadoReservaClass(r.estado)}`}>
                        {ESTADO_RESERVA_LABEL[r.estado]}
                      </span>
                    </td>
                    <td>
                      {['PENDIENTE', 'APROBADA'].includes(r.estado) && (
                        <button
                          type="button"
                          className="lab-btn-ghost text-sm"
                          disabled={pending}
                          onClick={() => handleCancelar(r.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReserva && (
        <NuevaReservaModal
          laboratorios={[lab]}
          laboratorioIdDefault={lab.id}
          usuarioIdLocked={labUsuario.id}
          usuarioLabel={`${labUsuario.nombre} ${labUsuario.apellido || ''}`.trim()}
          onClose={(msg, type) => {
            setShowReserva(false)
            if (typeof msg === 'string' && msg) showToast(msg, type)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
