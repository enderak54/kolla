const MODEL = 'gemini-flash-latest'
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function POST(request: Request) {
  try {
    const { telemetry } = await request.json()
    if (!Array.isArray(telemetry) || telemetry.length === 0) {
      return Response.json({ yorum: 'Henüz yeterli veri yok.' })
    }

    const son = telemetry.slice(-20)
    const prompt = `Sen Kolla adında bir AI asistansın. IoT cihazının son ${son.length} adet telemetri kaydını analiz edip Türkçe kısa bir yorum yap. Sıcaklık, nem, basınç trendlerine bak. Anormallik varsa belirt. 3 cümleyi geçme.

Telemetri verileri (en eskiden yeniye):
${JSON.stringify(son, null, 2)}`

    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini hatasi:', res.status, errText)
      return Response.json({ yorum: 'AI yorumu alınamadı.' })
    }

    const data = await res.json()
    const yorum = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Yorum alınamadı.'
    return Response.json({ yorum })
  } catch (e) {
    console.error('Kolla yorum hatasi:', e)
    return Response.json({ yorum: 'AI servisine bağlanılamadı.' })
  }
}