'use client'

import { useEffect, useState } from 'react'

interface TelemetryRow {
  id: number
  device_id: string
  recorded_at: string
  sicaklik: number
  nem: number
  basinc: number
  ses: number
  cpu: number
  ram: number
  wifi_rssi: number
  mac: string
  mqtt_lokal: number
  mqtt_aio: number
  kapi?: boolean | null
  gaz?: number; gaz_lpg?: number; gaz_co?: number; gaz_duman?: number; gaz_metan?: number; gaz_hidrojen?: number
}

interface Birim {
  id: number
  tip: string
  ad: string
  parent_id: number | null
}

interface ThresholdRow {
  device_id: string
  metric: string
  min_val: number
  max_val: number
  enabled: boolean
}

interface CihazDetay {
  device_id: string
  ad: string | null
  konum: string | null
}

const tipEtiket: Record<string, string> = { bina: 'Bina', kat: 'Kat', oda: 'Oda', birim: 'Birim' }
const tipRenk: Record<string, string> = { bina: 'text-purple-300', kat: 'text-blue-300', oda: 'text-emerald-300', birim: 'text-yellow-300' }

const zamanSecenek = [
  { label: 'Son 1s', sn: 3600 },
  { label: 'Son 6s', sn: 21600 },
  { label: 'Son 24s', sn: 86400 },
  { label: 'Son 7g', sn: 604800 },
  { label: 'Son 30g', sn: 2592000 },
  { label: 'Son 90g', sn: 7776000 },
]

function birimAgaci(birimler: Birim[], parentId: number | null = null, depth = 0): { id: number; ad: string; tip: string; depth: number }[] {
  const sonuc: { id: number; ad: string; tip: string; depth: number }[] = []
  for (const b of birimler) {
    if (b.parent_id === parentId) {
      sonuc.push({ id: b.id, ad: b.ad, tip: b.tip, depth })
      sonuc.push(...birimAgaci(birimler, b.id, depth + 1))
    }
  }
  return sonuc
}

function esikKontrol(row: TelemetryRow, thresholds: ThresholdRow[]): string[] {
  const cihazEsikler = thresholds.filter(t => t.device_id === row.device_id && t.enabled)
  const ihlaller: string[] = []
  for (const e of cihazEsikler) {
    const val = (row as any)[e.metric]
    if (val !== null && val !== undefined) {
      if (val < e.min_val || val > e.max_val) {
        ihlaller.push(e.metric)
      }
    }
  }
  return ihlaller
}

export default function RaporlarPage() {
  const [data, setData] = useState<TelemetryRow[]>([])
  const [cihazlar, setCihazlar] = useState<string[]>([])
  const [cihazDetayMap, setCihazDetayMap] = useState<Map<string, CihazDetay>>(new Map())
  const [birimler, setBirimler] = useState<Birim[]>([])
  const [thresholdRows, setThresholdRows] = useState<ThresholdRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [birimId, setBirimId] = useState<number | null>(null)
  const [sadeceAlarm, setSadeceAlarm] = useState(false)
  const [zaman, setZaman] = useState(86400)
  const [ozelBas, setOzelBas] = useState('')
  const [ozelBit, setOzelBit] = useState('')
  const [ozelMod, setOzelMod] = useState(false)
  const [toplam, setToplam] = useState(0)
  const [filtrelenmis, setFiltrelenmis] = useState(0)
  const [hata, setHata] = useState('')
  const [gorunum, setGorunum] = useState<'tablo' | 'cihaz' | 'alarm' | 'sensor'>('tablo')
  const [sensorData, setSensorData] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/cihazlar').then(r => r.json()),
      fetch('/api/birimler').then(r => r.json()),
      fetch('/api/thresholds').then(r => r.json()),
    ]).then(([cihazData, birimData, esikData]) => {
      if (Array.isArray(cihazData)) {
        setCihazlar(cihazData.map((c: any) => c.device_id))
        const map = new Map<string, CihazDetay>()
        cihazData.forEach((c: any) => map.set(c.device_id, { device_id: c.device_id, ad: c.ad, konum: c.konum }))
        setCihazDetayMap(map)
      }
      if (Array.isArray(birimData)) setBirimler(birimData)
      if (Array.isArray(esikData)) setThresholdRows(esikData)
    }).catch(() => {})
  }, [])

  const birimAgac = birimAgaci(birimler)

  const getFilteredDeviceIds = (): string[] | null => {
    if (!birimId) return null
    const secilen = birimler.find(b => b.id === birimId)
    if (!secilen) return null
    const altBirimIds = new Set<number>()
    const toplaAltBirimler = (parentId: number) => {
      for (const b of birimler) {
        if (b.parent_id === parentId) {
          altBirimIds.add(b.id)
          toplaAltBirimler(b.id)
        }
      }
    }
    altBirimIds.add(birimId)
    toplaAltBirimler(birimId)
    const birimAdlari = new Set(birimler.filter(b => altBirimIds.has(b.id)).map(b => b.ad.toLowerCase()))
    const eslesen = Array.from(cihazDetayMap.values())
      .filter(c => c.konum && birimAdlari.has(c.konum.toLowerCase()))
      .map(c => c.device_id)
    return eslesen.length > 0 ? eslesen : null
  }

  const getir = async () => {
    setLoading(true); setHata('')
    try {
      let bas = ozelMod ? ozelBas : new Date(Date.now() - zaman * 1000).toISOString()
      let bit = ozelMod ? ozelBit : new Date().toISOString()
      const params = new URLSearchParams({ bas_tarih: bas, bit_tarih: bit, limit: '10000' })
      if (deviceId) params.set('device_id', deviceId)
      const [trRes, stRes] = await Promise.all([
        fetch(`/api/telemetry/rapor?${params}`),
        fetch(`/api/sensor-telemetry?limit=5000&device_id=${deviceId || ''}`).then(r => r.json().catch(() => ({}))),
      ])
      const rows = await trRes.json()
      if (Array.isArray(rows)) {
        setData(rows)
        setToplam(rows.length)
      } else setHata('Veri alinamadi')
      if (stRes?.raw) setSensorData(stRes.raw)
    } catch { setHata('Baglanti hatasi') } finally { setLoading(false) }
  }

  const filtrelenmisData = (() => {
    let sonuc = [...data]
    const birimIds = getFilteredDeviceIds()
    if (birimIds) {
      sonuc = sonuc.filter(r => birimIds.includes(r.device_id))
    }
    if (sadeceAlarm) {
      sonuc = sonuc.filter(r => esikKontrol(r, thresholdRows).length > 0)
    }
    return sonuc
  })()

  const exportCSV = () => {
    if (data.length === 0) return
    const rows = sadeceAlarm || birimId ? filtrelenmisData : data
    if (rows.length === 0) return
    const headers = ['Tarih','Saat','Cihaz','MAC','Kapi','Sicaklik','Nem','Basinc','Ses','CPU','RAM','WiFi','MQTT-L','MQTT-A']
    const csvRows = rows.map(r => [
      new Date(r.recorded_at).toLocaleDateString('tr-TR'),
      new Date(r.recorded_at).toLocaleTimeString('tr-TR'),
      r.device_id, r.mac || '',
      r.kapi === true ? 'Acik' : r.kapi === false ? 'Kapali' : '-',
      r.sicaklik?.toFixed(1) ?? '', r.nem?.toFixed(0) ?? '', r.basinc?.toFixed(0) ?? '',
      r.ses?.toFixed(3) ?? '', r.cpu?.toFixed(1) ?? '', (r.ram / 1024).toFixed(0) ?? '',
      r.wifi_rssi?.toString() ?? '',
      r.mqtt_lokal ? 'Evet' : 'Hayir', r.mqtt_aio ? 'Evet' : 'Hayir',
    ])
    const csv = '\uFEFF' + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const rows = sadeceAlarm || birimId ? filtrelenmisData : data
    if (rows.length === 0) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportXML = () => {
    const rows = sadeceAlarm || birimId ? filtrelenmisData : data
    if (rows.length === 0) return
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<kolla_rapor>\n'
    rows.forEach(r => {
      xml += `  <kayit>\n    <tarih>${new Date(r.recorded_at).toISOString()}</tarih>\n    <cihaz>${r.device_id}</cihaz>\n    <mac>${r.mac || ''}</mac>\n    <sicaklik>${r.sicaklik ?? ''}</sicaklik>\n    <nem>${r.nem ?? ''}</nem>\n    <basinc>${r.basinc ?? ''}</basinc>\n    <ses>${r.ses ?? ''}</ses>\n    <cpu>${r.cpu ?? ''}</cpu>\n    <ram>${r.ram ?? ''}</ram>\n    <wifi>${r.wifi_rssi ?? ''}</wifi>\n  </kayit>\n`
    })
    xml += '</kolla_rapor>'
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.xml`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportXLS = () => {
    const rows = sadeceAlarm || birimId ? filtrelenmisData : data
    if (rows.length === 0) return
    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Rapor</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>`
    tableHtml += '<tr><th>Tarih</th><th>Saat</th><th>Cihaz</th><th>MAC</th><th>Kapı</th><th>Sıcaklık</th><th>Nem</th><th>Basınç</th><th>Ses</th><th>CPU</th><th>RAM</th><th>WiFi</th><th>MQTT-L</th><th>MQTT-A</th></tr>'
    rows.forEach(r => {
      tableHtml += `<tr><td>${new Date(r.recorded_at).toLocaleDateString('tr-TR')}</td><td>${new Date(r.recorded_at).toLocaleTimeString('tr-TR')}</td><td>${r.device_id}</td><td>${r.mac || ''}</td><td>${r.kapi === true ? 'Acik' : r.kapi === false ? 'Kapali' : '-'}</td><td>${r.sicaklik?.toFixed(1) ?? ''}</td><td>${r.nem?.toFixed(0) ?? ''}</td><td>${r.basinc?.toFixed(0) ?? ''}</td><td>${r.ses?.toFixed(3) ?? ''}</td><td>${r.cpu?.toFixed(1) ?? ''}</td><td>${(r.ram / 1024).toFixed(0) ?? ''}</td><td>${r.wifi_rssi ?? ''}</td><td>${r.mqtt_lokal ? 'Evet' : 'Hayir'}</td><td>${r.mqtt_aio ? 'Evet' : 'Hayir'}</td></tr>`
    })
    tableHtml += '</table></body></html>'
    const url = URL.createObjectURL(new Blob([tableHtml], { type: 'application/vnd.ms-excel' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.xls`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportPrint = () => { window.print() }

  const gosterilecekData = gorunum === 'alarm'
    ? filtrelenmisData.filter(r => esikKontrol(r, thresholdRows).length > 0)
    : gorunum === 'cihaz'
      ? [...new Set(filtrelenmisData.map(r => r.device_id))].flatMap(did => {
          const rows = filtrelenmisData.filter(r => r.device_id === did)
          const son = rows[0]
          const ihlal = esikKontrol(son, thresholdRows)
          return [{
            device_id: did,
            mac: son.mac,
            kayit: rows.length,
            sonTarih: son.recorded_at,
            sicaklik: son.sicaklik,
            nem: son.nem,
            basinc: son.basinc,
            ihlal: ihlal.length > 0,
            ihlalSayisi: ihlal.length,
          }]
        })
      : null

  const dataRows = gorunum === 'tablo' ? filtrelenmisData : []

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Raporlar</h1>

      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Cihaz</span>
            <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 min-w-[160px]">
              <option value="">Tüm Cihazlar</option>
              {cihazlar.map(c => <option key={c} value={c}>{cihazDetayMap.get(c)?.ad || c}</option>)}
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Birim</span>
            <select value={birimId ?? ''} onChange={e => setBirimId(e.target.value ? Number(e.target.value) : null)}
              className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 min-w-[160px]">
              <option value="">Tüm Birimler</option>
              {birimAgac.map(b => (
                <option key={b.id} value={b.id}>
                  {'│ '.repeat(b.depth)}{b.ad} ({tipEtiket[b.tip]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Zaman Aralığı</span>
            <div className="flex gap-1 flex-wrap">
              {zamanSecenek.map(z => (
                <button key={z.sn} onClick={() => { setZaman(z.sn); setOzelMod(false) }}
                  className={`px-3 py-1.5 rounded-lg text-xs ${!ozelMod && zaman === z.sn ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>{z.label}</button>
              ))}
              <button onClick={() => setOzelMod(!ozelMod)}
                className={`px-3 py-1.5 rounded-lg text-xs ${ozelMod ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>Özel</button>
            </div>
          </div>
          {ozelMod && (
            <>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Başlangıç</span>
                <input type="datetime-local" value={ozelBas} onChange={e => setOzelBas(e.target.value)}
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Bitiş</span>
                <input type="datetime-local" value={ozelBit} onChange={e => setOzelBit(e.target.value)}
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
              </div>
            </>
          )}
          <button onClick={getir} disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Yükleniyor...' : 'Getir'}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={sadeceAlarm} onChange={e => setSadeceAlarm(e.target.checked)}
              className="accent-red-500" />
            <span className="text-red-400">Sadece eşik ihlalleri</span>
          </label>
          <div className="flex gap-1">
            {(['tablo', 'cihaz', 'sensor', 'alarm'] as const).map(g => (
              <button key={g} onClick={() => setGorunum(g)}
                className={`px-3 py-1 rounded-lg text-xs ${gorunum === g ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {g === 'tablo' ? 'Tablo' : g === 'cihaz' ? 'Cihaz Özeti' : g === 'sensor' ? 'Sensörler' : 'Alarmlar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hata && <p className="text-red-400 mb-4">{hata}</p>}

      {data.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-400">
              {toplam} kayıt
              {(sadeceAlarm || birimId) && <span className="text-emerald-400"> → {filtrelenmisData.length} filtrelendi</span>}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCSV} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">CSV</button>
              <button onClick={exportXLS} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">XLS (Excel)</button>
              <button onClick={exportJSON} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">JSON</button>
              <button onClick={exportXML} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">XML</button>
              <button onClick={exportPrint} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">Yazdır / PDF</button>
            </div>
          </div>

          {gorunum === 'tablo' && (
            <div className="overflow-x-auto rounded-2xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Tarih</th>
                    <th className="text-left px-3 py-2">Saat</th>
                    <th className="text-left px-3 py-2">Cihaz</th>
                    <th className="text-left px-3 py-2">MAC</th>
                    <th className="text-center px-3 py-2">Kapı</th>
                    <th className="text-right px-3 py-2">Sıcaklık</th>
                    <th className="text-right px-3 py-2">Nem</th>
                    <th className="text-right px-3 py-2">Basınç</th>
                    <th className="text-right px-3 py-2">Ses</th>
                    <th className="text-right px-3 py-2">CPU</th>
                    <th className="text-right px-3 py-2">RAM</th>
                    <th className="text-right px-3 py-2">WiFi</th>
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map(r => {
                    const ihlal = esikKontrol(r, thresholdRows)
                    return (
                      <tr key={r.id || r.recorded_at} className={`border-t border-gray-700/50 hover:bg-gray-800/50 ${ihlal.length > 0 ? 'bg-red-900/10' : ''} ${r.kapi ? 'bg-amber-900/10' : ''}`}>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{new Date(r.recorded_at).toLocaleDateString('tr-TR')}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(r.recorded_at).toLocaleTimeString('tr-TR')}</td>
                        <td className="px-3 py-2 text-emerald-300">
                          {cihazDetayMap.get(r.device_id)?.ad || r.device_id}
                          {ihlal.length > 0 && <span className="ml-1 text-red-400" title={`${ihlal.join(', ')} eşik dışı`}>⚠</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{r.mac || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          {r.kapi === true ? <span className="text-amber-400" title="Kapı açık">🚪</span> : r.kapi === false ? <span className="text-gray-600">●</span> : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-red-300">{r.sicaklik?.toFixed(1)}°C</td>
                        <td className="px-3 py-2 text-right text-sky-300">{r.nem?.toFixed(0)}%</td>
                        <td className="px-3 py-2 text-right text-emerald-300">{r.basinc?.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right text-yellow-300">{r.ses?.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right text-orange-300">{r.cpu?.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right text-purple-300">{(r.ram / 1024).toFixed(0)}K</td>
                        <td className="px-3 py-2 text-right text-gray-400">{r.wifi_rssi ?? '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {gorunum === 'cihaz' && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...new Set(filtrelenmisData.map(r => r.device_id))].map(did => {
                const rows = filtrelenmisData.filter(r => r.device_id === did)
                const son = rows[0]
                const ihlal = thresholdRows.filter(t => t.device_id === did && t.enabled)
                const aktifIhlal = rows.filter(r => esikKontrol(r, thresholdRows).length > 0).length
                const detay = cihazDetayMap.get(did)
                const sicaklik = rows.map(r => r.sicaklik).filter((v): v is number => v !== null && v !== undefined)
                const ortSicaklik = sicaklik.length > 0 ? sicaklik.reduce((a, b) => a + b, 0) / sicaklik.length : 0
                return (
                  <div key={did} className={`bg-gray-800 rounded-2xl p-4 border ${aktifIhlal > 0 ? 'border-red-700/50' : 'border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm text-emerald-300">{detay?.ad || did}</h3>
                      {aktifIhlal > 0 && <span className="text-xs text-red-400">⚠ {aktifIhlal} ihlal</span>}
                    </div>
                    {detay?.konum && <p className="text-[10px] text-gray-500 mb-2">{detay.konum}</p>}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500">Kayıt:</span> <span className="text-gray-300">{rows.length}</span></div>
                      <div><span className="text-gray-500">Ort. Sıcaklık:</span> <span className="text-red-300">{ortSicaklik.toFixed(1)}°C</span></div>
                      <div><span className="text-gray-500">MAC:</span> <span className="text-gray-400 font-mono">{son.mac || '-'}</span></div>
                      <div><span className="text-gray-500">Eşik:</span> <span className="text-gray-400">{ihlal.length} aktif</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {gorunum === 'sensor' && (
            <div className="overflow-x-auto rounded-2xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Tarih</th>
                    <th className="text-left px-3 py-2">Cihaz</th>
                    <th className="text-left px-3 py-2">Sensör</th>
                    <th className="text-left px-3 py-2">Metrik</th>
                    <th className="text-right px-3 py-2">Değer</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorData.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-8">Sensör verisi bulunamadı</td></tr>
                  ) : sensorData.map((r: any, i: number) => (
                    <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{new Date(r.recorded_at).toLocaleString('tr-TR')}</td>
                      <td className="px-3 py-2 text-emerald-300">{r.device_id}</td>
                      <td className="px-3 py-2 text-gray-200">{r.sensor_id}</td>
                      <td className="px-3 py-2 text-gray-400">{r.metric}</td>
                      <td className="px-3 py-2 text-right text-white">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gorunum === 'alarm' && (
            <div className="space-y-2">
              {filtrelenmisData.filter(r => esikKontrol(r, thresholdRows).length > 0).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Eşik ihlali bulunamadı</p>
              ) : (
                filtrelenmisData.filter(r => esikKontrol(r, thresholdRows).length > 0).map(r => {
                  const ihlal = esikKontrol(r, thresholdRows)
                  return (
                    <div key={r.id || r.recorded_at} className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">⚠</span>
                          <span className="font-medium text-sm text-red-300">{cihazDetayMap.get(r.device_id)?.ad || r.device_id}</span>
                          <span className="text-xs text-gray-500">{r.device_id}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(r.recorded_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        {ihlal.map(m => {
                          const esik = thresholdRows.find(t => t.device_id === r.device_id && t.metric === m)
                          const deger = (r as any)[m]
                          const etiket: Record<string, string> = { sicaklik: 'Sıcaklık', nem: 'Nem', basinc: 'Basınç', ses: 'Ses', cpu: 'CPU', ram: 'RAM' }
                          return (
                            <span key={m} className="text-red-400">
                              {etiket[m] || m}: {deger?.toFixed(1)} (limit: {esik?.min_val}-{esik?.max_val})
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          <style jsx>{`
            @media print {
              aside, nav, button, select, input { display: none !important; }
              body { background: white; color: black; }
            }
          `}</style>
        </>
      )}

      {!loading && data.length === 0 && !hata && (
        <p className="text-gray-500 text-center mt-10">Filtreleri seçip "Getir" butonuna tıklayın</p>
      )}
    </div>
  )
}
