const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(method: string, path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    const suanki = url.searchParams.get('suanki') || ''

    const rows = await query('GET', `firmware?select=*&order=created_at.desc&limit=1`)
    if (!rows || rows.length === 0) {
      return Response.json({ guncelleme: false, mesaj: 'firmware bulunamadi' })
    }

    const son = rows[0]
    if (son.version === suanki) {
      return Response.json({ guncelleme: false, version: son.version, mesaj: 'guncel' })
    }

    return Response.json({
      guncelleme: true,
      version: son.version,
      dosya_url: son.dosya_url,
      boyut: son.boyut,
      zorunlu: son.zorunlu,
      changelog: son.changelog,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
