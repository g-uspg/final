'use client'

import { useState } from 'react'
import CarnetDigitalLab from '../components/CarnetDigitalLab'

function parseQr(raw) {
  const t = raw.trim()
  if (t.startsWith('USPG-LAB:')) return t.slice('USPG-LAB:'.length)
  return t
}

export default function LaboratoriosSeguridadPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function verificar(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/laboratorios/qr/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: parseQr(code) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || 'Verificación fallida')
      setResult(json.data ?? json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lab-module lab-kiosco">
      <div className="lab-kiosco-header dashboard-card">
        <h1>
          <i className="fa fa-shield" aria-hidden="true" /> Control de acceso — Laboratorios
        </h1>
        <p>Escanea el carné QR del estudiante para validar inscripción, matrícula y solvencia.</p>
      </div>

      <form className="lab-kiosco-scan dashboard-card" onSubmit={verificar}>
        <label htmlFor="kiosco-qr">Código QR</label>
        <div className="lab-kiosco-row">
          <input
            id="kiosco-qr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="USP-QR-EST-002"
            className="lab-kiosco-input"
            autoFocus
          />
          <button type="submit" className="lab-btn-primary" disabled={loading || !code.trim()}>
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="lab-kiosco-result lab-kiosco-result--deny dashboard-card">
          <i className="fa fa-times-circle" aria-hidden="true" />
          <div>
            <strong>Acceso denegado</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`lab-kiosco-result dashboard-card ${
            result.puedeUsarLab ? 'lab-kiosco-result--ok' : 'lab-kiosco-result--deny'
          }`}
        >
          <i
            className={`fa fa-${result.puedeUsarLab ? 'check-circle' : 'times-circle'}`}
            aria-hidden="true"
          />
          <div>
            <strong>{result.puedeUsarLab ? 'Acceso permitido' : 'Acceso denegado'}</strong>
            <p>{result.estudiante?.nombre}</p>
            <p className="lab-kiosco-meta">
              Carné {result.estudiante?.carnet} · {result.institucional?.semestre}
            </p>
            <ul className="lab-kiosco-list">
              <li>Inscrito: {result.institucional?.inscrito ? 'Sí' : 'No'}</li>
              <li>Matrícula: {result.institucional?.matriculaSemestreActual ? 'Confirmada' : 'No'}</li>
              <li>Solvente: {result.institucional?.solvente ? 'Sí' : 'No'}</li>
            </ul>
            {!result.puedeUsarLab && <p className="lab-kiosco-motivo">{result.motivo}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
