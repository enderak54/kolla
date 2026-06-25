'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function goreceliZaman(ts: number): string {
  const sn = Math.floor((Date.now() - ts) / 1000)
  if (sn < 5) return 'şimdi'
  if (sn < 60) return `${sn}sn önce`
  const dk = Math.floor(sn / 60)
  if (dk < 60) return `${dk}dk önce`
  const saat = Math.floor(dk / 60)
  if (saat < 24) return `${saat}s önce`
  const gun = Math.floor(saat / 24)
  return `${gun}g önce`
}

const gazSensorTipleri = [
  'MQ-2', 'MQ-135', 'MQ-7', 'MQ-9', 'MQ-4', 'MQ-5',
]

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
  gazGenel: number | null
  gazSensorTip: string | null
}

export default function CihazListesi() {
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [oturumVar, setOturumVar] = useState<boolean | null>(null)
  const [gazSensorTipleriState, setGazSensorTipleriState] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setOturumVar(!!session)
      if (!session) {
        // Try to handle fragment-based auth (email confirmation redirect)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            setOturumVar(!!s)
            if (s?.access_token) {
              fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token }),
              }).then(() => window.location.hash = '')
            }
          })
        }
      }
    })
  }, [])
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

  useEffect(() => {
    const fetchGazTipleri = async () => {
      try {
        const res = await fetch('/api/ayarlar?anahtar_prefix=gaz_sensor_tip_')
        const data = await res.json()
        if (Array.isArray(data)) {
          const map: Record<string, string> = {}
          for (const item of data) {
            if (item.key && item.value) {
              const id = item.key.replace('gaz_sensor_tip_', '')
              map[id] = item.value
            }
          }
          setGazSensorTipleriState(map)
        }
      } catch {}
    }
    fetchGazTipleri()
  }, [])

  const gazSensorTipDegistir = async (deviceId: string, tip: string) => {
    setGazSensorTipleriState(prev => ({ ...prev, [deviceId]: tip }))
    try {
      await fetch('/api/ayarlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anahtar: `gaz_sensor_tip_${deviceId}`, deger: tip, kategori: 'sensor' }),
      })
    } catch {}
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2 text-emerald-400">Kolla Medikal Takip</h1>
      <p className="text-sm text-gray-500 mb-6">Bağlı Cihazlar</p>
      {oturumVar === false && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-amber-300 text-sm mb-4">
          Giriş yapmadınız. <a href="/giris" className="underline text-emerald-400">Giriş Yap</a> — kayıtlı değilseniz e-posta + şifre ile kaydolun.
        </div>
      )}
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
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">{goreceliZaman(c.sonGuncelleme)}</span>
                  <span className="text-[10px] text-gray-600" title={new Date(c.sonGuncelleme).toLocaleString('tr-TR')}>{c.kayitSayisi} kayıt</span>
                </div>
              </div>
              {c.mac && <p className="text-xs text-gray-500 font-mono mb-2">MAC: {c.mac}</p>}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <span className="text-xs text-gray-500">Sıcaklık</span>
                  <p className="text-emerald-300 font-semibold">{c.sicaklik?.toFixed(1) ?? '-'}°C</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Nem</span>
                  <p className="text-sky-300 font-semibold">{c.nem?.toFixed(0) ?? '-'}%</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Gaz</span>
                  <p className="text-amber-300 font-semibold">{c.gazGenel != null ? c.gazGenel : '-'}</p>
                  {c.gazGenel != null && (
                    <select
                      value={gazSensorTipleriState[c.device_id] || 'MQ-2'}
                      onChange={e => gazSensorTipDegistir(c.device_id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-[9px] mt-0.5 bg-gray-700 text-gray-300 rounded border border-gray-600 px-1 py-0.5 w-full cursor-pointer"
                    >
                      {gazSensorTipleri.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
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
