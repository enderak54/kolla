'use client'

import { useEffect, useState } from 'react'

interface Cihaz {
  device_id: string
  mac: string | null
  sonGuncelleme: number
  sicaklik: number
  nem: number
  wifiRssi: number | null
  mqttLokal: boolean
  mqttAio: boolean
  kayitSayisi: number
  aktif: boolean
}

export default function CihazListesi() {
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCihazlar = async () => {
      try {
        const res = await fetch('/api/cihazlar')
        const data = await res.json()
        if (Array.isArray(data)) setCihazlar(data)
        else setError('Veri alinamadi')
      } catch {
        setError('Baglanti hatasi')
      } finally {
        setLoading(false)
      }
    }
    fetchCihazlar()
    const interval = setInterval(fetchCihazlar, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2 text-emerald-400">Kolla Medikal Takip</h1>
      <div className="flex items-center justify-center gap-4 mb-6">
        <p className="text-sm text-gray-500">Bağlı Cihazlar</p>
        <a href="/cihaz-yonetimi" className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full px-4 py-1 text-gray-400 transition-colors">
          ⚙ Yönet
        </a>
      </div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : cihazlar.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          <p className="text-5xl mb-4">📡</p>
          <p>Henüz cihaz bağlanmadı</p>
          <p className="text-xs mt-2">ESP32 cihazından veri gönderildiğinde burada görünecek</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-3">
          {cihazlar.map(c => (
            <a key={c.device_id} href={`/cihaz/${encodeURIComponent(c.device_id)}`}
              className="block bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${c.aktif ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                  <span className="text-lg font-medium">{c.device_id}</span>
                </div>
                <span className="text-xs text-gray-500">{c.kayitSayisi} kayıt</span>
              </div>
              {c.mac && <p className="text-xs text-gray-500 font-mono mb-2">MAC: {c.mac}</p>}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-xs text-gray-500">Sıcaklık</span>
                  <p className="text-emerald-300 font-semibold">{c.sicaklik?.toFixed(1) ?? '-'}°C</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Nem</span>
                  <p className="text-sky-300 font-semibold">{c.nem?.toFixed(0) ?? '-'}%</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Wi-Fi</span>
                  <p className="text-gray-300 font-semibold">{c.wifiRssi != null ? `${c.wifiRssi} dBm` : '-'}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.mqttLokal ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-700 text-gray-500'}`}>MQTT Lokal</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.mqttAio ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-700 text-gray-500'}`}>Adafruit IO</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
