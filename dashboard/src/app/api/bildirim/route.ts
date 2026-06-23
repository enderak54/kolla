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
  return method === 'DELETE' ? null : res.json()
}

async function telegramGonder(botToken: string, chatId: string, mesaj: string) {
  if (!botToken || !chatId) return
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mesaj, parse_mode: 'Markdown' }),
    })
  } catch {}
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, tip, baslik, mesaj } = body
    if (!tip || !baslik) return Response.json({ error: 'tip ve baslik gerekli' }, { status: 400 })

    await sb('POST', 'bildirimler', {
      device_id: device_id || null,
      tip,
      baslik,
      mesaj: mesaj || '',
      kanal: 'ekran',
      durum: 'bekliyor',
      gonderildi: false,
      created_at: new Date().toISOString(),
    })

    const kanallar: any[] = await sb('GET', 'bildirim_kanallari?select=*&aktif=eq.true')
    for (const k of kanallar) {
      if (k.kanal === 'telegram' && k.ayarlar?.bot_token && k.ayarlar?.chat_id) {
        telegramGonder(k.ayarlar.bot_token, k.ayarlar.chat_id, `*${baslik}*\n${mesaj || ''}\n\n📡 ${device_id || 'Sistem'} | ${new Date().toLocaleString('tr-TR')}`)
      }
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const durum = url.searchParams.get('durum')
    const limit = url.searchParams.get('limit') || '50'

    let filter = `select=*&order=created_at.desc&limit=${limit}`
    if (durum) filter += `&durum=eq.${durum}`

    const rows = await sb('GET', `bildirimler?${filter}`)
    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, durum } = await request.json()
    if (!id || !durum) return Response.json({ error: 'id ve durum gerekli' }, { status: 400 })
    await sb('PATCH', `bildirimler?id=eq.${id}`, { durum })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
