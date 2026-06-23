'use client'

import { useEffect, useState } from 'react'

export default function SaklamaPage() {
  const [ayarlar, setAyarlar] = useState({ ham_gun: 7, saatlik_gun: 90, gunluk_gun: 365 })
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    fetch('/api/ayarlar/saklama').then(r => r.json()).then(d => {
      if (d.ham_gun) setAyarlar(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const kaydet = async () => {
    const res = await fetch('/api/ayarlar/saklama', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ayarlar),
    })
    setMesaj(res.ok ? 'Kaydedildi' : 'Hata')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <a href="/ayarlar" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Ayarlar</a>
      <h1 className="text-2xl font-bold mt-4 mb-6 text-emerald-400">Veri Saklama Politikası</h1>

      {loading ? <p className="text-gray-500">Yükleniyor...</p> : (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-5">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Ham veri saklama (gün)</label>
            <p className="text-xs text-gray-500 mb-2">Detaylı telemetry kaydı. Bu süre sonunda silinir.</p>
            <input type="number" min={1} max={365} value={ayarlar.ham_gun}
              onChange={e => setAyarlar(p => ({ ...p, ham_gun: parseInt(e.target.value) || 7 }))}
              className="w-32 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Saatlik özet saklama (gün)</label>
            <p className="text-xs text-gray-500 mb-2">Saatlik istatistikler. 90 gün öncesi otomatik silinir.</p>
            <input type="number" min={1} max={730} value={ayarlar.saatlik_gun}
              onChange={e => setAyarlar(p => ({ ...p, saatlik_gun: parseInt(e.target.value) || 90 }))}
              className="w-32 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Günlük özet saklama (gün)</label>
            <p className="text-xs text-gray-500 mb-2">Günlük istatistikler. Sınırsız tutulması önerilir.</p>
            <input type="number" min={1} max={3650} value={ayarlar.gunluk_gun}
              onChange={e => setAyarlar(p => ({ ...p, gunluk_gun: parseInt(e.target.value) || 365 }))}
              className="w-32 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <button onClick={kaydet} className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm">
            Kaydet
          </button>
          {mesaj && <p className="text-sm text-emerald-400">{mesaj}</p>}
        </div>
      )}
    </div>
  )
}
