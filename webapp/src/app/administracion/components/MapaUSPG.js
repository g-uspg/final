'use client'

import { useState, useTransition, useMemo } from 'react'
import { actualizarEstadoEspacio } from '../actions'

// Posiciones fijas en el SVG — se emparejan por salon.codigo con espacio.codigo de la BD
const POSICIONES = {
  S001:  { x: 470, y: 248, w: 62, h: 42, sub: '4A' },
  S002:  { x: 470, y: 198, w: 62, h: 42, sub: '4B' },
  S003:  { x: 470, y: 298, w: 62, h: 42, sub: '3A' },
  S004:  { x: 470, y: 348, w: 62, h: 42, sub: '3B' },
  S005:  { x: 334, y: 430, w: 62, h: 42, sub: '2A' },
  S007:  { x: 204, y: 418, w: 62, h: 42, sub: '2B' },
  S008A: { x: 416, y: 112, w: 66, h: 42, sub: '3U'  },
  S008B: { x: 416, y: 62,  w: 66, h: 42, sub: '4U'  },
  S009:  { x: 340, y: 82,  w: 62, h: 42, sub: ''    },
  S010:  { x: 272, y: 72,  w: 62, h: 42, sub: ''    },
  S011:  { x: 204, y: 80,  w: 62, h: 42, sub: ''    },
  S012:  { x: 140, y: 148, w: 62, h: 42, sub: '1A'  },
  S013:  { x: 140, y: 198, w: 62, h: 42, sub: '1B'  },
  N201:  { x: 250, y: 510, w: 66, h: 38, sub: '2do' },
  N202:  { x: 326, y: 510, w: 66, h: 38, sub: '2do' },
  C301:  { x: 40,  y: 380, w: 72, h: 44, sub: 'Col' },
}

const ESTADOS = {
  DISPONIBLE:        { label: 'Disponible',     color: '#4ade80', bg: 'rgba(74,222,128,0.18)',  border: 'rgba(74,222,128,0.55)',  next: 'OCUPADO'       },
  OCUPADO:           { label: 'Ocupado',         color: '#fbbf24', bg: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.55)',  next: 'MANTENIMIENTO' },
  MANTENIMIENTO:     { label: 'Mantenimiento',   color: '#f87171', bg: 'rgba(248,113,113,0.18)', border: 'rgba(248,113,113,0.55)', next: 'DISPONIBLE'    },
  FUERA_DE_SERVICIO: { label: 'Fuera de serv.', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)',  next: 'DISPONIBLE'    },
}

const DEFAULT_CFG = { label: 'Sin registrar', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', next: null }

export default function MapaUSPG({ espacios = [], onNuevaReserva, onReporte }) {
  const [seleccionado, setSeleccionado] = useState(null)
  const [pending, startTransition]      = useTransition()
  const [error, setError]               = useState(null)

  // Índice código → espacio de la BD
  const mapaEspacios = useMemo(() => {
    const m = {}
    for (const e of espacios) m[e.codigo] = e
    return m
  }, [espacios])

  const getCfg = (codigo) => {
    const esp = mapaEspacios[codigo]
    if (!esp) return DEFAULT_CFG
    return ESTADOS[esp.estado] ?? DEFAULT_CFG
  }

  const handleCambiarEstado = (codigo) => {
    const esp = mapaEspacios[codigo]
    if (!esp) return
    const cfg  = ESTADOS[esp.estado]
    if (!cfg?.next) return

    setError(null)
    startTransition(async () => {
      const res = await actualizarEstadoEspacio(esp.id, cfg.next)
      if (!res?.success) setError('No se pudo actualizar el estado.')
    })
  }

  const conteos = useMemo(() => {
    const c = { DISPONIBLE: 0, OCUPADO: 0, MANTENIMIENTO: 0, FUERA_DE_SERVICIO: 0 }
    for (const e of espacios) c[e.estado] = (c[e.estado] || 0) + 1
    return c
  }, [espacios])

  const salonSel = seleccionado ? mapaEspacios[seleccionado] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Leyenda ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'].map(k => {
          const cfg = ESTADOS[k]
          const n   = conteos[k] || 0
          return (
            <span key={k} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.28rem 0.65rem', borderRadius: '20px',
              border: `1px solid ${cfg.border}`, background: cfg.bg,
              fontSize: '0.75rem', fontWeight: 600, color: cfg.color,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
              {cfg.label} <span style={{ opacity: 0.75 }}>{n}</span>
            </span>
          )
        })}
        {error && <span style={{ fontSize: '0.75rem', color: '#f87171', marginLeft: 'auto' }}>{error}</span>}
      </div>

      {/* ── Cuerpo: mapa + panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: '1rem', alignItems: 'start' }}>

        {/* SVG */}
        <div className="adm-mapa-svg-wrap" style={{ opacity: pending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
          <svg viewBox="0 0 580 580" width="100%" style={{ maxWidth: 540, display: 'block', margin: '0 auto' }}>

            {/* Fondo anillos */}
            <circle cx="290" cy="290" r="248" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="290" cy="290" r="185" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="290" cy="290" r="118" fill="rgba(124,28,46,0.08)" stroke="rgba(124,28,46,0.25)" strokeWidth="1.5" />

            {/* Logo central */}
            <text x="290" y="271" textAnchor="middle" fontSize="8"  fill="rgba(255,255,255,0.35)" fontWeight="500" letterSpacing="3">UNIVERSIDAD</text>
            <text x="290" y="289" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.7)"  fontWeight="700" letterSpacing="1">SAN PABLO</text>
            <text x="290" y="305" textAnchor="middle" fontSize="8"  fill="rgba(255,255,255,0.35)" fontWeight="500" letterSpacing="2">GUATEMALA</text>

            {/* Pasillos */}
            <path d="M290 172 L290 140" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
            <path d="M290 408 L290 440" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
            <path d="M172 290 L140 290" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
            <path d="M408 290 L440 290" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />

            {/* Ingresos */}
            <polygon points="290,50 283,63 297,63" fill="rgba(255,255,255,0.5)" />
            <text x="290" y="39" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontWeight="600">INGRESO CANCHAS</text>

            <polygon points="290,530 283,517 297,517" fill="rgba(255,255,255,0.5)" transform="rotate(180,290,524)" />
            <text x="290" y="551" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontWeight="600">INGRESO PRINCIPAL</text>

            {/* Cafetería */}
            <rect x="350" y="462" width="48" height="36" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <text x="374" y="476" textAnchor="middle" fontSize="10">☕</text>
            <text x="374" y="491" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.55)" fontWeight="600">Cafetería</text>

            {/* Lobby USPG */}
            <circle cx="338" cy="120" r="20" fill="rgba(124,28,46,0.25)" stroke="rgba(124,28,46,0.5)" strokeWidth="1" />
            <text x="338" y="117" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontWeight="700">Lobby</text>
            <text x="338" y="126" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.7)">USPG</text>

            {/* Lobby Iglesia */}
            <circle cx="168" cy="458" r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <text x="168" y="455" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.55)" fontWeight="700">Lobby</text>
            <text x="168" y="463" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.55)">Iglesia</text>

            {/* Banco */}
            <rect x="460" y="212" width="68" height="22" rx="4" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.35)" strokeWidth="1" />
            <text x="494" y="227" textAnchor="middle" fontSize="6.5" fill="rgba(147,197,253,0.9)" fontWeight="600">QSA · Banco Ind.</text>

            {/* Salones */}
            {Object.entries(POSICIONES).map(([codigo, pos]) => {
              const esp   = mapaEspacios[codigo]
              const cfg   = getCfg(codigo)
              const isSel = seleccionado === codigo
              const tieneEsp = !!esp

              return (
                <g
                  key={codigo}
                  style={{ cursor: tieneEsp ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (!tieneEsp || pending) return
                    setSeleccionado(isSel ? null : codigo)
                  }}
                >
                  {/* Glow si seleccionado */}
                  {isSel && (
                    <rect x={pos.x - 4} y={pos.y - 4} width={pos.w + 8} height={pos.h + 8}
                      rx="11" fill={cfg.bg} stroke={cfg.color} strokeWidth="1.5" opacity="0.5" />
                  )}

                  {/* Cuerpo */}
                  <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                    rx="8"
                    fill={tieneEsp ? cfg.bg : 'rgba(255,255,255,0.04)'}
                    stroke={isSel ? cfg.color : (tieneEsp ? cfg.border : 'rgba(255,255,255,0.1)')}
                    strokeWidth={isSel ? 2 : 1}
                  />

                  {/* Barra de color top */}
                  <rect x={pos.x + 1} y={pos.y + 1} width={pos.w - 2} height={5}
                    rx="6" fill={tieneEsp ? cfg.color : 'rgba(255,255,255,0.08)'} opacity={tieneEsp ? 0.8 : 0.4} />

                  {/* Código */}
                  <text x={pos.x + pos.w / 2} y={pos.y + 19}
                    textAnchor="middle" fontSize="10" fontWeight="700"
                    fill={tieneEsp ? cfg.color : 'rgba(255,255,255,0.3)'}>
                    {codigo}
                  </text>

                  {/* Sub-label */}
                  {pos.sub && (
                    <text x={pos.x + pos.w / 2} y={pos.y + 31}
                      textAnchor="middle" fontSize="8" fontWeight="500"
                      fill={tieneEsp ? cfg.color : 'rgba(255,255,255,0.2)'} opacity="0.8">
                      {pos.sub}
                    </text>
                  )}

                  {/* Punto indicador estado */}
                  {tieneEsp && (
                    <circle cx={pos.x + pos.w - 7} cy={pos.y + 8} r="3.5" fill={cfg.color} />
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Panel lateral ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* Detalle del seleccionado */}
          {salonSel && (
            <div style={{
              borderRadius: '12px', border: `1px solid ${getCfg(seleccionado).border}`,
              background: getCfg(seleccionado).bg, padding: '0.9rem 1rem',
              marginBottom: '0.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: getCfg(seleccionado).color, letterSpacing: '0.08em', opacity: 0.8 }}>
                    {salonSel.codigo}
                  </p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                    {salonSel.nombre}
                  </p>
                </div>
                <button onClick={() => setSeleccionado(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1, padding: '2px 4px',
                }}>×</button>
              </div>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: '12px',
                border: `1px solid ${getCfg(seleccionado).border}`,
                background: 'rgba(0,0,0,0.2)',
                fontSize: '0.75rem', fontWeight: 600, color: getCfg(seleccionado).color,
                marginBottom: '0.75rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: getCfg(seleccionado).color, display: 'inline-block' }} />
                {getCfg(seleccionado).label}
              </span>

              {salonSel.capacidad && (
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                  👥 {salonSel.capacidad} personas
                  {salonSel.tieneProyector && ' · 📽 Proyector'}
                  {salonSel.tieneInternetWifi && ' · 📶 WiFi'}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {ESTADOS[salonSel.estado]?.next && (
                  <button
                    onClick={() => handleCambiarEstado(seleccionado)}
                    disabled={pending}
                    className="adm-btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                  >
                    Cambiar a {ESTADOS[ESTADOS[salonSel.estado].next]?.label}
                  </button>
                )}
                {salonSel.estado === 'DISPONIBLE' && (
                  <button
                    onClick={() => onNuevaReserva?.(salonSel)}
                    className="adm-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                  >
                    <i className="fa fa-calendar-plus-o" /> Reservar
                  </button>
                )}
                <button
                  onClick={() => onReporte?.(salonSel.id)}
                  className="adm-btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                >
                  <i className="fa fa-wrench" /> Reportar problema
                </button>
              </div>
            </div>
          )}

          {/* Lista de espacios */}
          <p style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Espacios ({espacios.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: salonSel ? 300 : 500, overflowY: 'auto' }}>
            {espacios.length === 0 ? (
              <p style={{ fontSize: '0.78rem', opacity: 0.4, textAlign: 'center', paddingTop: '1rem' }}>
                Sin espacios registrados
              </p>
            ) : (
              espacios.map(esp => {
                const cfg   = ESTADOS[esp.estado] ?? DEFAULT_CFG
                const isSel = seleccionado === esp.codigo
                return (
                  <div
                    key={esp.id}
                    onClick={() => setSeleccionado(isSel ? null : esp.codigo)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.4rem 0.65rem', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${isSel ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                      background: isSel ? cfg.bg : 'rgba(255,255,255,0.02)',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{esp.codigo}</p>
                      <p style={{ fontSize: '0.68rem', opacity: 0.45 }}>{esp.nombre}</p>
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, color: cfg.color,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      padding: '0.12rem 0.4rem', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
