import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface TelemetryData {
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

    const { error } = await getSupabase().from('telemetry').insert({
      device_id: 'KOLLA-001',
      sicaklik: body.sicaklik,
      nem: body.nem,
      basinc: body.basinc,
      ses: body.ses,
      cpu: body.cpu,
      ram: body.ram,
      wifi_rssi: body.wifiRssi,
      mqtt_lokal: body.mqttLokal === 1,
      mqtt_aio: body.mqttAio === 1,
      recorded_at: new Date(body.timestamp).toISOString(),
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const sb = getSupabase()
    const { data: latest, error: err1 } = await sb
      .from('telemetry')
      .select('*')
      .eq('device_id', 'KOLLA-001')
      .order('recorded_at', { ascending: false })
      .limit(1)

    const { data: history, error: err2 } = await sb
      .from('telemetry')
      .select('*')
      .eq('device_id', 'KOLLA-001')
      .order('recorded_at', { ascending: false })
      .limit(100)

    if (err1 || err2) {
      return Response.json({ error: (err1 || err2)?.message }, { status: 500 })
    }

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
      latest: latest?.[0] ? mapRow(latest[0]) : null,
      history: (history || []).map(mapRow).reverse(),
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
