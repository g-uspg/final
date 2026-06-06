export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verificarChallengeQr } from '@/lib/laboratorios/qr-challenge'
import { completarLoginQr } from '@/lib/laboratorios/qr-login'

/** GET /api/auth/google/callback — Callback OAuth tras login QR */
export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const loginUrl = new URL('/login', baseUrl)
  loginUrl.searchParams.set('mode', 'qr')

  try {
    const code = request.nextUrl.searchParams.get('code')
    const challenge = request.nextUrl.searchParams.get('state')
    const oauthError = request.nextUrl.searchParams.get('error')

    if (oauthError || !code || !challenge) {
      loginUrl.searchParams.set('error', oauthError || 'Autenticación Google cancelada.')
      return NextResponse.redirect(loginUrl)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      loginUrl.searchParams.set('error', tokenData.error_description || 'Error OAuth Google')
      return NextResponse.redirect(loginUrl)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    const email = profile.email?.toLowerCase()

    if (!email?.endsWith('@uspg.edu.gt')) {
      loginUrl.searchParams.set('error', 'Solo cuentas @uspg.edu.gt están permitidas.')
      return NextResponse.redirect(loginUrl)
    }

    const qrCode = verificarChallengeQr(challenge)
    const result = await completarLoginQr({ qrCode, email })

    if (!result.ok) {
      loginUrl.searchParams.set('error', result.error)
      return NextResponse.redirect(loginUrl)
    }

    const redirect = new URL('/login/oauth-bridge', baseUrl)
    redirect.searchParams.set('at', result.access_token)
    redirect.searchParams.set('rt', result.refresh_token)
    return NextResponse.redirect(redirect)
  } catch (err) {
    console.error('[auth/google/callback]', err)
    loginUrl.searchParams.set('error', err.message || 'Error en login Google')
    return NextResponse.redirect(loginUrl)
  }
}
