'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

const STATUS_STYLE = {
  AUTORIZADO: { cls: 'lab-carnet-status--ok', icon: 'fa-check-circle', label: 'Acceso autorizado' },
  NO_INSCRITO: { cls: 'lab-carnet-status--bad', icon: 'fa-times-circle', label: 'No inscrito' },
  SIN_MATRICULA: { cls: 'lab-carnet-status--bad', icon: 'fa-times-circle', label: 'Sin matrícula' },
  MOROSO: { cls: 'lab-carnet-status--warn', icon: 'fa-exclamation-circle', label: 'Mensualidades pendientes' },
  RESTRINGIDO: { cls: 'lab-carnet-status--warn', icon: 'fa-ban', label: 'Acceso restringido' },
}

async function generarImagenQr(data) {
  const qrSize = 400
  const pad = 32
  const headerH = 28
  const metaH = 52
  const w = qrSize + pad * 2
  const h = pad + headerH + qrSize + metaH + pad

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = w
  exportCanvas.height = h
  const ctx = exportCanvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#800020'
  ctx.font = '600 14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('USPG · Carné Laboratorios', w / 2, pad + 18)

  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, data.qrPayload, {
    width: qrSize,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
  ctx.drawImage(qrCanvas, pad, pad + headerH)

  ctx.fillStyle = '#334155'
  ctx.font = '600 16px system-ui, sans-serif'
  ctx.fillText(data.nombre || '', w / 2, pad + headerH + qrSize + 28)
  ctx.font = '14px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  if (data.carnet) {
    ctx.fillText(`Carné ${data.carnet}`, w / 2, pad + headerH + qrSize + 50)
  }

  const slug = (data.carnet || 'estudiante').replace(/[^\w-]/g, '-')
  const filename = `carnet-qr-uspg-${slug}.png`

  const blob = await new Promise((resolve, reject) => {
    exportCanvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('No se pudo generar la imagen'))
    }, 'image/png')
  })

  return { blob, filename }
}

export default function CarnetDigitalLab() {
  const canvasRef = useRef(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadMsg, setDownloadMsg] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    fetch('/api/laboratorios/carnet/me', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error || json.message || 'No se pudo cargar el carné')
        return json.data ?? json
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!data?.qrPayload || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, data.qrPayload, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  }, [data])

  async function handleDownloadQr() {
    if (!data?.qrPayload) return
    setDownloading(true)
    setDownloadMsg('')
    try {
      const { blob, filename } = await generarImagenQr(data)
      const file = new File([blob], filename, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Carné QR USPG',
          text: data.nombre,
        })
        setDownloadMsg('Imagen lista en tu dispositivo.')
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      setDownloadMsg('Descarga iniciada.')
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setDownloadMsg(err.message || 'No se pudo guardar la imagen.')
      }
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="lab-carnet-loading">
        <i className="fa fa-spinner fa-spin" aria-hidden="true" /> Cargando carné…
      </div>
    )
  }

  if (error) {
    return <div className="lab-carnet-error">{error}</div>
  }

  const st = STATUS_STYLE[data.status] || STATUS_STYLE.RESTRINGIDO

  return (
    <div className="lab-carnet-card dashboard-card">
      <div className="lab-carnet-header">
        <div>
          <p className="lab-carnet-eyebrow">Carné digital · Laboratorios USPG</p>
          <h2>{data.nombre}</h2>
          <p className="lab-carnet-meta">
            {data.carnet && <span>Carné {data.carnet}</span>}
            {data.semestre && <span>Semestre {data.semestre}</span>}
          </p>
        </div>
        <span className={`lab-carnet-status ${st.cls}`}>
          <i className={`fa ${st.icon}`} aria-hidden="true" /> {st.label}
        </span>
      </div>

      <div className="lab-carnet-body">
        <div className="lab-carnet-qr-col">
          <div className="lab-carnet-qr-wrap">
            <canvas ref={canvasRef} aria-label="Código QR del carné institucional" />
          </div>
          <button
            type="button"
            className="lab-carnet-download"
            onClick={handleDownloadQr}
            disabled={downloading}
          >
            <i
              className={`fa ${downloading ? 'fa-spinner fa-spin' : 'fa-download'}`}
              aria-hidden="true"
            />
            {downloading ? 'Generando…' : 'Descargar QR'}
          </button>
          {downloadMsg && (
            <p className="lab-carnet-download-msg" role="status">
              {downloadMsg}
            </p>
          )}
          <p className="lab-carnet-download-hint">
            Guárdala en tu teléfono para presentarla en el kiosco de seguridad.
          </p>
        </div>
        <div className="lab-carnet-info">
          <ul className="lab-carnet-checklist">
            <li className={data.institucional?.inscrito ? 'ok' : 'no'}>
              <i className={`fa fa-${data.institucional?.inscrito ? 'check' : 'times'}`} /> Inscrito
              (Grupo 1)
            </li>
            <li className={data.institucional?.matriculaSemestreActual ? 'ok' : 'no'}>
              <i
                className={`fa fa-${data.institucional?.matriculaSemestreActual ? 'check' : 'times'}`}
              />{' '}
              Matrícula {data.semestre} (Grupo 6)
            </li>
            <li className={data.institucional?.solvente ? 'ok' : 'no'}>
              <i className={`fa fa-${data.institucional?.solvente ? 'check' : 'times'}`} /> Solvente
            </li>
          </ul>
          <p className="lab-carnet-hint">{data.statusLabel}</p>
          <p className="lab-carnet-hint lab-carnet-hint--muted">
            Presenta este QR en el kiosco de seguridad del laboratorio. El acceso físico y al portal
            dependen de tu estatus institucional en tiempo real.
          </p>
        </div>
      </div>
    </div>
  )
}
