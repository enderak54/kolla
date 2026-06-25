const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sb(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': ANON_KEY!,
      'Authorization': `Bearer ${ANON_KEY!}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
  return res.json()
}

export async function GET() {
  try {
    const rows = await sb('GET', 'kolla_bildirim_kanallari?select=*&order=kanal')
    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { kanal, ayarlar, aktif } = await request.json()
    if (!kanal) return Response.json({ error: 'kanal gerekli' }, { status: 400 })
    const patch: any = {}
    if (ayarlar !== undefined) patch.ayarlar = ayarlar
    if (aktif !== undefined) patch.aktif = aktif
    await sb('PATCH', `kolla_bildirim_kanallari?kanal=eq.${kanal}`, patch)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
