export async function kollaYorum(telemetryData: any[]): Promise<string> {
  try {
    const res = await fetch('/api/kolla-yorum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telemetry: telemetryData }),
    })
    if (!res.ok) return 'AI yorumu alınamadı.'
    const data = await res.json()
    return data.yorum || 'Yorum alınamadı.'
  } catch {
    return 'AI servisine bağlanılamadı.'
  }
}