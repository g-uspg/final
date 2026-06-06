'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OAuthBridgeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const at = searchParams.get('at')
    const rt = searchParams.get('rt')
    if (!at) {
      router.replace('/login?mode=qr&error=Sesión+OAuth+incompleta')
      return
    }
    localStorage.setItem('access_token', at)
    if (rt) localStorage.setItem('refresh_token', rt)
    try {
      const payload = JSON.parse(atob(at.split('.')[1]))
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: payload.sub,
          email: payload.email,
          nombre: payload.name?.split(' ')[0],
          apellido: payload.name?.split(' ').slice(1).join(' '),
          role: payload.role,
          carnet: payload.carnet,
        })
      )
    } catch {
      /* optional */
    }
    router.replace('/')
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <p>
        <i className="fa fa-spinner fa-spin mr-2" aria-hidden="true" />
        Completando inicio de sesión…
      </p>
    </div>
  )
}

export default function OAuthBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Cargando…
        </div>
      }
    >
      <OAuthBridgeInner />
    </Suspense>
  )
}
