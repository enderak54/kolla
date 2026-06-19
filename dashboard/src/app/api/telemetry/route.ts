const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

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
  return res.json()
}

interface TelemetryData {
  device_id?: string
  sicaklik: number
  nem: number
  basinc: number
  ses: number
  cpu: number
  ram: number
  wifiRssi?: number
  mqttLokal?: number
  mqttAio?: number
  timestamp: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as TelemetryData

    if (body.sicaklik === undefined) {
      const text = await request.text()
      const parts = text.split(',')
      if (parts.length >= 6) {
        body.sicaklik = parseFloat(parts[0])
        body.nem = parseFloat(parts[1])
        body.basinc = parseFloat(parts[2])
        body.ses = parseFloat(parts[3])
        body.cpu = parseFloat(parts[4])
        body.ram = parseInt(parts[5])
      } else {
        return Response.json({ error: 'invalid data' }, { status: 400 })
      }
    }

    body.timestamp = Date.now()

    const deviceId = body.device_id || 'BILINMEYEN'

    await query('POST', 'telemetry', {
      device_id: deviceId,
      sicaklik: body.sicaklik,
      nem: body.nem,
      basinc: body.basinc,
      ses: body.ses,
      cpu: body.cpu,
      ram: body.ram,
      wifi_rssi: body.wifiRssi ?? null,
      mqtt_lokal: body.mqttLokal === 1,
      mqtt_aio: body.mqttAio === 1,
      recorded_at: new Date(body.timestamp).toISOString(),
    })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id') || ''
    const filter = deviceId ? `&device_id=eq.${deviceId}` : ''
    const history: any[] = await query('GET', `telemetry?select=*${filter}&order=recorded_at.desc&limit=100`)

    const mapRow = (r: any) => ({
      sicaklik: r.sicaklik,
      nem: r.nem,
      basinc: r.basinc,
      ses: r.ses,
      cpu: r.cpu,
      ram: r.ram,
      wifiRssi: r.wifi_rssi,
      mqttLokal: r.mqtt_lokal ? 1 : 0,
      mqttAio: r.mqtt_aio ? 1 : 0,
      timestamp: new Date(r.recorded_at).getTime(),
    })

    return Response.json({
      latest: history[0] ? mapRow(history[0]) : null,
      history: [...history].reverse().map(mapRow),
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
