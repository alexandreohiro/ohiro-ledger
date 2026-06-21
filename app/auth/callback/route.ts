import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  // PKCE flow (email/password sign-in via code)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Magic link / OAuth — access_token chega como hash fragment no client.
  // Detectamos se há token nos search params (alguns providers enviam como query)
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const type = searchParams.get('type')

  if (accessToken && (type === 'magiclink' || type === 'recovery' || type === 'signup')) {
    const supabase = await createClient()
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Hash fragment fallback: redireciona para página client-side que processa o hash
  return NextResponse.redirect(`${origin}/auth/confirm${request.nextUrl.search}`)
}
