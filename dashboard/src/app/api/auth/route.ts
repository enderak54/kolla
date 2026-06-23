import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'token gerekli' }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true })

    response.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    if (refresh_token) {
      response.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return response
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })
  return response
}
