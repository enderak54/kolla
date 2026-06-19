const SUPABASE_URL = 'https://wnbrltpughawrvdmeqhk.supabase.co'

async function query(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  if (method === 'DELETE') return null
  return res.json()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const rows = await query('GET', `cihazlar?device_id=eq.${deviceId}&limit=1`)
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'cihaz bulunamadi' }, { status: 404 })
    }
    return Response.json(rows[0])
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const body = await request.json()
    delete body.device_id

    await query('PATCH', `cihazlar?device_id=eq.${deviceId}`, body)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
