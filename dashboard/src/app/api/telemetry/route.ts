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
  if (method === 'POST') return null
  return res.json()
}

interface TelemetryData {
  device_id?: string
  mac?: string
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
  kapi?: boolean
  gaz_genel?: number
  sensors?: { sensor_id: string; metric: string; value: number }[]
}

export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (!raw || raw.length === 0) {
      return Response.json({ error: 'empty body', contentType: request.headers.get('content-type') }, { status: 400 })
    }

    let body: TelemetryData
    try {
      body = JSON.parse(raw)
    } catch {
      const parts = raw.split(',')
      if (parts.length >= 6) {
        body = {
          sicaklik: parseFloat(parts[0]),
          nem: parseFloat(parts[1]),
          basinc: parseFloat(parts[2]),
          ses: parseFloat(parts[3]),
          cpu: parseFloat(parts[4]),
          ram: parseInt(parts[5]),
          timestamp: Date.now(),
        }
        if (parts.length >= 8) body.gaz_genel = parseInt(parts[7])
      } else {
        return Response.json({ error: 'invalid data' }, { status: 400 })
      }
    }

    body.timestamp = Date.now()

    const deviceId = body.device_id || 'KOLLA-000001'

    const payload: Record<string, any> = {
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
    }
    if (body.mac) payload.mac = body.mac
    if (body.kapi !== undefined) payload.kapi = body.kapi
    if (body.gaz_genel !== undefined) payload.gaz_genel = body.gaz_genel

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const gazAlani = (k: string) => ['gaz_genel','lpg','co','duman','metan','hidrojen'].includes(k)
    const sensorObj: Record<string, any> = {}
    if (Array.isArray(body.sensors)) {
      for (const s of body.sensors) {
        if (s && s.metric) sensorObj[s.metric] = s.value
      }
    }
    for (const k of Object.keys(body)) {
      if (gazAlani(k) && typeof (body as any)[k] === 'number') sensorObj[k] = (body as any)[k]
    }

    if (Object.keys(sensorObj).length > 0 && anonKey) {
      const anonHeaders = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' }
      fetch(`${SUPABASE_URL}/rest/v1/ayarlar`, {
        method: 'POST',
        headers: { ...anonHeaders, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ key: `son_sensor_${deviceId}`, value: JSON.stringify(sensorObj), type: 'sensor' }),
      }).catch(() => {})
      ;(async () => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/ayarlar?key=eq.${encodeURIComponent('sensor_gecmis_' + deviceId)}&select=value`, { headers: anonHeaders })
          let gecmis: any[] = []
          if (res.ok) {
            const rows = await res.json()
            if (rows.length > 0) try { gecmis = JSON.parse(rows[0].value) } catch {}
          }
          gecmis.push({ t: new Date().toISOString(), ...sensorObj })
          if (gecmis.length > 500) gecmis = gecmis.slice(-500)
          await fetch(`${SUPABASE_URL}/rest/v1/ayarlar`, {
            method: 'POST',
            headers: { ...anonHeaders, Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ key: `sensor_gecmis_${deviceId}`, value: JSON.stringify(gecmis), type: 'sensor' }),
          })
        } catch {}
      })()
    }

    await query('POST', 'telemetry', payload)

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
      device_id: r.device_id,
      mac: r.mac,
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
      kapi: r.kapi ?? null,
      gaz_genel: r.gaz_genel ?? null,
    })

    const reversed = [...history].reverse().map(mapRow)

    const kapiDurumHesapla = (prev: TelemetryData | null, cur: TelemetryData): boolean | null => {
      if (cur.kapi !== null && cur.kapi !== undefined) return cur.kapi
      if (prev && cur.sicaklik !== undefined && prev.sicaklik !== undefined) {
        const delta = cur.sicaklik - prev.sicaklik
        return delta > 0.5
      }
      return null
    }

    let prev: TelemetryData | null = null
    for (const cur of reversed) {
      const kd = kapiDurumHesapla(prev, cur)
      if (kd !== null) cur.kapi = kd
      prev = cur
    }

    const latest = reversed[reversed.length - 1] || null

    return Response.json({
      latest,
      history: reversed,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
