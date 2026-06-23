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

export async function GET() {
  try {
    const rows = await sb('GET', 'audit_log?select=*&order=created_at.desc&limit=200')
    return Response.json(rows || [])
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
