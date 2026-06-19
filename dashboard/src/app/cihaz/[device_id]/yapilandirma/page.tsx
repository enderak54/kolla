'use client'

import { useEffect, useState } from 'react'

interface CihazConfig {
  device_id: string
  ad: string
  firmware_version: string
  sensor_config: Record<string, boolean>
  gonderim_araligi: number
  ota_mode: string
  wifi_ssid: string
  wifi_password: string
  oled_direction: number
  son_guncelleme: string
}

const sensorOptions = [
  { key: 'bme280', label: 'BME280 (Sıcaklık/Nem/Basınç)' },
  { key: 'inmp441', label: 'INMP441 (Ses/Mikrofon)' },
  { key: 'mq2', label: 'MQ-2 (Gaz Sensörü)' },
  { key: 'dht22', label: 'DHT22 (Sıcaklık/Nem)' },
  { key: 'ds18b20', label: 'DS18B20 (Harici Sıcaklık)' },
  { key: 'max30102', label: 'MAX30102 (Nabız/Oksimetre)' },
  { key: 'adxl345', label: 'ADXL345 (İvmeölçer)' },
]

export default function CihazYapilandirma({ params }: { params: { device_id: string } }) {
  const deviceId = decodeURIComponent(params.device_id)
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
  const [sensors, setSensors] = useState<Record<string, boolean>>({})

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
        setSensors(data.sensor_config || {})
      } catch { setMesaj('Baglanti hatasi') }
      finally { setLoading(false) }
    }
    fetchConfig()
  }, [deviceId])

  const toggleSensor = (key: string) => {
    setSensors(prev => ({ ...prev, [key]: !prev[key] }))
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
              <h2 className="text-lg font-semibold mb-4">Aktif Sensörler</h2>
              <div className="space-y-2">
                {sensorOptions.map(s => (
                  <label key={s.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
                    <input type="checkbox" checked={!!sensors[s.key]} onChange={() => toggleSensor(s.key)}
                      className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm text-gray-300">{s.label}</span>
                  </label>
                ))}
              </div>
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
                  <p className="text-[10px] text-gray-500 mt-1">WiFi OTA: ESP32 panel üzerinden güncellenir. BLE OTA: Telefon ile güncellenir.</p>
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
