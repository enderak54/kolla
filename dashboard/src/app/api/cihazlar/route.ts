const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : method === 'DELETE' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return method === 'DELETE' ? null : res.json()
}

export async function GET() {
  try {
    const [rows, kayitliCihazlar, thresholds] = await Promise.all([
      query('GET', 'telemetry?select=*&order=recorded_at.desc&limit=1000') as any[],
      query('GET', 'devices?select=device_id,name,location') as any[],
      query('GET', 'thresholds?select=device_id,metric') as any[],
    ])

    const kayitliSet = new Set(kayitliCihazlar.map((d: any) => d.device_id))
    const deviceInfo = new Map(kayitliCihazlar.map((d: any) => [d.device_id, { name: d.name, location: d.location }]))
    const thresholdSet = new Set(thresholds.map((t: any) => `${t.device_id}:${t.metric}`))

    const deviceMap = new Map<string, any>()

    for (const r of rows) {
      const id = r.device_id || 'BILINMEYEN'
      if (!deviceMap.has(id)) {
        deviceMap.set(id, {
          sonGuncelleme: new Date(r.recorded_at).getTime(),
          sicaklik: r.sicaklik,
          nem: r.nem,
          wifiRssi: r.wifi_rssi,
          mqttLokal: r.mqtt_lokal,
          mqttAio: r.mqtt_aio,
          kayitSayisi: 1,
          mac: r.mac || null,
        })
      } else {
        const d = deviceMap.get(id)!
        d.kayitSayisi++
      }
    }

    const cihazlar = Array.from(deviceMap.entries()).map(([device_id, data]) => {
      const info = deviceInfo.get(device_id)
      return {
        device_id,
        ...data,
        ad: info?.name || null,
        konum: info?.location || null,
        kayitli: kayitliSet.has(device_id),
        esikVar: thresholdSet.has(`${device_id}:sicaklik`),
        aktif: (Date.now() - data.sonGuncelleme) < 15000,
      }
    })

    return Response.json(cihazlar)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    await query('DELETE', `thresholds?device_id=eq.${deviceId}`)
    await query('DELETE', `telemetry?device_id=eq.${deviceId}`)
    await query('DELETE', `devices?device_id=eq.${deviceId}`)

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const deviceId = body.device_id
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const existing = await query('GET', `devices?device_id=eq.${deviceId}&select=device_id`) as any[]
    if (existing.length > 0) {
      await query('PATCH', `devices?device_id=eq.${deviceId}`, { name: body.ad || deviceId, location: body.location || '' })
    } else {
      await query('POST', 'devices', { device_id: deviceId, name: body.ad || deviceId, location: body.location || '' })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
