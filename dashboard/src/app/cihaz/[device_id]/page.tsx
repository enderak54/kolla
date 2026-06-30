'use client'

import { useEffect, useState, use, useRef } from 'react'
import iller from '@/data/turkiye-il-ilce.json'
import { TelemetryData, Threshold, Ayar, SensorCard, Card, ThresholdCard, MiniChart, StatusBadge, AyarSatir, SinyalGosterge, OzetKarti, AlarmPaneli, CSVExport } from '@/app/components/shared'
import { kollaYorum } from '@/lib/gemini'

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
  const [kapiKontrol, setKapiKontrol] = useState('kapali')
  const [sensorData, setSensorData] = useState<Record<string, number>>({})
  const [sensorGecmis, setSensorGecmis] = useState<any[]>([])
  const [gonderildi, setGonderildi] = useState<Set<string>>(new Set())
  const [kameraSon, setKameraSon] = useState<{ url: string; captured_at: string } | null>(null)
  const [kameraAktif, setKameraAktif] = useState(false)
  const [aiYorum, setAiYorum] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [kayitAktif, setKayitAktif] = useState(true)
  const [kayitAyrinti, setKayitAyrinti] = useState<Record<string, boolean>>({})

  const kayitToggle = async () => {
    const v = !kayitAktif
    setKayitAktif(v)
    try {
      await fetch('/api/ayarlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anahtar: `kayit_aktif_${deviceId}`, deger: String(v), kategori: 'cihaz' }),
      })
    } catch {}
  }

  const kayitAyrintiToggle = async (metric: string) => {
    const yeni = { ...kayitAyrinti, [metric]: !kayitAyrinti[metric] }
    setKayitAyrinti(yeni)
    try {
      await fetch('/api/ayarlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anahtar: `kayit_ayrinti_${deviceId}`, deger: JSON.stringify(yeni), kategori: 'cihaz' }),
      })
    } catch {}
  }

  const prevBaglanti = useRef<boolean | null>(null)

  const bildirimGonder = async (tip: string, baslik: string, mesaj: string) => {
    const key = `${tip}-${deviceId}`
    if (gonderildi.has(key)) return
    setGonderildi(prev => new Set(prev).add(key))
    try {
      await fetch('/api/bildirim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, tip, baslik, mesaj }),
      })
    } catch {}
    setTimeout(() => setGonderildi(prev => { const n = new Set(prev); n.delete(key); return n }), 300000)
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tr, tr2, tr3, ccfg, km, ka] = await Promise.all([
          fetch(`/api/telemetry?device_id=${encodeURIComponent(deviceId)}`).then(r => r.json()),
          fetch('/api/thresholds').then(r => r.json()),
          fetch('/api/ayarlar').then(r => r.json()),
          fetch(`/api/cihaz-yapilandirma?device_id=${encodeURIComponent(deviceId)}`).then(r => r.json().catch(() => ({}))),
          fetch(`/api/kamera?device_id=${encodeURIComponent(deviceId)}&limit=1`).then(r => r.json()).catch(() => []),
          fetch('/api/ayarlar').then(r => r.json()).catch(() => []),
        ])
        if (tr.latest) setData(tr.latest)
        if (tr.history) setHistory(tr.history)
        if (Array.isArray(tr2)) setThresholds(tr2)
        if (Array.isArray(tr3)) setAyarlar(tr3)
        if (ccfg.ad) setCihazAdi(ccfg.ad)
        if (ccfg.kapi_kontrol) setKapiKontrol(ccfg.kapi_kontrol)
        if (Array.isArray(ccfg.sensor_config)) {
          setAktifSensörler(ccfg.sensor_config.filter((s: any) => s.aktif).length)
        }
        if (Array.isArray(tr3)) {
          const a = tr3.find((x: any) => x.anahtar === `son_sensor_${deviceId}`)
          if (a) { try { setSensorData(JSON.parse(a.deger)) } catch {} }
          const g = tr3.find((x: any) => x.anahtar === `sensor_gecmis_${deviceId}`)
          if (g) { try { const arr = JSON.parse(g.deger); if (Array.isArray(arr)) setSensorGecmis(arr) } catch {} }
          const k = tr3.find((x: any) => x.anahtar === `kayit_aktif_${deviceId}`)
          if (k) setKayitAktif(k.deger === 'true')
          const ka = tr3.find((x: any) => x.anahtar === `kayit_ayrinti_${deviceId}`)
          if (ka) { try { setKayitAyrinti(JSON.parse(ka.deger)) } catch {} }
        }
        if (Array.isArray(km) && km.length > 0) {
          setKameraSon({ url: `https://fpcvwfqhungfeukgophd.supabase.co/storage/v1/object/public/kamera/${km[0].storage_path}`, captured_at: km[0].captured_at })
        }
        if (Array.isArray(ka)) {
          setKameraAktif(ka.find((a: any) => a.anahtar === `kamera_aktif_${deviceId}`)?.deger === 'true')
        }
      } catch { setError('Veri alinamadi') }
    }
    fetchAll()
    const interval = setInterval(fetchAll, refreshMs)
    return () => clearInterval(interval)
  }, [refreshMs, deviceId])

  useEffect(() => {
    if (history.length === 0 || aiLoading || aiYorum !== null) return
    setAiLoading(true)
    kollaYorum(history).then(text => { setAiYorum(text); setAiLoading(false) })
  }, [history, aiLoading, aiYorum])

  const aktif = data && (Date.now() - data.timestamp) < 15000
  const now = Date.now()
  const filteredHistory = history.filter(d => (now - d.timestamp) < timeRange * 1000)
  const thresholdMap = Object.fromEntries(thresholds.map(t => [t.metric, t]))
  const alertSicaklik = thresholdMap.sicaklik?.enabled && data && (data.sicaklik < thresholdMap.sicaklik.min_val || data.sicaklik > thresholdMap.sicaklik.max_val)

  const gazMetrics = ['gaz_genel', 'lpg', 'co', 'duman', 'metan', 'hidrojen'] as const
  const gazEtiket: Record<string, string> = { gaz_genel: 'Gaz', lpg: 'LPG', co: 'CO', duman: 'Duman', metan: 'Metan', hidrojen: 'Hidrojen' }

  const sensorValues = (metric: string): number | undefined => {
    return sensorData[metric]
  }

  const kapiAcik = data?.kapi === true
  let kapiDegisimSayisi = 0
  let oncekiKapi: boolean | null = null
  for (const d of filteredHistory) {
    if (d.kapi === true && oncekiKapi === false) kapiDegisimSayisi++
    if (d.kapi !== undefined && d.kapi !== null) oncekiKapi = d.kapi
  }
  const kapiModEtiket: Record<string, string> = { kapali: 'Kapalı', yazilim: 'Yazılım (Delta)', donanim: 'Donanım (Sensör)' }

  const secilenSehir = ayarlar.find(a => a.anahtar === 'sehir')?.deger || ''
  const ilceListesi = iller.iller.find(i => i.il === secilenSehir)?.ilceler ?? []
  const secenekler: Record<string, string[]> = {
    ulkeler: ['Türkiye', 'Azerbaycan', 'Kazakistan', 'Kırgızistan', 'Özbekistan', 'Türkmenistan', 'KKTC'],
    bolge: ['İç Anadolu', 'Marmara', 'Ege', 'Akdeniz', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'],
    sehir: iller.iller.map(i => i.il),
    semt: ilceListesi,
  }

  return (
    <div className="flex flex-col items-center max-w-5xl mx-auto">
      <div className="w-full mb-4">
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Cihaz Listesi</a>
      </div>
      <h1 className="text-2xl font-bold mb-1 text-emerald-400">Kolla Takip</h1>
      <p className="text-lg font-medium text-gray-300">{cihazAdi || deviceId}</p>
      <p className="text-xs text-gray-500 mb-2">{deviceId}{data?.mac && ` · ${data.mac}`}{aktifSensörler > 0 && ` · ${aktifSensörler} sensör aktif`}</p>
      {data && (
        <p className="text-xs text-gray-600 mb-4">
          Son güncelleme: {new Date(data.timestamp).toLocaleString('tr-TR')}
          {aktif ? <span className="text-emerald-500 ml-2">● canlı</span> : <span className="text-red-400 ml-2">● {Math.floor((Date.now() - data.timestamp) / 1000)}sn önce</span>}
        </p>
      )}
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="w-full max-w-4xl flex flex-wrap gap-3 justify-center mb-6">
        <StatusBadge label="ESP32" active={!!aktif} />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-800 border border-gray-700">
          <SinyalGosterge rssi={data?.wifiRssi} />
        </div>
        <StatusBadge label="MQTT Lokal" active={data?.mqttLokal === 1} />
        <StatusBadge label="Adafruit IO" active={data?.mqttAio === 1} />
      </div>
      <div className="w-full max-w-4xl mb-4 px-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-500">Geçmiş Kaydı</span>
          <button onClick={kayitToggle}
            className={`w-10 h-6 rounded-full relative transition-colors ${kayitAktif ? 'bg-emerald-600' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${kayitAktif ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-xs font-medium ${kayitAktif ? 'text-emerald-400' : 'text-gray-500'}`}>{kayitAktif ? 'Açık' : 'Kapalı'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['sicaklik','nem','basinc','ses','cpu','ram',...Object.keys(sensorData)].filter(m => m !== 'kapi').map(m => {
            const etiket: Record<string, string> = { sicaklik:'Sıcaklık', nem:'Nem', basinc:'Basınç', ses:'Ses', cpu:'CPU', ram:'RAM', gaz_genel:'Gaz', lpg:'LPG', co:'CO', duman:'Duman', metan:'Metan', hidrojen:'Hidrojen', isik:'Işık', lux:'Lüks', seviye:'Seviye' }
            const ayarli = kayitAyrinti[m] ?? true
            const aktifKayit = kayitAktif && ayarli
            return (
              <button key={m} onClick={() => kayitAyrintiToggle(m)}
                className={`px-2 py-1 rounded text-[10px] border transition-colors ${aktifKayit ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-600'}`}>
                {etiket[m] || m}
              </button>
            )
          })}
        </div>
      </div>
      {(() => {
        const alerts: string[] = []
        if (alertSicaklik) {
          alerts.push(`Sıcaklık uyarısı! ${(data!.sicaklik ?? 0).toFixed(1)}°C (limit: ${thresholdMap.sicaklik.min_val}-${thresholdMap.sicaklik.max_val}°C)`)
          bildirimGonder('esik_ihlali', `Sıcaklık eşik ihlali - ${cihazAdi || deviceId}`, `${data!.sicaklik.toFixed(1)}°C (limit: ${thresholdMap.sicaklik.min_val}-${thresholdMap.sicaklik.max_val})`)
        }
        if (thresholdMap.nem?.enabled && data && (data.nem < thresholdMap.nem.min_val || data.nem > thresholdMap.nem.max_val)) {
          alerts.push(`Nem uyarısı! %${(data.nem ?? 0).toFixed(0)} (limit: %${thresholdMap.nem.min_val}-${thresholdMap.nem.max_val})`)
          bildirimGonder('esik_ihlali', `Nem eşik ihlali - ${cihazAdi || deviceId}`, `%${data.nem.toFixed(0)} (limit: %${thresholdMap.nem.min_val}-${thresholdMap.nem.max_val})`)
        }
        if (thresholdMap.ses?.enabled && data && (data.ses < thresholdMap.ses.min_val || data.ses > thresholdMap.ses.max_val)) {
          alerts.push(`Mikrofon uyarısı! ${(data.ses ?? 0).toFixed(3)} (limit: ${thresholdMap.ses.min_val}-${thresholdMap.ses.max_val})`)
          bildirimGonder('esik_ihlali', `Mikrofon eşik ihlali - ${cihazAdi || deviceId}`, `${data.ses.toFixed(3)} (limit: ${thresholdMap.ses.min_val}-${thresholdMap.ses.max_val})`)
        }
        if (thresholdMap.gaz_genel?.enabled) {
          const gVal = sensorValues('gaz_genel')
          if (gVal != null && (gVal < thresholdMap.gaz_genel.min_val || gVal > thresholdMap.gaz_genel.max_val)) {
            alerts.push(`Gaz alarmı! ${gVal} ppm (limit: ${thresholdMap.gaz_genel.min_val}-${thresholdMap.gaz_genel.max_val} ppm)`)
            bildirimGonder('esik_ihlali', `Gaz alarmı - ${cihazAdi || deviceId}`, `${gVal} ppm (limit: ${thresholdMap.gaz_genel.min_val}-${thresholdMap.gaz_genel.max_val})`)
          }
        }
        for (const gm of gazMetrics) {
          if (gm === 'gaz_genel') continue
          const t = thresholdMap[gm]
          const val = sensorValues(gm)
          if (t?.enabled && val != null && (val < t.min_val || val > t.max_val)) {
            alerts.push(`${gazEtiket[gm]} alarmı! ${val} ppm (limit: ${t.min_val}-${t.max_val} ppm)`)
            bildirimGonder('esik_ihlali', `${gazEtiket[gm]} alarmı - ${cihazAdi || deviceId}`, `${val} ppm (limit: ${t.min_val}-${t.max_val})`)
          }
        }
        if (data) {
          if (!aktif && prevBaglanti.current === true) {
            alerts.push('Cihaz bağlantısı kesildi! Son veri 15sn önce.')
            bildirimGonder('cihaz_kopma', `Cihaz bağlantısı koptu - ${cihazAdi || deviceId}`, `Son veri: ${new Date(data.timestamp).toLocaleString('tr-TR')}`)
          }
          if (aktif && prevBaglanti.current === false) {
            alerts.push('Cihaz bağlantısı geldi!')
            bildirimGonder('cihaz_geldi', `Cihaz bağlantısı geldi - ${cihazAdi || deviceId}`, 'Cihaz tekrar çevrimiçi')
          }
          prevBaglanti.current = aktif
        }
        if (kapiAcik) {
          alerts.push('Kapı açık!')
          bildirimGonder('kapi_acik', `Kapı açık - ${cihazAdi || deviceId}`, `${kapiDegisimSayisi} kez açıldı`)
        }
        return <AlarmPaneli alerts={alerts} />
      })()}
      {data ? (
        <div className="w-full max-w-4xl mb-8">
          <div className="grid grid-cols-3 gap-4 mb-2">
            <SensorCard label="Sıcaklık" value={`${(data.sicaklik ?? 0).toFixed(1)}°C`} color="red" threshold={thresholdMap.sicaklik} val={data.sicaklik ?? 0} />
            <SensorCard label="Nem" value={`${(data.nem ?? 0).toFixed(0)}%`} color="blue" threshold={thresholdMap.nem} val={data.nem ?? 0} />
            <SensorCard label="Basınç" value={`${(data.basinc ?? 0).toFixed(0)} hPa`} color="green" threshold={thresholdMap.basinc} val={data.basinc ?? 0} />
          </div>
          <div className={`grid gap-4 mb-2 ${sensorData.isik != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Card label="Ses" value={(data.ses ?? 0).toFixed(3)} color="yellow" />
            {sensorData.isik != null && <Card label="Işık" value={`${sensorData.isik.toFixed(1)} lx`} color="yellow" />}
            {(() => { const g = gazMetrics.find(gm => sensorValues(gm) != null); return g != null ? <Card label="Gaz" value={`${sensorValues(g)} ppm`} color="orange" /> : null })()}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Card label="CPU" value={`${(data.cpu ?? 0).toFixed(1)}°C`} color="orange" />
            <Card label="RAM" value={`${((data.ram ?? 0) / 1024).toFixed(0)} KB`} color="purple" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            {kapiKontrol !== 'kapali' && (
              <div className={`rounded-2xl p-4 flex flex-col items-center shadow-lg border ${kapiAcik ? 'border-red-500 bg-red-950/40' : 'border-emerald-500 bg-emerald-950/30'}`}>
                <span className="text-xs text-gray-400 mb-0.5">Kapı ({kapiModEtiket[kapiKontrol]})</span>
                <span className={`text-lg font-semibold ${kapiAcik ? 'text-red-400' : 'text-emerald-300'}`}>{kapiAcik ? 'Açık' : 'Kapalı'}</span>
                {kapiDegisimSayisi > 0 && <span className="text-[10px] text-gray-500">{kapiDegisimSayisi} açılma</span>}
              </div>
            )}
            {Object.entries(sensorData).filter(([k]) => !gazMetrics.includes(k as typeof gazMetrics[number]) && !['sicaklik','nem','basinc','ses','cpu','ram','kapi','isik'].includes(k)).map(([k, v]) => {
              const renkler = ['red','blue','green','yellow','orange','purple']
              const renk = renkler[Object.keys(sensorData).indexOf(k) % renkler.length]
              const birim: Record<string, string> = { seviye: '%' }
              const etiket: Record<string, string> = { seviye: 'Seviye' }
              return <Card key={k} label={etiket[k] || k} value={`${v}${birim[k] || ''}`} color={renk} />
            })}
          </div>
          <p className="text-[10px] text-gray-600 text-right">Ölçüm: {new Date(data!.timestamp).toLocaleString('tr-TR')}</p>
        </div>
      ) : (
        <p className="text-gray-400 mb-8">Veri bekleniyor...</p>
      )}
      {aiYorum && (
        <div className="w-full max-w-4xl mb-4 p-4 rounded-2xl border border-emerald-700 bg-emerald-950/20">
          <p className="text-sm font-semibold text-emerald-400 mb-1">🤖 Kolla Yorumu</p>
          <p className="text-sm text-gray-300 leading-relaxed">{aiYorum}</p>
        </div>
      )}
      {history.length > 0 && (
        <div className="w-full max-w-4xl mb-8">
          <div className="mb-4">
            <OzetKarti data={filteredHistory} />
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
              { key: 'ses', dataKey: 'ses', color: '#F59E0B', name: 'Ses' },
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
            {sensorGecmis.length > 0 && Object.keys(sensorData).filter(gm => !['sicaklik','nem','basinc','ses','cpu','ram','kapi'].includes(gm) && sensorGecmis.some((e: any) => e[gm] != null)).map(gm => (
                <div key={gm}>
                  <MiniChart data={sensorGecmis} dataKey={gm} color={{ gaz_genel: '#F97316', lpg: '#A855F7', co: '#EF4444', duman: '#6B7280', metan: '#22C55E', hidrojen: '#3B82F6', isik: '#FBBF24', lux: '#FBBF24' }[gm] || '#F97316'} name={`${gazEtiket[gm] || (gm === 'isik' ? 'Işık' : gm.toUpperCase())}${gm === 'isik' || gm === 'lux' ? ' lx' : ' ppm'}`} />
                </div>
            ))}

          </div>
        </div>
      )}
      {kameraAktif && (
        <div className="w-full max-w-4xl mb-6">
          <h2 className="text-xl font-semibold mb-3 text-emerald-400">Kamera</h2>
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            {kameraSon ? (
              <div>
                <a href={kameraSon.url} target="_blank" rel="noopener noreferrer">
                  <img src={kameraSon.url} alt="Son snapshot" className="max-h-64 w-auto rounded-lg" />
                </a>
                <p className="text-[10px] text-gray-500 mt-2">Son: {new Date(kameraSon.captured_at).toLocaleString('tr-TR')}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Henüz snapshot yok</p>
            )}
            <a href="/kamera" className="text-emerald-400 hover:text-emerald-300 text-xs mt-2 inline-block">Tüm fotoğraflar →</a>
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
