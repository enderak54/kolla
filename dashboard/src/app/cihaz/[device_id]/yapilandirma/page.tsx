'use client'

import { useEffect, useState, use } from 'react'

interface SensorInstance {
  id: string
  tip: string
  etiket: string
  aktif: boolean
}

interface CihazConfig {
  device_id: string
  ad: string
  firmware_version: string
  sensor_config: SensorInstance[]
  gonderim_araligi: number
  ota_mode: string
  wifi_ssid: string
  wifi_password: string
  oled_direction: number
  son_guncelleme: string
}

const sensorTipleri = [
  { tip: 'bme280', label: 'BME280 (Sıcaklık/Nem/Basınç)' },
  { tip: 'inmp441', label: 'INMP441 (Ses/Mikrofon)' },
  { tip: 'mq2', label: 'MQ-2 (Gaz Sensörü)' },
  { tip: 'dht22', label: 'DHT22 (Sıcaklık/Nem)' },
  { tip: 'ds18b20', label: 'DS18B20 (Harici Sıcaklık)' },
  { tip: 'max30102', label: 'MAX30102 (Nabız/Oksimetre)' },
  { tip: 'adxl345', label: 'ADXL345 (İvmeölçer)' },
]

let sensorIdCounter = Date.now()
function yeniSensorId() { return `sens_${sensorIdCounter++}` }

export default function CihazYapilandirma({ params }: { params: Promise<{ device_id: string }> }) {
  const { device_id } = use(params)
  const deviceId = decodeURIComponent(device_id)
  const [config, setConfig] = useState<CihazConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [ad, setAd] = useState('')
  const [aralik, setAralik] = useState(5000)
  const [otaMode, setOtaMode] = useState('wifi')
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [oledDir, setOledDir] = useState(0)
  const [sensors, setSensors] = useState<SensorInstance[]>([])

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/cihaz-yapilandirma?device_id=${encodeURIComponent(deviceId)}`)
        const data = await res.json()
        if (data.error) { setMesaj(data.error); return }
        setConfig(data)
        setAd(data.ad || '')
        setAralik(data.gonderim_araligi || 5000)
        setOtaMode(data.ota_mode || 'wifi')
        setWifiSsid(data.wifi_ssid || '')
        setWifiPass(data.wifi_password || '')
        setOledDir(data.oled_direction || 0)
        if (Array.isArray(data.sensor_config)) {
          setSensors(data.sensor_config)
        } else if (data.sensor_config && typeof data.sensor_config === 'object') {
          setSensors(Object.entries(data.sensor_config).map(([k, v]) => ({
            id: k,
            tip: k.split('_')[0],
            etiket: k,
            aktif: Boolean(v),
          })))
        }
      } catch { setMesaj('Baglanti hatasi') }
      finally { setLoading(false) }
    }
    fetchConfig()
  }, [deviceId])

  const sensorEkle = (tip: string) => {
    const t = sensorTipleri.find(s => s.tip === tip)
    setSensors(prev => [...prev, { id: yeniSensorId(), tip, etiket: t?.label || tip, aktif: true }])
  }

  const sensorSil = (id: string) => {
    setSensors(prev => prev.filter(s => s.id !== id))
  }

  const sensorToggle = (id: string) => {
    setSensors(prev => prev.map(s => s.id === id ? { ...s, aktif: !s.aktif } : s))
  }

  const sensorEtiketDegistir = (id: string, etiket: string) => {
    setSensors(prev => prev.map(s => s.id === id ? { ...s, etiket } : s))
  }

  const kaydet = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/cihaz-yapilandirma?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad,
          sensor_config: sensors,
          gonderim_araligi: aralik,
          ota_mode: otaMode,
          wifi_ssid: wifiSsid,
          wifi_password: wifiPass,
          oled_direction: oledDir,
        }),
      })
      const data = await res.json()
      setMesaj(data.ok ? 'Kaydedildi' : 'Hata: ' + (data.error || ''))
    } catch { setMesaj('Kayit hatasi') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <a href={`/cihaz/${encodeURIComponent(deviceId)}`} className="text-emerald-400 hover:text-emerald-300 text-sm">
          &larr; {deviceId}
        </a>
        <h1 className="text-3xl font-bold mt-4 mb-6 text-emerald-400">Cihaz Yapılandırma</h1>

        {mesaj && <p className={`mb-4 ${mesaj === 'Kaydedildi' ? 'text-emerald-300' : 'text-red-300'}`}>{mesaj}</p>}

        {loading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">Genel Ayarlar</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cihaz Adı</label>
                  <input value={ad} onChange={e => setAd(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Gönderim Aralığı (ms)</label>
                  <select value={aralik} onChange={e => setAralik(Number(e.target.value))}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600">
                    <option value={1000}>1 saniye</option>
                    <option value={2000}>2 saniye</option>
                    <option value={5000}>5 saniye</option>
                    <option value={10000}>10 saniye</option>
                    <option value={30000}>30 saniye</option>
                    <option value={60000}>1 dakika</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">OLED Yönü</label>
                  <select value={oledDir} onChange={e => setOledDir(Number(e.target.value))}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600">
                    <option value={0}>Normal</option>
                    <option value={1}>90°</option>
                    <option value={2}>180°</option>
                    <option value={3}>270°</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Sensörler</h2>
                <div className="flex gap-1">
                  {sensorTipleri.map(t => (
                    <button key={t.tip} onClick={() => sensorEkle(t.tip)}
                      className="bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] px-2 py-1 rounded">
                      +{t.tip}
                    </button>
                  ))}
                </div>
              </div>
              {sensors.length === 0 ? (
                <p className="text-gray-500 text-sm">Henüz sensör eklenmemiş. Yukarıdan sensör tipi seçerek ekleyin.</p>
              ) : (
                <div className="space-y-2">
                  {sensors.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-gray-700/50 rounded-xl px-4 py-3">
                      <button onClick={() => sensorToggle(s.id)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${s.aktif ? 'bg-emerald-600' : 'bg-gray-600'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.aktif ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase">{s.tip}</span>
                        <input value={s.etiket} onChange={e => sensorEtiketDegistir(s.id, e.target.value)}
                          className="w-full bg-transparent text-sm text-white border-b border-gray-600 focus:border-emerald-500 outline-none" />
                      </div>
                      <button onClick={() => sensorSil(s.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1">Sil</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">Wi-Fi & OTA</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">OTA Modu</label>
                  <select value={otaMode} onChange={e => setOtaMode(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600">
                    <option value="wifi">WiFi OTA</option>
                    <option value="ble">BLE OTA</option>
                    <option value="kablo">Kablo (USB)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">WiFi OTA: Panel üzerinden. BLE OTA: Telefon ile.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Wi-Fi SSID (yedek)</label>
                  <input value={wifiSsid} onChange={e => setWifiSsid(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Wi-Fi Şifre (yedek)</label>
                  <input type="password" value={wifiPass} onChange={e => setWifiPass(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">Firmware Güncelle</h2>
              <p className="text-sm text-gray-400 mb-3">Mevcut: {config?.firmware_version || 'Bilinmiyor'}</p>
              <div className="flex gap-3">
                <a href={`/api/firmware/son-surum?device_id=${encodeURIComponent(deviceId)}&suanki=${config?.firmware_version || ''}`}
                  target="_blank"
                  className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
                  Son Sürümü Kontrol Et
                </a>
              </div>
            </div>

            <button onClick={kaydet} disabled={saving}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
