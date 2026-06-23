const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  })
  if (res.status === 404) return []
  if (!res.ok) return []
  return res.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id')
    const basTarih = searchParams.get('bas_tarih')
    const bitTarih = searchParams.get('bit_tarih')
    const limit = searchParams.get('limit') || '5000'

    let saatFark = 0
    if (basTarih && bitTarih) {
      saatFark = (new Date(bitTarih).getTime() - new Date(basTarih).getTime()) / 3600000
    }

    let rows: any[] = []

    if (saatFark > 48) {
      // Long range: use hourly summary
      let filters = `select=*&order=hour_start.desc&limit=${limit}`
      if (deviceId) filters += `&device_id=eq.${deviceId}`
      if (basTarih) filters += `&hour_start=gte.${encodeURIComponent(basTarih)}`
      if (bitTarih) filters += `&hour_start=lte.${encodeURIComponent(bitTarih)}`

      rows = await query(`telemetry_saatlik?${filters}`)

      if (saatFark > 720) {
        // > 30 days: use daily summary
        filters = `select=*&order=day.desc&limit=${limit}`
        if (deviceId) filters += `&device_id=eq.${deviceId}`
        if (basTarih) filters += `&day=gte.${encodeURIComponent(basTarih.split('T')[0])}`
        if (bitTarih) filters += `&day=lte.${encodeURIComponent(bitTarih.split('T')[0])}`

        rows = await query(`telemetry_gunluk?${filters}`)

        return Response.json(rows.map((r: any) => ({
          ...r,
          recorded_at: r.day || r.hour_start,
          sicaklik: r.sicaklik_avg,
          nem: r.nem_avg,
          basinc: r.basinc_avg,
        })))
      }

      return Response.json(rows.map((r: any) => ({
        ...r,
        recorded_at: r.hour_start,
        sicaklik: r.sicaklik_avg,
        nem: r.nem_avg,
        basinc: r.basinc_avg,
        kapi: null,
      })))
    }

    // Short range: use raw telemetry
    let filters = `select=*&order=recorded_at.desc&limit=${limit}`
    if (deviceId) filters += `&device_id=eq.${deviceId}`
    if (basTarih) filters += `&recorded_at=gte.${encodeURIComponent(basTarih)}`
    if (bitTarih) filters += `&recorded_at=lte.${encodeURIComponent(bitTarih)}`

    rows = await query(`telemetry?${filters}`)

    const kapiDurumHesapla = (prev: any, cur: any): boolean | null => {
      if (cur.kapi !== null && cur.kapi !== undefined) return cur.kapi
      if (prev && cur.sicaklik != null && prev.sicaklik != null) {
        const delta = cur.sicaklik - prev.sicaklik
        return delta > 0.5
      }
      return null
    }

    let prev: any = null
    for (const cur of rows) {
      const kd = kapiDurumHesapla(prev, cur)
      if (kd !== null) cur.kapi = kd
      prev = cur
    }

    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
