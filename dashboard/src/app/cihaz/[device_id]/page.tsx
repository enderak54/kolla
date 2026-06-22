'use client'

import { useEffect, useState, use } from 'react'
import iller from '@/data/turkiye-il-ilce.json'
import { TelemetryData, Threshold, Ayar, SensorCard, Card, ThresholdCard, MiniChart, StatusBadge, AyarSatir, SinyalGosterge, OzetKarti, AlarmPaneli, CSVExport } from '@/app/components/shared'

export default function CihazDetay({ params }: { params: Promise<{ device_id: string }> }) {
  const { device_id } = use(params)
  const deviceId = decodeURIComponent(device_id)
  const [data, setData] = useState<TelemetryData | null>(null)
  const [history, setHistory] = useState<TelemetryData[]>([])
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [ayarlar, setAyarlar] = useState<Ayar[]>([])
  const [timeRange, setTimeRange] = useState(3600)
  const [refreshMs, setRefreshMs] = useState(5000)
  const [error, setError] = useState('')
  const [cihazAdi, setCihazAdi] = useState('')
  const [aktifSensörler, setAktifSensörler] = useState(0)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tr, tr2, tr3, ccfg] = await Promise.all([
          fetch(`/api/telemetry?device_id=${encodeURIComponent(deviceId)}`).then(r => r.json()),
          fetch('/api/thresholds').then(r => r.json()),
          fetch('/api/ayarlar').then(r => r.json()),
          fetch(`/api/cihaz-yapilandirma?device_id=${encodeURIComponent(deviceId)}`).then(r => r.json().catch(() => ({}))),
        ])
        if (tr.latest) setData(tr.latest)
        if (tr.history) setHistory(tr.history)
        if (Array.isArray(tr2)) setThresholds(tr2)
        if (Array.isArray(tr3)) setAyarlar(tr3)
        if (ccfg.ad) setCihazAdi(ccfg.ad)
        if (Array.isArray(ccfg.sensor_config)) {
          setAktifSensörler(ccfg.sensor_config.filter((s: any) => s.aktif).length)
        }
      } catch { setError('Veri alinamadi') }
    }
    fetchAll()
    const interval = setInterval(fetchAll, refreshMs)
    return () => clearInterval(interval)
  }, [refreshMs, deviceId])

  const aktif = data && (Date.now() - data.timestamp) < 15000
  const now = Date.now()
  const filteredHistory = history.filter(d => (now - d.timestamp) < timeRange * 1000)
  const thresholdMap = Object.fromEntries(thresholds.map(t => [t.metric, t]))
  const alertSicaklik = thresholdMap.sicaklik?.enabled && data && (data.sicaklik < thresholdMap.sicaklik.min_val || data.sicaklik > thresholdMap.sicaklik.max_val)
  const secilenSehir = ayarlar.find(a => a.anahtar === 'sehir')?.deger || ''
  const ilceListesi = iller.iller.find(i => i.il === secilenSehir)?.ilceler ?? []
  const secenekler: Record<string, string[]> = {
    ulkeler: ['Türkiye', 'Almanya', 'ABD', 'İngiltere', 'Fransa', 'Japonya', 'Çin', 'Rusya'],
    bolge: ['İç Anadolu', 'Marmara', 'Ege', 'Akdeniz', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'],
    sehir: iller.iller.map(i => i.il),
    semt: ilceListesi,
  }

  return (
    <div className="flex flex-col items-center max-w-5xl mx-auto">
      <div className="w-full mb-4">
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Cihaz Listesi</a>
      </div>
      <h1 className="text-2xl font-bold mb-1 text-emerald-400">Kolla Medikal Takip</h1>
      <p className="text-lg font-medium text-gray-300">{cihazAdi || deviceId}</p>
      <p className="text-xs text-gray-500 mb-6">{deviceId}{data?.mac && ` · ${data.mac}`}{aktifSensörler > 0 && ` · ${aktifSensörler} sensör aktif`}</p>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="w-full max-w-4xl flex flex-wrap gap-3 justify-center mb-6">
        <StatusBadge label="ESP32" active={!!aktif} />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-800 border border-gray-700">
          <SinyalGosterge rssi={data?.wifiRssi} />
        </div>
        <StatusBadge label="MQTT Lokal" active={data?.mqttLokal === 1} />
        <StatusBadge label="Adafruit IO" active={data?.mqttAio === 1} />
      </div>
      {(() => {
        const alerts: string[] = []
        if (alertSicaklik) alerts.push(`Sıcaklık uyarısı! ${data!.sicaklik.toFixed(1)}°C (limit: ${thresholdMap.sicaklik.min_val}-${thresholdMap.sicaklik.max_val}°C)`)
        if (thresholdMap.nem?.enabled && data && (data.nem < thresholdMap.nem.min_val || data.nem > thresholdMap.nem.max_val))
          alerts.push(`Nem uyarısı! %${data.nem.toFixed(0)} (limit: %${thresholdMap.nem.min_val}-${thresholdMap.nem.max_val})`)
        if (data && !aktif) alerts.push('Cihaz bağlantısı kesildi! Son veri 15sn önce.')
        return <AlarmPaneli alerts={alerts} />
      })()}
      {data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
          <SensorCard label="Sıcaklık" value={`${data.sicaklik.toFixed(1)}°C`} color="red" threshold={thresholdMap.sicaklik} val={data.sicaklik} />
          <SensorCard label="Nem" value={`${data.nem.toFixed(0)}%`} color="blue" threshold={thresholdMap.nem} val={data.nem} />
          <SensorCard label="Basınç" value={`${data.basinc.toFixed(0)} hPa`} color="green" threshold={thresholdMap.basinc} val={data.basinc} />
          <Card label="Ses" value={data.ses.toFixed(3)} color="yellow" />
          <Card label="CPU" value={`${data.cpu.toFixed(1)}°C`} color="orange" />
          <Card label="RAM" value={`${(data.ram / 1024).toFixed(0)} KB`} color="purple" />
        </div>
      ) : (
        <p className="text-gray-400 mb-8">Veri bekleniyor...</p>
      )}
      {history.length > 0 && (
        <div className="w-full max-w-4xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <OzetKarti data={filteredHistory} />
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex flex-col justify-center items-center">
              <span className="text-xs text-gray-500 mb-2">Wi-Fi Sinyal</span>
              <SinyalGosterge rssi={data?.wifiRssi} />
              {data?.wifiRssi !== undefined && (
                <span className="text-[10px] text-gray-600 mt-1">
                  {data.wifiRssi >= -50 ? 'Mükemmel' : data.wifiRssi >= -65 ? 'İyi' : data.wifiRssi >= -80 ? 'Orta' : 'Zayıf'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            {[[3600,'1s'], [21600,'6s'], [86400,'24s']].map(([s, l]) => (
              <button key={s} onClick={() => setTimeRange(s as number)}
                className={`px-4 py-1 rounded-full text-sm ${timeRange === s ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{l}</button>
            ))}
            <span className="text-gray-600 mx-2">|</span>
            <span className="text-xs text-gray-500">Yenile:</span>
            {[2000, 5000, 10000].map(ms => (
              <button key={ms} onClick={() => setRefreshMs(ms)}
                className={`px-3 py-1 rounded-full text-xs ${refreshMs === ms ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{ms/1000}s</button>
            ))}
            <span className="flex-1" />
            <CSVExport data={filteredHistory} filename={`kolla_${deviceId}_${Date.now()}.csv`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[ 
              { key: 'sicaklik', dataKey: 'sicaklik', color: '#EF4444', name: 'Sıcaklık °C' },
              { key: 'nem', dataKey: 'nem', color: '#0EA5E9', name: 'Nem %' },
              { key: 'basinc', dataKey: 'basinc', color: '#10B981', name: 'Basınç hPa' },
            ].map(m => (
              <div key={m.key}>
                <MiniChart data={filteredHistory} dataKey={m.dataKey} color={m.color} name={m.name} />
                {thresholds.filter(t => t.metric === m.key).map(t => (
                  <ThresholdCard key={t.metric} threshold={t} onUpdate={(upd) => {
                    fetch('/api/thresholds', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(upd) })
                    setThresholds(prev => prev.map(p => p.metric === upd.metric ? { ...p, ...upd } : p))
                  }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
        <h2 className="text-xl font-semibold mb-4 text-emerald-400">Sistem Ayarları</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['bolgesel', 'birimler', 'cihaz'].map(kat => (
            <div key={kat} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">{kat === 'bolgesel' ? 'Bölgesel' : kat === 'birimler' ? 'Birimler' : 'Cihaz'}</h3>
              <div className="space-y-2">
                {ayarlar.filter(a => a.kategori === kat).map(a => (
                  <AyarSatir key={a.anahtar} ayar={a} secenekler={secenekler} onUpdate={(anahtar, deger) => {
                    fetch('/api/ayarlar', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ anahtar, deger }) })
                    setAyarlar(prev => prev.map(p => p.anahtar === anahtar ? { ...p, deger } : p))
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      <div className="w-full max-w-4xl mt-8 flex gap-4 justify-center flex-wrap">
        <a href={`/cihaz/${encodeURIComponent(deviceId)}/yapilandirma`}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-300 transition-colors">
          ⚙ Cihaz Yapılandırma
        </a>
        <a href={`/firmware?device_id=${encodeURIComponent(deviceId)}`}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-300 transition-colors">
          📦 Firmware
        </a>
        <a href="/cihaz-yonetimi"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-300 transition-colors">
          ⚙ Cihaz Yönetimi
        </a>
      </div>
      {data && (
        <p className="text-xs text-gray-500 mt-4">Son: {new Date(data.timestamp).toLocaleTimeString('tr-TR')}</p>
      )}
    </div>
  )
}
