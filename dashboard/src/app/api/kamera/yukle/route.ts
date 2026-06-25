import { NextRequest } from 'next/server'

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const deviceId = (formData.get('device_id') as string) || 'KOLLA-000001'
    const tetikleyici = (formData.get('tetikleyici') as string) || 'manuel'
    const etiket = (formData.get('etiket') as string) || ''

    if (!file) return Response.json({ error: 'file gerekli' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const dosyaAdi = `${deviceId}_${Date.now()}.jpg`
    const storagePath = `${deviceId}/${dosyaAdi}`

    // Upload to Supabase Storage
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/kamera/${storagePath}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: buffer,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      throw new Error(`Upload failed: ${uploadRes.status} ${errText}`)
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/kamera/${storagePath}`

    // Save metadata
    await fetch(`${SUPABASE_URL}/rest/v1/kolla_kamera_kayitlari`, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_id: deviceId,
        dosya_adi: dosyaAdi,
        storage_path: storagePath,
        boyut: file.size,
        tetikleyici,
        etiket,
        captured_at: new Date().toISOString(),
      }),
    })

    return Response.json({ ok: true, url: publicUrl, dosya_adi: dosyaAdi })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
