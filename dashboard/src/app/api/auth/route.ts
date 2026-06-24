import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auditLog } from '@/lib/audit'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getUserFromToken(access_token: string) {
  const { data } = await getSupabaseAdmin().auth.getUser(access_token)
  return data.user
}

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'token gerekli' }, { status: 400 })
    }

    const user = await getUserFromToken(access_token)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    if (user) {
      await auditLog('LOGIN', 'auth', user.id, { provider: user.app_metadata?.provider }, user.id, user.email ?? undefined, ip)
    }

    const response = NextResponse.json({ ok: true })

    response.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    if (refresh_token) {
      response.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    return response
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const access_token = request.cookies.get('sb-access-token')?.value
  const user = access_token ? await getUserFromToken(access_token) : null
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  if (user) {
    await auditLog('LOGOUT', 'auth', user.id, {}, user.id, user.email ?? undefined, ip)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })
  return response
}
