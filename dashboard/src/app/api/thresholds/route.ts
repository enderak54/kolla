const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function supabase(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    let path = 'kolla_thresholds?select=*'
    if (deviceId && deviceId !== 'ALL') path += `&device_id=eq.${encodeURIComponent(deviceId)}`
    const data = await supabase('GET', path)
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { metric, min_val, max_val, enabled, device_id } = await request.json()
    const did = device_id || 'KOLLA-000001'

    const existing = await supabase('GET', `kolla_thresholds?device_id=eq.${did}&metric=eq.${metric}&select=id`)

    if (Array.isArray(existing) && existing.length > 0) {
      await supabase('PATCH', `kolla_thresholds?device_id=eq.${did}&metric=eq.${metric}`, {
        min_val, max_val, enabled, updated_at: new Date().toISOString(),
      })
    } else {
      await supabase('POST', 'kolla_thresholds', {
        device_id: did, metric, min_val, max_val, enabled, updated_at: new Date().toISOString(),
      })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}