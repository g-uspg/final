'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TIPO_LAB_LABEL,
  TIPO_LAB_ICON,
  ESTADO_LAB_LABEL,
  ESTADO_RESERVA_LABEL,
  CATEGORIA_USUARIO_LABEL,
  TIPO_CURSO_LIBRE_LABEL,
} from '@/lib/laboratorios/constants'
import { getDisponibilidadLab } from '@/lib/laboratorios/disponibilidad'
import NuevaReservaModal from './components/NuevaReservaModal'
import { useLabToast } from './components/ToastProvider'
import { cancelarMiReserva, inscribirCursoLibre, iniciarSesionRemota } from './actions'
import { evaluarAccesoRemoto } from '@/lib/laboratorios/sesion-remota'
import { etiquetasAsientosReserva } from '@/lib/laboratorios/asientos'
import SesionRemotaSimulada from './components/SesionRemotaSimulada'
import ConexionRemotaGuacamole from './components/ConexionRemotaGuacamole'
import { esSesionGuacamole } from '@/lib/laboratorios/remoto-config'

function estadoReservaClass(estado) {
  if (estado === 'APROBADA') return 'lab-badge-activo'
  if (estado === 'PENDIENTE') return 'lab-badge-pendiente'
  if (estado === 'RECHAZADA') return 'lab-badge-inactivo'
  return 'lab-badge-mantenimiento'
}

export default function LaboratoriosClienteDashboard({ initialData }) {
  const router = useRouter()
  const { showToast } = useLabToast()
  const [tab, setTab] = useState('explorar')
  const [showReservaModal, setShowReservaModal] = useState(false)
  const [labReservaDefault, setLabReservaDefault] = useState(null)
  const [cursoReserva, setCursoReserva] = useState(null)
  const [pending, startTransition] = useTransition()
  const [sesionRemota, setSesionRemota] = useState(initialData.sesionRemotaActiva || null)

  const { labUsuario, eligibility, laboratorios, misReservas, cobroPendiente, cursosLibres = [], misInscripcionesIds = [], sesionRemotaActiva } = initialData

  const abrirReserva = (labId = null, curso = null) => {
    if (!eligibility.canReserve) {
      showToast(eligibility.reason || 'No puedes reservar en este momento.', 'error')
      return
    }
    setLabReservaDefault(curso?.laboratorioId || labId)
    setCursoReserva(curso || null)
    setShowReservaModal(true)
  }

  const handleInscribir = (cursoId) => {
    startTransition(async () => {
      const result = await inscribirCursoLibre(cursoId)
      if (result.success) {
        showToast('Inscripción registrada.')
        router.refresh()
      } else {
        showToast(result.error || 'No se pudo inscribir.', 'error')
      }
    })
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

  const handleConectarRemoto = (reserva) => {
    startTransition(async () => {
      const result = await iniciarSesionRemota(reserva.id)
      if (result.success && result.sesion) {
        if (result.modo === 'guacamole' && result.connectUrl && result.nuevaPestana !== false) {
          window.open(result.connectUrl, '_blank', 'noopener,noreferrer')
        }
        setSesionRemota(result.sesion)
        if (!result.yaActiva) {
          showToast(
            result.modo === 'guacamole'
              ? 'Sesión Guacamole iniciada. Se abrió el escritorio remoto.'
              : 'Sesión remota iniciada (simulación).'
          )
        }
      } else {
        showToast(result.error || 'No se pudo conectar.', 'error')
      }
    })
  }

  const handleCerrarSesionRemota = (result) => {
    setSesionRemota(null)
    if (result?.success) {
      const msg = result.incluidoEnCuota
        ? `Sesión cerrada (${result.minutos} min, incluida en cuota).`
        : `Sesión cerrada (${result.minutos} min · Q ${Number(result.montoCobrado || 0).toFixed(2)} pendiente).`
      showToast(msg)
    } else if (result?.error) {
      showToast(result.error, 'error')
    }
    router.refresh()
  }

  const renderAccionesRemota = (r) => {
    const acceso = evaluarAccesoRemoto(r)
    const asientos = r.asientosReservados?.map((ra) => ra.asiento?.etiqueta).filter(Boolean) || []
    return (
      <div className="flex flex-col gap-2">
        {asientos.length > 0 && (
          <span className="text-xs opacity-60">
            Butacas: {asientos.join(', ')}
            {asientos.some((e) => e.startsWith('B')) && (
              <span className="lab-chip lab-chip--remota ml-1">
                <i className="fa fa-cloud" aria-hidden="true" /> Remoto
              </span>
            )}
          </span>
        )}
        {acceso.puede && !sesionRemota && (
          <button
            type="button"
            className="lab-btn-primary text-sm w-full justify-center"
            disabled={pending}
            onClick={() => handleConectarRemoto(r)}
          >
            <i className="fa fa-desktop" aria-hidden="true" /> Conectar remotamente
          </button>
        )}
        {acceso.proximo && (
          <span className="text-xs text-amber-500">{acceso.razon}</span>
        )}
        {!acceso.puede && !acceso.proximo && r.estado === 'APROBADA' && asientos.length > 0 && (
          <span className="text-xs opacity-50">{acceso.razon}</span>
        )}
        {['PENDIENTE', 'APROBADA'].includes(r.estado) && (
          <button
            type="button"
            className="lab-btn-ghost w-full justify-center mt-1"
            disabled={pending || !!sesionRemota}
            onClick={() => handleCancelar(r.id)}
          >
            Cancelar
          </button>
        )}
      </div>
    )
  }

  const proximasReservas = misReservas.filter((r) =>
    ['PENDIENTE', 'APROBADA'].includes(r.estado) && new Date(r.fechaFin) >= new Date()
  )

  return (
    <div className="lab-module">
      {pending && <div className="lab-loading-bar" aria-hidden="true" />}

      <div className="lab-hero dashboard-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">
              USPG · Reservación de laboratorios
            </p>
            <h1>Hola, {labUsuario.nombre}</h1>
            <p className="text-sm opacity-80">
              {CATEGORIA_USUARIO_LABEL[labUsuario.categoria] || 'Usuario'}
              {labUsuario.carrera ? ` · ${labUsuario.carrera}` : ''}
            </p>
          </div>
          {eligibility.canReserve && (
            <button type="button" className="lab-btn-primary" onClick={() => abrirReserva()}>
              <i className="fa fa-calendar-plus-o" aria-hidden="true" /> Nueva reservación
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="lab-stat">
          <div className={`lab-stat-value ${eligibility.inscrito ? '' : 'lab-stat-value--alert'}`}>
            {eligibility.inscrito ? 'Sí' : 'No'}
          </div>
          <div className="lab-stat-label">Inscrito en USPG</div>
        </div>
        <div className="lab-stat">
          <div className="lab-stat-value">
            {eligibility.modoCobro === 'INCLUIDO' ? 'Cuota' : 'Por hora'}
          </div>
          <div className="lab-stat-label">Modo de cobro</div>
        </div>
        <div className="lab-stat">
          <div className="lab-stat-value">Q {cobroPendiente.total.toFixed(2)}</div>
          <div className="lab-stat-label">Pendiente fin de mes</div>
        </div>
      </div>

      {!eligibility.canReserve && (
        <div className="dashboard-card lab-card mb-6 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm">
            <i className="fa fa-exclamation-triangle mr-2 text-amber-400" aria-hidden="true" />
            {eligibility.reason}
          </p>
        </div>
      )}

      {eligibility.canReserve && eligibility.modoCobro === 'PAGO_HORA' && (
        <div className="dashboard-card lab-card mb-6 border border-blue-500/20 bg-blue-500/5">
          <p className="text-sm opacity-90">
            <i className="fa fa-info-circle mr-2 text-blue-400" aria-hidden="true" />
            El uso del laboratorio se cobra por hora. Recibirás la factura consolidada a fin de mes.
            Las estaciones de la <strong>fila B</strong> permiten acceso remoto desde casa (simulación o Guacamole).
          </p>
        </div>
      )}

      {(sesionRemota || sesionRemotaActiva) && (
        <div className="dashboard-card lab-card mb-6 border border-green-500/30 bg-green-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            <i className="fa fa-cloud mr-2 text-green-400" aria-hidden="true" />
            Tienes una sesión remota activa
            {(sesionRemota || sesionRemotaActiva)?.registroActividad?.host
              ? ` en ${(sesionRemota || sesionRemotaActiva).registroActividad.host}`
              : ''}
            .
          </p>
          <button
            type="button"
            className="lab-btn-primary text-sm shrink-0"
            onClick={() => setSesionRemota(sesionRemota || sesionRemotaActiva)}
          >
            Volver a la sesión
          </button>
        </div>
      )}

      <div className="lab-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`lab-tab ${tab === 'explorar' ? 'active' : ''}`}
          onClick={() => setTab('explorar')}
        >
          <i className="fa fa-flask" aria-hidden="true" /> Explorar laboratorios
        </button>
        <button
          type="button"
          role="tab"
          className={`lab-tab ${tab === 'cursos' ? 'active' : ''}`}
          onClick={() => setTab('cursos')}
        >
          <i className="fa fa-graduation-cap" aria-hidden="true" /> Cursos libres
          {cursosLibres.length > 0 && (
            <span className="lab-tab-badge">{cursosLibres.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          className={`lab-tab ${tab === 'mis-reservas' ? 'active' : ''}`}
          onClick={() => setTab('mis-reservas')}
        >
          <i className="fa fa-calendar" aria-hidden="true" /> Mis reservaciones
          {proximasReservas.length > 0 && (
            <span className="lab-tab-badge">{proximasReservas.length}</span>
          )}
        </button>
      </div>

      {tab === 'explorar' && (
        <>
          {laboratorios.length === 0 ? (
            <div className="lab-empty dashboard-card lab-card">
              No hay laboratorios disponibles en este momento.
            </div>
          ) : (
            <div className="lab-grid">
              {laboratorios.map((lab) => {
                const disp = getDisponibilidadLab(lab)
                return (
                  <article key={lab.id} className="dashboard-card lab-card">
                    <div className={`lab-avail lab-avail--${disp.status}`}>
                      <i className={`fa ${disp.icon}`} aria-hidden="true" />
                      {disp.label}
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center lab-icon-wrap">
                        <i
                          className={`fa ${TIPO_LAB_ICON[lab.tipo] || 'fa-building'} text-xl`}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="lab-badge lab-badge-activo">{ESTADO_LAB_LABEL[lab.estado]}</span>
                    </div>
                    <p className="text-xs opacity-60 mb-1">{lab.codigo}</p>
                    <h3 className="lab-card-title">{lab.nombre}</h3>
                    <p className="text-sm opacity-70 mb-3 line-clamp-2">
                      {lab.descripcion || 'Sin descripción'}
                    </p>
                    <p className="text-xs opacity-60 mb-3">
                      <i className="fa fa-map-marker mr-1" aria-hidden="true" />
                      {lab.ubicacion || 'Ubicación no definida'}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm mb-4">
                      <span>
                        <i className="fa fa-users mr-1 opacity-50" aria-hidden="true" />
                        {lab.capacidadTotal} plazas
                      </span>
                      <span>{TIPO_LAB_LABEL[lab.tipo]}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/laboratorios/${lab.id}`}
                        className="lab-btn-ghost w-full justify-center"
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        className="lab-btn-primary w-full justify-center"
                        disabled={!eligibility.canReserve}
                        onClick={() => abrirReserva(lab.id)}
                      >
                        Reservar
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'cursos' && (
        <div className="space-y-4">
          {cursosLibres.length === 0 ? (
            <div className="lab-empty dashboard-card">No hay cursos libres disponibles.</div>
          ) : (
            cursosLibres.map((curso) => {
              const inscrito = misInscripcionesIds.includes(curso.id)
              return (
                <article key={curso.id} className="dashboard-card lab-card lab-curso-card">
                  <div className="mb-3">
                    <p className="text-xs opacity-60 mb-1">{curso.codigo}</p>
                    <h3 className="lab-card-title mb-2">{curso.nombre}</h3>
                    <div className="lab-curso-chips">
                      <span className="lab-chip lab-chip--tipo">
                        <i className="fa fa-graduation-cap" aria-hidden="true" />
                        {TIPO_CURSO_LIBRE_LABEL[curso.tipo] || curso.tipo}
                      </span>
                      {(curso.certificadoUSPG ?? curso.certificado_uspg) && (
                        <span className="lab-chip lab-chip--cert">
                          <i className="fa fa-certificate" aria-hidden="true" />
                          Certificado USPG
                        </span>
                      )}
                      {(curso.usaLLM ?? curso.usa_llm) && (
                        <span className="lab-chip lab-chip--llm">
                          <i className="fa fa-comments" aria-hidden="true" />
                          Práctica LLM
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm opacity-80 mb-3">{curso.descripcion}</p>
                  <p className="text-xs opacity-60 mb-3">
                    <i className="fa fa-flask mr-1" aria-hidden="true" />
                    {curso.laboratorio?.nombre} · {curso.duracionMinutos} min/sesión ·{' '}
                    {curso.examenesAnuales} exámenes al año
                  </p>
                  {curso.examenes?.length > 0 && (
                    <ul className="text-xs opacity-70 mb-4 space-y-1">
                      {curso.examenes.map((ex) => (
                        <li key={ex.id}>
                          <i className="fa fa-calendar-check-o mr-1" aria-hidden="true" />
                          {ex.nombre} — {new Date(ex.fechaProgramada).toLocaleDateString('es-GT')}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {!inscrito ? (
                      <button
                        type="button"
                        className="lab-btn-ghost"
                        disabled={pending}
                        onClick={() => handleInscribir(curso.id)}
                      >
                        Inscribirme
                      </button>
                    ) : (
                      <span className="text-sm text-green-500 flex items-center gap-1">
                        <i className="fa fa-check-circle" aria-hidden="true" /> Inscrito
                      </span>
                    )}
                    <button
                      type="button"
                      className="lab-btn-primary"
                      disabled={!eligibility.canReserve || (!inscrito && curso.tipo === 'INGLES_LLM')}
                      onClick={() => abrirReserva(curso.laboratorioId, curso)}
                    >
                      Reservar sesión
                    </button>
                  </div>
                  {curso.tipo === 'INGLES_LLM' && !inscrito && (
                    <p className="text-xs opacity-50 mt-2">Debes inscribirte antes de reservar.</p>
                  )}
                </article>
              )
            })
          )}
        </div>
      )}

      {tab === 'mis-reservas' && (
        <div className="lab-table-wrap lab-table-wrap--responsive">
          {misReservas.length === 0 ? (
            <div className="lab-empty dashboard-card">
              Aún no tienes reservaciones. Explora los laboratorios disponibles.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {misReservas.map((r) => (
                  <div key={r.id} className="lab-reserva-card">
                    <p className="font-semibold mb-1">{r.laboratorio?.nombre}</p>
                    <p className="text-xs opacity-60 mb-2">{r.laboratorio?.codigo}</p>
                    <p className="text-sm opacity-80 mb-2">
                      {new Date(r.fechaInicio).toLocaleString('es-GT')} —{' '}
                      {new Date(r.fechaFin).toLocaleString('es-GT')}
                    </p>
                    <span className={`lab-badge ${estadoReservaClass(r.estado)} mb-3 inline-block`}>
                      {ESTADO_RESERVA_LABEL[r.estado]}
                    </span>
                    {renderAccionesRemota(r)}
                  </div>
                ))}
              </div>
              <table className="lab-table hidden md:table">
                <thead>
                  <tr>
                    <th>Laboratorio</th>
                    <th>Butacas</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {misReservas.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/laboratorios/${r.laboratorio?.id}`} className="lab-link-corinto">
                          {r.laboratorio?.nombre}
                        </Link>
                      </td>
                      <td>{etiquetasAsientosReserva(r) || '—'}</td>
                      <td>{new Date(r.fechaInicio).toLocaleString('es-GT')}</td>
                      <td>{new Date(r.fechaFin).toLocaleString('es-GT')}</td>
                      <td>
                        <span className={`lab-badge ${estadoReservaClass(r.estado)}`}>
                          {ESTADO_RESERVA_LABEL[r.estado]}
                        </span>
                      </td>
                      <td>{renderAccionesRemota(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {showReservaModal && (
        <NuevaReservaModal
          laboratorios={laboratorios}
          laboratorioIdDefault={labReservaDefault}
          cursoLibreDefault={cursoReserva}
          usuarioIdLocked={labUsuario.id}
          usuarioLabel={`${labUsuario.nombre} ${labUsuario.apellido || ''}`.trim()}
          onClose={(msg, type) => {
            setShowReservaModal(false)
            setLabReservaDefault(null)
            setCursoReserva(null)
            if (typeof msg === 'string' && msg) showToast(msg, type)
            router.refresh()
          }}
        />
      )}

      {sesionRemota && esSesionGuacamole(sesionRemota) && (
        <ConexionRemotaGuacamole sesion={sesionRemota} onClose={handleCerrarSesionRemota} />
      )}

      {sesionRemota && !esSesionGuacamole(sesionRemota) && (
        <SesionRemotaSimulada sesion={sesionRemota} onClose={handleCerrarSesionRemota} />
      )}
    </div>
  )
}
