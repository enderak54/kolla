const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

const headers = {
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
  'Content-Type': 'application/json',
}

async function supabase(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers, Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
  return method === 'DELETE' ? null : res.json()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, sensors } = body

    if (!device_id || !Array.isArray(sensors) || sensors.length === 0)
      return Response.json({ error: 'device_id ve sensors[] gerekli' }, { status: 400 })

    const now = new Date().toISOString()
    const rows = sensors.map((s: any) => ({
      device_id,
      sensor_id: s.sensor_id,
      metric: s.metric,
      value: s.value,
      recorded_at: now,
    }))

    await supabase('POST', 'sensor_telemetry', rows)
    return Response.json({ ok: true, kayit: rows.length })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    const sensorId = url.searchParams.get('sensor_id')
    const limit = url.searchParams.get('limit') || '100'

    let filter = `select=*&order=recorded_at.desc&limit=${limit}`
    if (deviceId) filter += `&device_id=eq.${encodeURIComponent(deviceId)}`
    if (sensorId) filter += `&sensor_id=eq.${encodeURIComponent(sensorId)}`

    const rows: any[] = await supabase('GET', `sensor_telemetry?${filter}`)

    const groups: Record<string, any> = {}
    const reversed = [...rows].reverse()
    for (const r of reversed) {
      const key = `${r.device_id}-${r.sensor_id}`
      if (!groups[key]) groups[key] = { device_id: r.device_id, sensor_id: r.sensor_id, metrics: {}, history: [] }
      groups[key].metrics[r.metric] = r.value
      groups[key].history.push({ metric: r.metric, value: r.value, recorded_at: r.recorded_at })
    }

    return Response.json({
      sensors: Object.values(groups),
      raw: reversed,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
