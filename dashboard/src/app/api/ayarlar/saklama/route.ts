const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

const VARSALON_KEY = 'KOLLA_VERI_SAKLAMA'

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

export async function GET() {
  try {
    const rows = await sb('GET', `kolla_varsayilan_ayarlar?anahtar=eq.${VARSALON_KEY}`)
    if (!rows || rows.length === 0) {
      return Response.json({ ham_gun: 7, saatlik_gun: 90, gunluk_gun: 365 })
    }
    return Response.json(rows[0].deger)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const deger = await request.json()
    const rows = await sb('GET', `kolla_varsayilan_ayarlar?anahtar=eq.${VARSALON_KEY}`)
    if (rows && rows.length > 0) {
      await sb('PATCH', `kolla_varsayilan_ayarlar?anahtar=eq.${VARSALON_KEY}`, { deger })
    } else {
      await sb('POST', 'kolla_varsayilan_ayarlar', { anahtar: VARSALON_KEY, deger })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
