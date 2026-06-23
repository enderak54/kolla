'use client'

import { useEffect, useState } from 'react'

interface Birim {
  id: number; tip: string; ad: string; parent_id: number | null
}

interface CihazDetay {
  device_id: string; ad: string | null; konum: string | null
}

interface TelemetryRow {
  device_id: string; sicaklik: number; nem: number; recorded_at: string
}

const tipEtiket: Record<string, string> = { bina: 'Bina', kat: 'Kat', oda: 'Oda', birim: 'Birim' }
const tipRenk: Record<string, string> = {
  bina: 'border-purple-700 bg-purple-950/20 text-purple-300',
  kat: 'border-blue-700 bg-blue-950/20 text-blue-300',
  oda: 'border-emerald-700 bg-emerald-950/20 text-emerald-300',
  birim: 'border-yellow-700 bg-yellow-950/20 text-yellow-300',
}
const tipBg: Record<string, string> = {
  bina: 'bg-purple-900/10', kat: 'bg-blue-900/10', oda: 'bg-emerald-900/10', birim: 'bg-yellow-900/10',
}

function sicaklikRengi(s: number): string {
  if (s <= 0) return 'bg-blue-500/30 text-blue-200 border-blue-600'
  if (s <= 4) return 'bg-cyan-500/30 text-cyan-200 border-cyan-600'
  if (s <= 15) return 'bg-teal-500/30 text-teal-200 border-teal-600'
  if (s <= 22) return 'bg-emerald-500/30 text-emerald-200 border-emerald-600'
  if (s <= 28) return 'bg-yellow-500/30 text-yellow-200 border-yellow-600'
  if (s <= 35) return 'bg-orange-500/30 text-orange-200 border-orange-600'
  return 'bg-red-500/30 text-red-200 border-red-600'
}

export default function IsiHaritasiPage() {
  const [birimler, setBirimler] = useState<Birim[]>([])
  const [cihazlar, setCihazlar] = useState<CihazDetay[]>([])
  const [sonVeri, setSonVeri] = useState<Map<string, TelemetryRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [genislet, setGenislet] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/birimler').then(r => r.json()),
      fetch('/api/cihazlar').then(r => r.json()),
    ]).then(async ([bData, cData]) => {
      if (Array.isArray(bData)) setBirimler(bData)
      if (Array.isArray(cData)) setCihazlar(cData)

      // Fetch latest data for all devices
      const sonMap = new Map<string, TelemetryRow>()
      if (Array.isArray(cData)) {
        await Promise.all(cData.map(async (c: CihazDetay) => {
          try {
            const res = await fetch(`/api/telemetry?device_id=${encodeURIComponent(c.device_id)}`)
            const d = await res.json()
            if (d?.latest) sonMap.set(c.device_id, d.latest)
          } catch {}
        }))
      }
      setSonVeri(sonMap)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggleGenislet = (id: number) => {
    setGenislet(prev => {
      const yeni = new Set(prev)
      if (yeni.has(id)) yeni.delete(id); else yeni.add(id)
      return yeni
    })
  }

  const altBirimler = (parentId: number | null) => birimler.filter(b => b.parent_id === parentId)

  const birimeBagliCihazlar = (birimAdi: string) =>
    cihazlar.filter(c => c.konum?.toLowerCase() === birimAdi.toLowerCase())

  const renderBirim = (b: Birim, depth: number) => {
    const acik = genislet.has(b.id)
    const alt = altBirimler(b.id)
    const bagliCihazlar = birimeBagliCihazlar(b.ad)
    const aktifCihaz = bagliCihazlar.find(c => sonVeri.has(c.device_id))
    const son = aktifCihaz ? sonVeri.get(aktifCihaz.device_id) : null

    return (
      <div key={b.id} className="select-none">
        <div className={`rounded-xl border p-4 transition-colors ${tipRenk[b.tip] || 'border-gray-700 bg-gray-800'} ${tipBg[b.tip] || ''}`}
          style={{ marginLeft: depth * 20 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {alt.length > 0 && (
                <button onClick={() => toggleGenislet(b.id)} className="text-xs text-gray-500 hover:text-gray-300 w-4">
                  {acik ? '▼' : '▶'}
                </button>
              )}
              <span className="text-xs text-gray-500">{tipEtiket[b.tip]}</span>
              <span className="font-medium">{b.ad}</span>
            </div>
            {son && (
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${sicaklikRengi(son.sicaklik)}`}>
                  {son.sicaklik.toFixed(1)}°C
                </span>
                <span className="text-xs text-sky-300">{son.nem.toFixed(0)}%</span>
                <span className="text-[10px] text-gray-500">{new Date(son.recorded_at).toLocaleTimeString('tr-TR')}</span>
              </div>
            )}
            {!son && bagliCihazlar.length > 0 && (
              <span className="text-xs text-gray-600">Veri bekleniyor</span>
            )}
          </div>
          {bagliCihazlar.length > 1 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {bagliCihazlar.map(c => {
                const v = sonVeri.get(c.device_id)
                return (
                  <span key={c.device_id} className={`text-[10px] px-2 py-0.5 rounded-full border ${v ? sicaklikRengi(v.sicaklik) : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                    {c.ad || c.device_id}: {v ? `${v.sicaklik.toFixed(1)}°C` : '--'}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {acik && alt.map(a => renderBirim(a, depth + 1))}
      </div>
    )
  }

  const kokBirimler = birimler.filter(b => b.parent_id === null)

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-emerald-400">Isı Haritası</h1>
      <p className="text-sm text-gray-500 mb-6">Birim bazında anlık sıcaklık ve nem değerleri</p>

      {kokBirimler.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Henüz birim tanımlanmamış</p>
      ) : (
        <div className="space-y-2">
          {kokBirimler.map(b => renderBirim(b, 0))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
        <span>Renk skalası:</span>
        <span className="bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-600">&lt;0°C</span>
        <span className="bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded border border-cyan-600">0-4°C</span>
        <span className="bg-teal-500/30 px-2 py-0.5 rounded border border-teal-600">4-15°C</span>
        <span className="bg-emerald-500/30 px-2 py-0.5 rounded border border-emerald-600">15-22°C</span>
        <span className="bg-yellow-500/30 px-2 py-0.5 rounded border border-yellow-600">22-28°C</span>
        <span className="bg-orange-500/30 px-2 py-0.5 rounded border border-orange-600">28-35°C</span>
        <span className="bg-red-500/30 text-red-200 px-2 py-0.5 rounded border border-red-600">&gt;35°C</span>
      </div>
    </div>
  )
}
