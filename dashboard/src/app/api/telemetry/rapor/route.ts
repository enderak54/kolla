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

    let filters = `select=*&order=recorded_at.desc&limit=${limit}`
    if (deviceId) filters += `&device_id=eq.${deviceId}`
    if (basTarih) filters += `&recorded_at=gte.${encodeURIComponent(basTarih)}`
    if (bitTarih) filters += `&recorded_at=lte.${encodeURIComponent(bitTarih)}`

    const rows = await query(`telemetry?${filters}`)
    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
