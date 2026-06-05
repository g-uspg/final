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

export default function SesionRemotaSimulada({ sesion, onClose }) {
  const [terminando, setTerminando] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tab, setTab] = useState('escritorio')

  const meta = sesion?.registroActividad || {}
  const host = meta.host || 'lab-pc.uspg.local'
  const etiqueta = meta.asientoEtiqueta || 'B1'
  const inicioMs = useMemo(
    () => (sesion?.inicio ? new Date(sesion.inicio).getTime() : Date.now()),
    [sesion?.inicio]
  )
  const inicioLabel = useMemo(() => new Date(inicioMs).toLocaleString('es-GT'), [inicioMs])

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - inicioMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [inicioMs])

  const handleDesconectar = async () => {
    if (!window.confirm('¿Finalizar la sesión remota? Se registrará el tiempo de uso.')) return
    setTerminando(true)
    const result = await finalizarSesionRemota(sesion.id)
    setTerminando(false)
    onClose(result)
  }

  return (
    <div className="lab-remote-overlay" role="dialog" aria-modal="true" aria-label="Sesión remota simulada">
      <div className="lab-remote-shell">
        <header className="lab-remote-titlebar">
          <div className="lab-remote-titlebar-left">
            <span className="lab-remote-dot lab-remote-dot--green" aria-hidden="true" />
            <span className="lab-remote-titlebar-text">
              <i className="fa fa-cloud" aria-hidden="true" /> Conectado a {host}
            </span>
            <span className="lab-remote-badge">Simulación</span>
          </div>
          <div className="lab-remote-titlebar-right">
            <span className="lab-remote-timer" aria-live="polite">
              <i className="fa fa-clock-o" aria-hidden="true" /> {formatElapsed(elapsed)}
            </span>
            <span className="lab-remote-seat">Estación {etiqueta}</span>
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

        <nav className="lab-remote-tabs" aria-label="Aplicaciones simuladas">
          {[
            { id: 'escritorio', label: 'Escritorio', icon: 'fa-desktop' },
            { id: 'terminal', label: 'Terminal', icon: 'fa-terminal' },
            { id: 'llm', label: 'Práctica LLM', icon: 'fa-comments' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`lab-remote-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`fa ${t.icon}`} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="lab-remote-viewport">
          {tab === 'escritorio' && (
            <div className="lab-remote-desktop">
              <div className="lab-remote-desktop-icons">
                <div className="lab-remote-icon">
                  <i className="fa fa-folder-open" aria-hidden="true" />
                  <span>Documentos</span>
                </div>
                <div className="lab-remote-icon">
                  <i className="fa fa-code" aria-hidden="true" />
                  <span>VS Code</span>
                </div>
                <div className="lab-remote-icon" onClick={() => setTab('llm')} role="button" tabIndex={0}>
                  <i className="fa fa-comments" aria-hidden="true" />
                  <span>LLM Inglés</span>
                </div>
              </div>
              <div className="lab-remote-specs">
                <p>
                  <strong>Estación remota — fila B (alto rendimiento)</strong>
                </p>
                <ul>
                  <li>CPU: Intel Xeon · 32 núcleos lógicos</li>
                  <li>RAM: 128 GB · GPU: NVIDIA RTX A6000</li>
                  <li>SO: Windows 11 Pro (imagen del laboratorio)</li>
                </ul>
                <p className="lab-remote-hint">
                  En producción aquí verías el escritorio real vía Apache Guacamole o RDP. Esta
                  vista demuestra el flujo de reserva → conexión → registro de horas.
                </p>
              </div>
            </div>
          )}

          {tab === 'terminal' && (
            <div className="lab-remote-terminal">
              <pre>
                {`$ ssh estudiante@${host}
Authenticating via USPG Lab Gateway (simulado)...
Connected to ${host}
Last login: ${inicioLabel}

estudiante@${host}:~$ nvidia-smi --query-gpu=name,memory.total --format=csv
name, memory.total [MiB]
NVIDIA RTX A6000, 49140 MiB

estudiante@${host}:~$ echo "Sesión remota activa — estación ${etiqueta}"
Sesión remota activa — estación ${etiqueta}

estudiante@${host}:~$ _`}
              </pre>
            </div>
          )}

          {tab === 'llm' && (
            <div className="lab-remote-llm">
              <h3>Práctica de inglés con LLM</h3>
              <p className="text-sm opacity-80 mb-4">
                Simulación del entorno de práctica conversacional avalado por USPG.
              </p>
              <div className="lab-remote-chat">
                <div className="lab-remote-chat-bubble lab-remote-chat-bubble--bot">
                  Hello! I&apos;m your USPG language tutor. Describe your engineering project in
                  English.
                </div>
                <div className="lab-remote-chat-bubble lab-remote-chat-bubble--user">
                  I am working on a remote lab access system for our university.
                </div>
                <div className="lab-remote-chat-bubble lab-remote-chat-bubble--bot">
                  Great topic! How does your system ensure students only connect during approved
                  reservation windows?
                </div>
              </div>
              <p className="lab-remote-hint mt-4">
                El LLM real correría en el servidor del laboratorio; aquí solo se ilustra la
                experiencia del estudiante conectado remotamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
