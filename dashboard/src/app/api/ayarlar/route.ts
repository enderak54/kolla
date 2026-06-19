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

export async function GET() {
  try {
    const data = await sb('GET', 'ayarlar?select=*&order=kategori.asc')
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { anahtar, deger } = await request.json()
    await sb('PATCH', `ayarlar?anahtar=eq.${anahtar}`, { deger, updated_at: new Date().toISOString() })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
