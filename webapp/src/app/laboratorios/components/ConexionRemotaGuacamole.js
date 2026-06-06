'use client'

import { useEffect, useMemo, useState } from 'react'
import { finalizarSesionRemota } from '../actions'

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function ConexionRemotaGuacamole({ sesion, onClose }) {
  const [terminando, setTerminando] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const meta = sesion?.registroActividad || {}
  const connectUrl = meta.guacamoleUrl || ''
  const host = meta.host || 'lab-pc.uspg.local'
  const etiqueta = meta.asientoEtiqueta || 'B1'
  const usarIframe = meta.nuevaPestana === false

  const inicioMs = useMemo(
    () => (sesion?.inicio ? new Date(sesion.inicio).getTime() : Date.now()),
    [sesion?.inicio]
  )

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - inicioMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [inicioMs])

  const handleDesconectar = async () => {
    if (
      !window.confirm(
        '¿Finalizar la sesión en el portal? Cierra también el escritorio remoto en Guacamole si aún está abierto.'
      )
    ) {
      return
    }
    setTerminando(true)
    const result = await finalizarSesionRemota(sesion.id)
    setTerminando(false)
    onClose(result)
  }

  const abrirGuacamole = () => {
    if (connectUrl) window.open(connectUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="lab-remote-overlay" role="dialog" aria-modal="true" aria-label="Sesión remota Guacamole">
      <div className="lab-remote-shell">
        <header className="lab-remote-titlebar">
          <div className="lab-remote-titlebar-left">
            <span className="lab-remote-dot lab-remote-dot--green" aria-hidden="true" />
            <span className="lab-remote-titlebar-text">
              <i className="fa fa-cloud" aria-hidden="true" /> Guacamole · {host}
            </span>
            <span className="lab-remote-badge lab-remote-badge--guacamole">Apache Guacamole</span>
          </div>
          <div className="lab-remote-titlebar-right">
            <span className="lab-remote-timer" aria-live="polite">
              <i className="fa fa-clock-o" aria-hidden="true" /> {formatElapsed(elapsed)}
            </span>
            <span className="lab-remote-seat">Estación {etiqueta}</span>
            <button type="button" className="lab-remote-open" onClick={abrirGuacamole}>
              Abrir de nuevo
            </button>
            <button
              type="button"
              className="lab-remote-disconnect"
              disabled={terminando}
              onClick={handleDesconectar}
            >
              {terminando ? 'Cerrando…' : 'Desconectar'}
            </button>
          </div>
        </header>

        <div className="lab-remote-viewport lab-remote-viewport--guacamole">
          {usarIframe && connectUrl ? (
            <iframe
              title={`Escritorio remoto estación ${etiqueta}`}
              src={connectUrl}
              className="lab-remote-iframe"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="lab-remote-guacamole-panel">
              <i className="fa fa-external-link lab-remote-guacamole-icon" aria-hidden="true" />
              <h3>Escritorio remoto abierto</h3>
              <p className="text-sm opacity-80 mb-4">
                La conexión a la estación <strong>{etiqueta}</strong> se abrió en otra pestaña del
                navegador vía Apache Guacamole.
              </p>
              <button type="button" className="lab-btn-primary" onClick={abrirGuacamole}>
                <i className="fa fa-desktop" aria-hidden="true" /> Volver al escritorio remoto
              </button>
              <p className="lab-remote-hint mt-6">
                Al desconectar aquí se registra el tiempo de uso en USPG. Cierra la sesión en
                Guacamole cuando termines de trabajar en la máquina del laboratorio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
