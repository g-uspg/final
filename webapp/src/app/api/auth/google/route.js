export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/** GET /api/auth/google?challenge=... — Redirige a Google OAuth (dominio @uspg.edu.gt) */
export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          'Google OAuth no configurado. Usa correo institucional o define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',
      },
      { status: 503 }
    )
  }

  const challenge = request.nextUrl.searchParams.get('challenge')
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge QR requerido.' }, { status: 400 })
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: challenge,
    hd: 'uspg.edu.gt',
    prompt: 'select_account',
    access_type: 'online',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
