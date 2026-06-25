import { auditLog } from '@/lib/audit'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

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
    const result = await Promise.all([
      query('GET', 'kolla_telemetry?select=*&order=recorded_at.desc&limit=1000'),
      query('GET', 'kolla_devices?select=device_id,name,location'),
      query('GET', 'kolla_thresholds?select=device_id,metric'),
      query('GET', 'ayarlar?select=key,value&key=like.son_sensor_*'),
    ])
    const rows = result[0] as any[]
    const kayitliCihazlar = result[1] as any[]
    const thresholds = result[2] as any[]
    const sonSensorler = result[3] as any[]

    const gazMap = new Map<string, number>()
    for (const s of sonSensorler || []) {
      const deviceId = s.key.replace('son_sensor_', '')
      try {
        const data = JSON.parse(s.value)
        if (data.gaz_genel != null) gazMap.set(deviceId, data.gaz_genel)
      } catch {}
    }

    const kayitliSet = new Set(kayitliCihazlar.map((d: any) => d.device_id))
    const deviceInfo = new Map(kayitliCihazlar.map((d: any) => [d.device_id, { name: d.name, location: d.location }]))
    const thresholdSet = new Set(thresholds.map((t: any) => `${t.device_id}:${t.metric}`))

    const deviceMap = new Map<string, any>()

    for (const r of rows) {
      const id = r.device_id || 'BILINMEYEN'
      if (id === 'BILINMEYEN') continue
      const gaz = gazMap.get(id) ?? null
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
          gazGenel: gaz,
        })
      } else {
        const d = deviceMap.get(id)!
        d.kayitSayisi++
        if (gaz != null) d.gazGenel = gaz
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
        esikVar: ['sicaklik', 'gaz_genel', 'lpg', 'co', 'duman', 'metan', 'hidrojen'].some(m => thresholdSet.has(`${device_id}:${m}`)),
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

    await query('DELETE', `kolla_thresholds?device_id=eq.${deviceId}`)
    await query('DELETE', `kolla_telemetry?device_id=eq.${deviceId}`)
    await query('DELETE', `kolla_devices?device_id=eq.${deviceId}`)

    const ip = getClientIp(request)
    await auditLog('DEVICE_DELETE', 'devices', deviceId, {}, undefined, undefined, ip)

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

    const existing = await query('GET', `kolla_devices?device_id=eq.${deviceId}&select=device_id`) as any[]
    if (existing.length > 0) {
      await query('PATCH', `kolla_devices?device_id=eq.${deviceId}`, { name: body.ad || deviceId, location: body.location || '' })
      const ip = getClientIp(request)
      await auditLog('DEVICE_UPDATE', 'devices', deviceId, { ad: body.ad, location: body.location }, undefined, undefined, ip)
    } else {
      await query('POST', 'kolla_devices', { device_id: deviceId, name: body.ad || deviceId, location: body.location || '' })
      const ip = getClientIp(request)
      await auditLog('DEVICE_CREATE', 'devices', deviceId, { ad: body.ad, location: body.location }, undefined, undefined, ip)
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
