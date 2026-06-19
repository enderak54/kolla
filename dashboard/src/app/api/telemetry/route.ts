import { kv } from '@vercel/kv'

interface TelemetryData {
  sicaklik: number
  nem: number
  basinc: number
  ses: number
  cpu: number
  ram: number
  wifiRssi?: number
  mqttLokal?: number
  mqttAio?: number
  timestamp: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as TelemetryData

    if (body.sicaklik === undefined) {
      const text = await request.text()
      const parts = text.split(',')
      if (parts.length >= 6) {
        body.sicaklik = parseFloat(parts[0])
        body.nem = parseFloat(parts[1])
        body.basinc = parseFloat(parts[2])
        body.ses = parseFloat(parts[3])
        body.cpu = parseFloat(parts[4])
        body.ram = parseInt(parts[5])
      } else {
        return Response.json({ error: 'invalid data' }, { status: 400 })
      }
    }

    body.timestamp = Date.now()

    await kv.set('latest', body)
    await kv.zadd('history', { score: body.timestamp, member: JSON.stringify(body) })
    await kv.zremrangebyrank('history', 0, -101)

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const latest = await kv.get<TelemetryData>('latest')
    const history = await kv.zrange('history', 0, -1, { rev: true })
    const data = history.map((m) => {
      try { return JSON.parse(m as string) as TelemetryData } catch { return null }
    }).filter(Boolean).reverse()

    return Response.json({ latest, history: data })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
