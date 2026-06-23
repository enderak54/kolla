'use client'

import { useEffect, useState } from 'react'

export default function KameraAyarlariPage() {
  const [cihazlar, setCihazlar] = useState<{ device_id: string; ad: string | null }[]>([])
  const [kameraAktif, setKameraAktif] = useState<Record<string, boolean>>({})
  const [aralik, setAralik] = useState<Record<string, number>>({})
  const [alarmTetik, setAlarmTetik] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/cihazlar').then(r => r.json()),
      fetch('/api/ayarlar').then(r => r.json()),
    ]).then(([cData, aData]) => {
      if (Array.isArray(cData)) {
        setCihazlar(cData)
        for (const c of cData) {
          const d = c as any
          const a = Array.isArray(aData) ? aData : []
          setKameraAktif(prev => ({ ...prev, [d.device_id]: a.find((x: any) => x.anahtar === `kamera_aktif_${d.device_id}`)?.deger === 'true' }))
          setAralik(prev => ({ ...prev, [d.device_id]: parseInt(a.find((x: any) => x.anahtar === `kamera_aralik_${d.device_id}`)?.deger) || 60 }))
          setAlarmTetik(prev => ({ ...prev, [d.device_id]: a.find((x: any) => x.anahtar === `kamera_alarm_${d.device_id}`)?.deger === 'true' }))
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const kaydet = async (anahtar: string, deger: string) => {
    try {
      await fetch('/api/ayarlar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anahtar, deger }),
      })
    } catch {}
  }

  const cihazAdi = (did: string) => cihazlar.find(c => c.device_id === did)?.ad || did

  useEffect(() => { if (mesaj) { const t = setTimeout(() => setMesaj(''), 3000); return () => clearTimeout(t) } }, [mesaj])

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>

  return (
    <div className="max-w-3xl mx-auto">
      <a href="/ayarlar" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Ayarlar</a>
      <h1 className="text-2xl font-bold mt-4 mb-6 text-emerald-400">Kamera Ayarları</h1>

      {mesaj && <p className="text-emerald-300 mb-4 text-sm">{mesaj}</p>}

      <div className="space-y-4">
        {cihazlar.map(c => (
          <div key={c.device_id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">{c.ad || c.device_id}</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">ESP32-CAM Aktif</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={kameraAktif[c.device_id] || false}
                    onChange={e => { const v = e.target.checked; setKameraAktif(p => ({ ...p, [c.device_id]: v })); kaydet(`kamera_aktif_${c.device_id}`, String(v)); setMesaj(`${cihazAdi(c.device_id)} kamera ${v ? 'aktif' : 'pasif'}`) }}
                    className="accent-emerald-500" />
                  <span className="text-xs text-gray-500">{kameraAktif[c.device_id] ? 'Aktif' : 'Pasif'}</span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-400">Snapshot Aralığı</span>
                  <p className="text-[10px] text-gray-500">ESP32-CAM kaç saniyede bir fotoğraf çeksin</p>
                </div>
                <input type="number" min={10} max={3600} value={aralik[c.device_id] || 60}
                  onChange={e => { const v = parseInt(e.target.value) || 60; setAralik(p => ({ ...p, [c.device_id]: v })); kaydet(`kamera_aralik_${c.device_id}`, String(v)); setMesaj(`${cihazAdi(c.device_id)} aralık: ${v}s`) }}
                  className="w-20 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 text-right" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-400">Alarmda Fotoğraf Çek</span>
                  <p className="text-[10px] text-gray-500">Eşik ihlali/kapı açılma durumunda otomatik snapshot</p>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={alarmTetik[c.device_id] || false}
                    onChange={e => { const v = e.target.checked; setAlarmTetik(p => ({ ...p, [c.device_id]: v })); kaydet(`kamera_alarm_${c.device_id}`, String(v)); setMesaj(`${cihazAdi(c.device_id)} alarm tetikleme ${v ? 'aktif' : 'pasif'}`) }}
                    className="accent-emerald-500" />
                </label>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700 text-[10px] text-gray-600 space-y-1">
              <p>ESP32-CAM URL: <code className="text-emerald-500">http://{c.device_id}.local/capture</code></p>
              <p>Stream: <code className="text-emerald-500">http://{c.device_id}.local:81/stream</code></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
