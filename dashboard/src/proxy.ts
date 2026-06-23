import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'
const publicPaths = ['/giris', '/api/auth']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('sb-access-token')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/giris', request.url))
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) throw new Error('invalid token')
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/giris', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)'],
}
