const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(method: string, path: string, body?: unknown) {
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
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export async function GET() {
  try {
    const rows = await query('GET', 'kolla_esik_sablonlari?select=*&order=created_at.desc')
    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.ad) return Response.json({ error: 'ad gerekli' }, { status: 400 })
    await query('POST', 'kolla_esik_sablonlari', {
      ad: body.ad,
      aciklama: body.aciklama || '',
      esikler: body.esikler || [],
      aktif_saat_bas: body.aktif_saat_bas || 0,
      aktif_saat_bit: body.aktif_saat_bit || 24,
    })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id gerekli' }, { status: 400 })
    await query('DELETE', `kolla_esik_sablonlari?id=eq.${id}`)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
