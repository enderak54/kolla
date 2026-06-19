const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function supabase(method: string, path: string, body?: any) {
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function GET() {
  try {
    const data = await supabase('GET', 'thresholds?select=*&device_id=eq.KOLLA-001')
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { metric, min_val, max_val, enabled } = await request.json()
    await supabase('PATCH', `thresholds?device_id=eq.KOLLA-001&metric=eq.${metric}`, {
      min_val, max_val, enabled, updated_at: new Date().toISOString(),
    })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
