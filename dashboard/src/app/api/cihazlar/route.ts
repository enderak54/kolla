const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(method: string, path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function GET() {
  try {
    const rows: any[] = await query('GET', 'telemetry?select=*&order=recorded_at.desc&limit=1000')

    const deviceMap = new Map<string, { sonGuncelleme: number; sicaklik: number; nem: number; wifiRssi: number | null; mqttLokal: boolean; mqttAio: boolean; kayitSayisi: number; mac: string | null }>()

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

    const cihazlar = Array.from(deviceMap.entries()).map(([device_id, data]) => ({
      device_id,
      ...data,
      aktif: (Date.now() - data.sonGuncelleme) < 15000,
    }))

    return Response.json(cihazlar)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
