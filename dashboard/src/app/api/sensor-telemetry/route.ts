const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

const headers = {
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
  'Content-Type': 'application/json',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, sensors } = body

    if (!device_id || !Array.isArray(sensors) || sensors.length === 0)
      return Response.json({ error: 'device_id ve sensors[] gerekli' }, { status: 400 })

    const sensorObj: Record<string, number> = {}
    for (const s of sensors) {
      sensorObj[s.metric] = s.value
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/kolla_ayarlar`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: `son_sensor_${device_id}`, value: JSON.stringify(sensorObj), type: 'sensor' }),
    })
    if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }

    return Response.json({ ok: true, sensors: sensorObj })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')

    let filter = `select=*`
    if (deviceId) filter += `&key=eq.son_sensor_${encodeURIComponent(deviceId)}`

    const res = await fetch(`${SUPABASE_URL}/rest/v1/kolla_ayarlar?${filter}`, {
      headers,
    })
    if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }

    const rows: any[] = await res.json()
    const obj: any = {}
    for (const r of rows) {
      try { obj[r.key.replace('son_sensor_', '')] = JSON.parse(r.value) } catch {}
    }

    return Response.json(obj)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
