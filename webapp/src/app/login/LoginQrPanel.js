'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function parseQrInput(raw) {
  const text = raw.trim()
  if (!text) return ''
  if (text.startsWith('USPG-LAB:')) return text.slice('USPG-LAB:'.length)
  try {
    const url = new URL(text)
    const parts = url.pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || text
  } catch {
    return text
  }
}

export default function LoginQrPanel({ initialError = '' }) {
  const router = useRouter()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [code, setCode] = useState('')
  const [step, setStep] = useState('scan')
  const [challenge, setChallenge] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (!cameraOn || !videoRef.current) return undefined
    let cancelled = false
    let detector
    let intervalId

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        if ('BarcodeDetector' in window) {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          intervalId = setInterval(async () => {
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes[0]?.rawValue) {
                setCode(parseQrInput(codes[0].rawValue))
                stopCamera()
              }
            } catch {
              /* ignore frame errors */
            }
          }, 600)
        }
      } catch {
        setError('No se pudo acceder a la cámara. Ingresa el código manualmente.')
        stopCamera()
      }
    }

    start()
    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [cameraOn, stopCamera])

  async function handleInit(e) {
    e?.preventDefault()
    setError('')
    setLoading(true)
    const parsed = parseQrInput(code)
    try {
      const res = await fetch('/api/auth/qr/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: parsed }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || 'QR no válido')

      const payload = json.data ?? json
      setChallenge(payload.challenge)
      setProfile(payload)
      setGoogleEnabled(Boolean(payload.googleEnabled))
      setStep('confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(instEmail) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/qr/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, email: instEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || 'No se pudo iniciar sesión')

      const data = json.data ?? json
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token || '')
      localStorage.setItem('user', JSON.stringify(data.user || {}))
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      router.push(redirect || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    if (!challenge) return
    window.location.href = `/api/auth/google?challenge=${encodeURIComponent(challenge)}`
  }

  if (step === 'confirm' && profile) {
    return (
      <div className="login-qr-panel">
        <div className="login-qr-profile">
          <div className="login-qr-avatar">
            <i className="fa fa-id-card" aria-hidden="true" />
          </div>
          <div>
            <p className="login-qr-eyebrow">Carné verificado</p>
            <h3>{profile.nombre}</h3>
            <p className="login-qr-sub">
              {profile.carnet ? `Carné ${profile.carnet} · ` : ''}
              {profile.emailHint}
            </p>
          </div>
        </div>

        <p className="login-qr-text">
          Confirma tu identidad con tu correo institucional <strong>@uspg.edu.gt</strong>
          {googleEnabled ? ' vía Google.' : '.'}
        </p>

        {googleEnabled && (
          <Button
            type="button"
            className="login-qr-google w-full h-12 mb-3"
            onClick={handleGoogle}
            disabled={loading}
          >
            <i className="fa fa-google" aria-hidden="true" /> Continuar con Google
          </Button>
        )}

        {!googleEnabled && (
          <>
            <div className="login-qr-divider">
              <span>Correo institucional</span>
            </div>
            <div className="space-y-3">
              <Label htmlFor="qr-email">Correo @uspg.edu.gt</Label>
              <Input
                id="qr-email"
                type="email"
                placeholder="est002@uspg.edu.gt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
              <Button
                type="button"
                className="w-full h-12 bg-[#800020] hover:bg-[#600018]"
                disabled={loading || !email.trim()}
                onClick={() => handleComplete(email.trim())}
              >
                {loading ? 'Verificando…' : 'Confirmar e ingresar'}
              </Button>
            </div>
          </>
        )}

        {error && <div className="login-qr-error">{error}</div>}

        <button type="button" className="login-qr-back" onClick={() => setStep('scan')}>
          ← Escanear otro QR
        </button>
      </div>
    )
  }

  return (
    <div className="login-qr-panel">
      <p className="login-qr-text">
        Escanea el QR de tu carné institucional o pégalo abajo. Luego confirmarás con tu correo
        @uspg.edu.gt.
      </p>

      {cameraOn && (
        <div className="login-qr-camera">
          <video ref={videoRef} playsInline muted aria-label="Vista previa cámara QR" />
        </div>
      )}

      <form onSubmit={handleInit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-code">Código del carné</Label>
          <Input
            id="qr-code"
            placeholder="USP-QR-EST-002"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 font-mono text-sm"
            autoComplete="off"
          />
        </div>

        <div className="login-qr-actions">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => (cameraOn ? stopCamera() : setCameraOn(true))}
          >
            <i className={`fa fa-${cameraOn ? 'stop' : 'camera'}`} aria-hidden="true" />{' '}
            {cameraOn ? 'Detener cámara' : 'Usar cámara'}
          </Button>
          <Button
            type="submit"
            className="h-11 flex-1 bg-[#800020] hover:bg-[#600018]"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Validando…' : 'Continuar'}
          </Button>
        </div>
      </form>

      {error && <div className="login-qr-error">{error}</div>}

      <p className="login-qr-demo-hint">
        Demo: <code>USP-QR-EST-002</code> (est002@uspg.edu.gt)
      </p>
      <p className="login-qr-phase-hint">
        El acceso con carné QR y Google institucional estará disponible en la Fase 2.
      </p>
    </div>
  )
}
