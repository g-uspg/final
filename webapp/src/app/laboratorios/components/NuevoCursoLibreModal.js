'use client'

import { useState } from 'react'
import { crearCursoLibre } from '../actions'
import { TIPO_CURSO_LIBRE_LABEL } from '@/lib/laboratorios/constants'

export default function NuevoCursoLibreModal({ laboratorios, onClose = () => {} }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    const result = await crearCursoLibre(formData)
    if (result?.success) {
      onClose('Curso libre creado correctamente.', 'success')
    } else {
      setError(result?.error || 'Error al crear curso')
      setLoading(false)
    }
  }

  return (
    <div className="lab-modal-overlay" onClick={() => onClose()}>
      <div className="lab-modal lab-modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold mb-4">Nuevo curso libre</h3>
        {error && (
          <div className="mb-3 p-3 text-sm text-red-400 border border-red-500/30 rounded-lg">{error}</div>
        )}

        <form action={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Código</label>
              <input name="codigo" required placeholder="ING-LLM-2026" className="lab-input" />
            </div>
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Tipo</label>
              <select name="tipo" className="lab-input" defaultValue="INGLES_LLM">
                {Object.entries(TIPO_CURSO_LIBRE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Nombre</label>
            <input name="nombre" required placeholder="Práctica de inglés con LLM" className="lab-input" />
          </div>

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              className="lab-input"
              placeholder="Requisito de graduación. Certificado avalado por USPG..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Laboratorio</label>
              <select name="laboratorioId" className="lab-input" required>
                {laboratorios.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Duración (min)</label>
              <input type="number" name="duracionMinutos" min={30} defaultValue={90} className="lab-input" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">Exámenes al año</label>
            <input type="number" name="examenesAnuales" min={0} defaultValue={4} className="lab-input" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="usaLLM" defaultChecked />
            Usa asistente LLM para práctica conversacional
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="certificadoUSPG" defaultChecked />
            Certificado avalado por la Universidad
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => onClose()} className="lab-btn-ghost">Cancelar</button>
            <button type="submit" className="lab-btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
