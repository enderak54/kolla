const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

async function sb(method: string, path: string, body?: any) {
  const tables = ['kolla_cihazlar', 'kolla_devices']
  for (const table of tables) {
    const p = path.includes('?') ? path.replace(/^[^?]+/, table) : table
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
      method,
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) {
      if (method === 'DELETE') return null
      return res.json()
    }
    const text = await res.text()
    if (res.status === 404 && text.includes('PGRST205')) continue
    throw new Error(`${res.status}: ${text}`)
  }
  throw new Error('no suitable table found')
}

async function sbAyarlar(method: string, path: string, body?: any) {
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
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
  return res.json()
}

function ayarlarAnahtar(deviceId: string, field: string) {
  return `cihaz_config_${deviceId}_${field}`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    let rows = await sb('GET', `kolla_cihazlar?device_id=eq.${deviceId}&limit=1`)
    if (!rows || rows.length === 0) {
      rows = await sb('GET', `kolla_devices?device_id=eq.${deviceId}&limit=1`)
    }
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'cihaz bulunamadi' }, { status: 404 })
    }
    const row = rows[0]
    if (row.name && !row.ad) row.ad = row.name

    const numKeys = ['gonderim_araligi', 'oled_direction']
    const configKeys = ['gonderim_araligi', 'ota_mode', 'wifi_ssid', 'wifi_password', 'oled_direction', 'kapi_kontrol']
    for (const key of configKeys) {
      const a = await sbAyarlar('GET', `kolla_ayarlar?key=eq.${ayarlarAnahtar(deviceId, key)}&limit=1`)
      if (a && a.length > 0) {
        row[key] = numKeys.includes(key) ? Number(a[0].value) : a[0].value
      }
    }

    return Response.json(row)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (!deviceId) return Response.json({ error: 'device_id gerekli' }, { status: 400 })

    const body = await request.json()
    delete body.device_id

    const tableCols = ['ad', 'sensor_config', 'firmware_version', 'son_guncelleme']
    const tableBody: Record<string, any> = {}
    for (const col of tableCols) {
      if (body[col] !== undefined) tableBody[col] = body[col]
    }
    if (Object.keys(tableBody).length > 0) {
      await sb('PATCH', `kolla_cihazlar?device_id=eq.${deviceId}`, tableBody)
    }

    const configKeys = ['gonderim_araligi', 'ota_mode', 'wifi_ssid', 'wifi_password', 'oled_direction', 'kapi_kontrol']
    for (const key of configKeys) {
      if (body[key] !== undefined) {
        const anahtar = ayarlarAnahtar(deviceId, key)
        const existing = await sbAyarlar('GET', `kolla_ayarlar?key=eq.${anahtar}&limit=1`)
        if (existing && existing.length > 0) {
          await sbAyarlar('PATCH', `kolla_ayarlar?key=eq.${anahtar}`, { value: String(body[key]) })
        } else {
          await sbAyarlar('POST', 'kolla_ayarlar', { key: anahtar, value: String(body[key]), type: 'cihaz' })
        }
      }
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
