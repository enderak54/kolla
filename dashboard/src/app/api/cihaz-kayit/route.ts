const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function findTable(deviceId: string) {
  for (const table of ['cihazlar', 'devices']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?device_id=eq.${deviceId}&select=device_id&limit=1`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    })
    if (res.ok) return table
  }
  return null
}

async function writeRow(method: string, table: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
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

    const table = await findTable(deviceId)
    if (!table) {
      return Response.json({ error: 'cihazlar tablosu bulunamadi, Supabase\'den ekleyin' }, { status: 500 })
    }

    if (table === 'devices') {
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/devices?device_id=eq.${deviceId}&select=device_id`, {
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` },
      }).then(r => r.json())

      if (!existing || existing.length === 0) {
        await writeRow('POST', 'devices', {
          device_id: deviceId,
          name: body.ad || deviceId,
          location: body.location || '',
        })
      } else {
        await writeRow('PATCH', `devices?device_id=eq.${deviceId}`, {
          name: body.ad || deviceId,
        })
      }
    } else {
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/cihazlar?device_id=eq.${deviceId}&select=device_id`, {
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` },
      }).then(r => r.json())

      if (!existing || existing.length === 0) {
        await writeRow('POST', 'cihazlar', {
          device_id: deviceId,
          ad: body.ad || deviceId,
          firmware_version: body.firmware_version || '',
          sensor_config: body.sensor_config || {},
          son_guncelleme: new Date().toISOString(),
        })
      } else {
        await writeRow('PATCH', `cihazlar?device_id=eq.${deviceId}`, {
          firmware_version: body.firmware_version,
          sensor_config: body.sensor_config,
          son_guncelleme: new Date().toISOString(),
        })
      }
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
