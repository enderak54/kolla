'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const CIHAZ_RENKLER = ['#34d399', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#fb923c', '#34d399', '#e879f9']
const zamanSecenek = [
  { label: 'Son 1s', sn: 3600 },
  { label: 'Son 6s', sn: 21600 },
  { label: 'Son 24s', sn: 86400 },
  { label: 'Son 7g', sn: 604800 },
]

export default function KarsilastirmaPage() {
  const [cihazlar, setCihazlar] = useState<string[]>([])
  const [cihazDetayMap, setCihazDetayMap] = useState<Map<string, any>>(new Map())
  const [secili, setSecili] = useState<string[]>([])
  const [data, setData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [zaman, setZaman] = useState(3600)
  const [metrik, setMetrik] = useState<'sicaklik' | 'nem'>('sicaklik')

  useEffect(() => {
    fetch('/api/cihazlar').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setCihazlar(d.map((c: any) => c.device_id))
        const map = new Map<string, any>()
        d.forEach((c: any) => map.set(c.device_id, c))
        setCihazDetayMap(map)
      }
    })
  }, [])

  const toggleCihaz = (did: string) => {
    setSecili(prev => prev.includes(did) ? prev.filter(x => x !== did) : [...prev, did])
  }

  const getir = async () => {
    if (secili.length === 0) return
    setLoading(true)
    const bit = new Date().toISOString()
    const bas = new Date(Date.now() - zaman * 1000).toISOString()
    const yeniData: Record<string, any[]> = {}

    await Promise.all(secili.map(async did => {
      try {
        const params = new URLSearchParams({ device_id: did, bas_tarih: bas, bit_tarih: bit, limit: '2000' })
        const res = await fetch(`/api/telemetry/rapor?${params}`)
        const rows = await res.json()
        if (Array.isArray(rows)) {
          yeniData[did] = rows.map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString('tr-TR'),
            value: r[metrik],
            recorded_at: r.recorded_at,
          }))
        }
      } catch {}
    }))

    setData(yeniData)
    setLoading(false)
  }

  const chartData = (() => {
    if (Object.keys(data).length === 0) return []
    const allPoints: Record<string, any>[] = []
    const firstKey = Object.keys(data)[0]
    if (!firstKey || !data[firstKey]) return []
    for (let i = 0; i < data[firstKey].length; i++) {
      const point: any = { time: data[firstKey][i]?.time || '' }
      for (const did of Object.keys(data)) {
        point[did] = data[did]?.[i]?.value ?? null
      }
      allPoints.push(point)
    }
    return allPoints
  })()

  const etiket: Record<string, string> = { sicaklik: 'Sıcaklık (°C)', nem: 'Nem (%)' }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Cihaz Karşılaştırma</h1>

      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[300px]">
            <span className="text-xs text-gray-500 block mb-1">Cihazlar (birden fazla seçin)</span>
            <div className="flex flex-wrap gap-2">
              {cihazlar.map(did => {
                const sec = secili.includes(did)
                return (
                  <button key={did} onClick={() => toggleCihaz(did)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${sec ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}>
                    {cihazDetayMap.get(did)?.ad || did}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Metrik</span>
            <select value={metrik} onChange={e => setMetrik(e.target.value as any)}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600">
              <option value="sicaklik">Sıcaklık</option>
              <option value="nem">Nem</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Zaman</span>
            <div className="flex gap-1">
              {zamanSecenek.map(z => (
                <button key={z.sn} onClick={() => setZaman(z.sn)}
                  className={`px-3 py-1.5 rounded-lg text-xs ${zaman === z.sn ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>{z.label}</button>
              ))}
            </div>
          </div>
          <button onClick={getir} disabled={loading || secili.length === 0}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Yükleniyor...' : 'Getir'}
          </button>
        </div>
      </div>

      {Object.keys(data).length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-4">{etiket[metrik]} — {secili.map(d => cihazDetayMap.get(d)?.ad || d).join(', ')}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} width={50} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {secili.map((did, i) => (
                <Line key={did} type="monotone" dataKey={did} stroke={CIHAZ_RENKLER[i % CIHAZ_RENKLER.length]}
                  name={cihazDetayMap.get(did)?.ad || did} dot={false} strokeWidth={2} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {secili.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">Karşılaştırma için cihaz seçin</p>
          <p className="text-gray-600 text-sm">En az 2 cihaz seçip "Getir" butonuna tıklayın</p>
        </div>
      )}
    </div>
  )
}
