const SUPABASE_URL = 'https://wnbrltpughawrvdmeqhk.supabase.co'

async function query(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return true
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deviceId = body.device_id
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const existing = await fetch(`${SUPABASE_URL}/rest/v1/cihazlar?device_id=eq.${deviceId}&select=device_id`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    }).then(r => r.json())

    if (!existing || existing.length === 0) {
      await query('POST', 'cihazlar', {
        device_id: deviceId,
        ad: body.ad || deviceId,
        firmware_version: body.firmware_version || '',
        sensor_config: body.sensor_config || {},
        son_guncelleme: new Date().toISOString(),
      })
    } else {
      await query('PATCH', `cihazlar?device_id=eq.${deviceId}`, {
        firmware_version: body.firmware_version,
        sensor_config: body.sensor_config,
        son_guncelleme: new Date().toISOString(),
      })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
