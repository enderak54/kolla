const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function query(method: string, path: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id')
    const currentVersion = searchParams.get('current_version')

    let filter = 'order=created_at.desc&limit=1'
    if (deviceId) filter += `&target_device=eq.${encodeURIComponent(deviceId)}`
    else filter += `&target_device=eq.`

    const rows = await query('GET', `firmware?select=*&${filter}`)
    if (!rows || rows.length === 0)
      return Response.json({ update_available: false })

    const latest = rows[0]
    if (currentVersion && latest.version === currentVersion)
      return Response.json({ update_available: false })

    return Response.json({
      update_available: true,
      version: latest.version,
      dosya_url: latest.dosya_url,
      zorunlu: latest.zorunlu,
      boyut: latest.boyut,
      changelog: latest.changelog,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
