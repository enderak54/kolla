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
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
  return res.json()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const prefix = url.searchParams.get('anahtar_prefix')
    const filter = prefix ? `&key=like.${prefix}*` : ''
    const data = await sb('GET', `kolla_ayarlar?select=*&order=type.asc${filter}`)
    const mapped = (data as any[]).map((r: any) => ({ anahtar: r.key, deger: r.value, kategori: r.type || 'general', aciklama: r.aciklama || '' }))
    return Response.json(mapped)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { anahtar, deger } = await request.json()
      await sb('PATCH', `kolla_ayarlar?key=eq.${anahtar}`, { value: deger })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { anahtar, deger, kategori } = await request.json()
    if (!anahtar) return Response.json({ error: 'anahtar gerekli' }, { status: 400 })
    const rows = await sb('GET', `kolla_ayarlar?key=eq.${anahtar}`)
    if (rows && rows.length > 0) {
    await sb('PATCH', `kolla_ayarlar?key=eq.${anahtar}`, { value: deger })
    } else {
      await sb('POST', 'kolla_ayarlar', { key: anahtar, value: deger, type: kategori || 'general' })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
