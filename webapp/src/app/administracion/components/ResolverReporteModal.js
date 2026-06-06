'use client'
import { useState, useTransition } from 'react'
import { actualizarEstadoReporte } from '../actions'

export default function ResolverReporteModal({ reporte, onClose }) {
    const [pending, startTransition] = useTransition()
    const [notas, setNotas] = useState('')
    const [nuevoEstado, setNuevoEstado] = useState(
        reporte.estado === 'ABIERTO' ? 'EN_PROCESO' : 'RESUELTO'
    )

    const OPCIONES = [
        reporte.estado === 'ABIERTO' && {
            value: 'EN_PROCESO', label: 'Marcar en proceso',
            desc: 'Se está trabajando en ello', color: '#f59e0b',
        },
        { value: 'RESUELTO', label: 'Marcar como resuelto',
            desc: 'El problema fue corregido', color: '#22c55e' },
        { value: 'CERRADO',  label: 'Cerrar sin resolver',
            desc: 'No aplica o fue descartado', color: '#6b7280' },
    ].filter(Boolean)

    const handleSubmit = () => {
        startTransition(async () => {
            const result = await actualizarEstadoReporte(reporte.id, nuevoEstado, notas)
            if (result.success) {
                onClose(`Reporte actualizado a "${nuevoEstado}".`, 'success')
            } else {
                onClose(result.error, 'error')
            }
        })
    }

    return (
        <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="adm-modal" style={{ maxWidth: '480px' }}>
                <div className="adm-modal-header">
                    <h2><i className="fa fa-wrench" /> Resolver Reporte</h2>
                    <button type="button" className="adm-modal-close" onClick={() => onClose()}>
                        <i className="fa fa-times" />
                    </button>
                </div>

                <div className="adm-modal-body">
                    {/* Info del reporte */}
                    <div className="adm-espacio-info" style={{ marginBottom: '16px' }}>
                        <i className="fa fa-info-circle" />
                        <span>
              <strong>{reporte.titulo}</strong>
                            {reporte.espacio && ` · ${reporte.espacio.nombre}`}
                            {reporte._reportadoPorId && (
                                <span style={{ opacity: 0.7 }}>
                  {' '}· Reportado por {reporte._reportadoPorId.first_name} {reporte._reportadoPorId.last_name}
                </span>
                            )}
            </span>
                    </div>

                    {/* Selección de estado */}
                    <div className="adm-form-group">
                        <label className="adm-label">Acción *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {OPCIONES.map(op => (
                                <button
                                    key={op.value}
                                    type="button"
                                    onClick={() => setNuevoEstado(op.value)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 14px', borderRadius: '8px', textAlign: 'left',
                                        border: nuevoEstado === op.value
                                            ? `1.5px solid ${op.color}`
                                            : '1.5px solid var(--adm-border, rgba(255,255,255,0.1))',
                                        background: nuevoEstado === op.value
                                            ? `${op.color}18`
                                            : 'transparent',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: op.color, flexShrink: 0,
                                        boxShadow: nuevoEstado === op.value ? `0 0 0 3px ${op.color}33` : 'none',
                                    }} />
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{op.label}</p>
                                        <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>{op.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notas de resolución — MEJORA 3 */}
                    <div className="adm-form-group">
                        <label className="adm-label">
                            Notas de resolución
                            {nuevoEstado === 'RESUELTO' && <span style={{ opacity: 0.6, marginLeft: 4 }}>(recomendado)</span>}
                        </label>
                        <textarea
                            className="adm-input adm-textarea"
                            rows={3}
                            placeholder={
                                nuevoEstado === 'RESUELTO'
                                    ? 'Ej: Se reemplazó el filtro del A/C, equipo operativo.'
                                    : nuevoEstado === 'EN_PROCESO'
                                        ? 'Ej: Técnico asignado, llegará el lunes.'
                                        : 'Motivo del cierre...'
                            }
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
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
                            : <><i className="fa fa-check" /> Confirmar</>}
                    </button>
                </div>
            </div>
        </div>
    )
}