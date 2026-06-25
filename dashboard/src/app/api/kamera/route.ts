const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function sb(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 404) return null
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
  return res.json()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id') || ''
    const limit = url.searchParams.get('limit') || '50'
    let filter = `select=*&order=captured_at.desc&limit=${limit}`
    if (deviceId) filter += `&device_id=eq.${deviceId}`
    const rows = await sb('GET', `kolla_kamera_kayitlari?${filter}`)
    return Response.json(rows || [])
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id } = body
    if (!device_id) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const payload = {
      device_id,
      dosya_adi: body.dosya_adi || `snap_${Date.now()}.jpg`,
      storage_path: body.storage_path || '',
      boyut: body.boyut || 0,
      genislik: body.genislik || null,
      yukseklik: body.yukseklik || null,
      tetikleyici: body.tetikleyici || 'manuel',
      etiket: body.etiket || '',
      captured_at: new Date().toISOString(),
    }
    const row = await sb('POST', 'kolla_kamera_kayitlari', payload)
    return Response.json({ ok: true, id: Array.isArray(row) ? row[0]?.id : row?.id })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'id gerekli' }, { status: 400 })
    const rows = await sb('GET', `kolla_kamera_kayitlari?id=eq.${id}&select=storage_path`)
    if (rows && rows.length > 0) {
      const path = rows[0].storage_path
      await fetch(`${SUPABASE_URL}/storage/v1/object/kamera/${path}`, {
        method: 'DELETE',
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      }).catch(() => {})
    }
    await sb('DELETE', `kolla_kamera_kayitlari?id=eq.${id}`)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
