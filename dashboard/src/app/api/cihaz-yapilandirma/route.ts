const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function tryQuery(method: string, path: string, body?: any) {
  const tables = ['cihazlar', 'devices']
  for (const table of tables) {
    const p = path.includes('?') ? path.replace(/^[^?]+/, table) : table
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
      method,
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) {
      if (method === 'DELETE') return null
      return res.json()
    }
    const text = await res.text()
    if (res.status === 404 && text.includes('PGRST205')) continue
    throw new Error(`${res.status}: ${text}`)
  }
  throw new Error('no suitable table found')
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const rows = await tryQuery('GET', `cihazlar?device_id=eq.${deviceId}&limit=1`)
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'cihaz bulunamadi' }, { status: 404 })
    }
    const row = rows[0]
    if (row.name && !row.ad) row.ad = row.name
    return Response.json(row)
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

    await tryQuery('PATCH', `cihazlar?device_id=eq.${deviceId}`, body)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
