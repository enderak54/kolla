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
}

const zamanSecenek = [
  { label: 'Son 1s', sn: 3600 },
  { label: 'Son 6s', sn: 21600 },
  { label: 'Son 24s', sn: 86400 },
  { label: 'Son 7g', sn: 604800 },
  { label: 'Son 30g', sn: 2592000 },
  { label: 'Son 90g', sn: 7776000 },
]

export default function RaporlarPage() {
  const [data, setData] = useState<TelemetryRow[]>([])
  const [cihazlar, setCihazlar] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [zaman, setZaman] = useState(86400)
  const [ozelBas, setOzelBas] = useState('')
  const [ozelBit, setOzelBit] = useState('')
  const [ozelMod, setOzelMod] = useState(false)
  const [toplam, setToplam] = useState(0)
  const [hata, setHata] = useState('')

  useEffect(() => {
    fetch('/api/cihazlar').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCihazlar(d.map((c: any) => c.device_id))
    }).catch(() => {})
  }, [])

  const getir = async () => {
    setLoading(true); setHata('')
    try {
      let bas = ozelMod ? ozelBas : new Date(Date.now() - zaman * 1000).toISOString()
      let bit = ozelMod ? ozelBit : new Date().toISOString()
      const params = new URLSearchParams({ bas_tarih: bas, bit_tarih: bit, limit: '10000' })
      if (deviceId) params.set('device_id', deviceId)
      const res = await fetch(`/api/telemetry/rapor?${params}`)
      const rows = await res.json()
      if (Array.isArray(rows)) { setData(rows); setToplam(rows.length) }
      else setHata('Veri alinamadi')
    } catch { setHata('Baglanti hatasi') } finally { setLoading(false) }
  }

  const exportCSV = () => {
    if (data.length === 0) return
    const headers = ['Tarih','Saat','Cihaz','MAC','Sicaklik','Nem','Basinc','Ses','CPU','RAM','WiFi','MQTT-L','MQTT-A']
    const rows = data.map(r => [
      new Date(r.recorded_at).toLocaleDateString('tr-TR'),
      new Date(r.recorded_at).toLocaleTimeString('tr-TR'),
      r.device_id, r.mac || '',
      r.sicaklik?.toFixed(1) ?? '', r.nem?.toFixed(0) ?? '', r.basinc?.toFixed(0) ?? '',
      r.ses?.toFixed(3) ?? '', r.cpu?.toFixed(1) ?? '', (r.ram / 1024).toFixed(0) ?? '',
      r.wifi_rssi?.toString() ?? '',
      r.mqtt_lokal ? 'Evet' : 'Hayir', r.mqtt_aio ? 'Evet' : 'Hayir',
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    if (data.length === 0) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportPrint = () => { window.print() }

  const exportXML = () => {
    if (data.length === 0) return
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<kolla_rapor>\n'
    data.forEach(r => {
      xml += `  <kayit>\n    <tarih>${new Date(r.recorded_at).toISOString()}</tarih>\n    <cihaz>${r.device_id}</cihaz>\n    <mac>${r.mac || ''}</mac>\n    <sicaklik>${r.sicaklik ?? ''}</sicaklik>\n    <nem>${r.nem ?? ''}</nem>\n    <basinc>${r.basinc ?? ''}</basinc>\n    <ses>${r.ses ?? ''}</ses>\n    <cpu>${r.cpu ?? ''}</cpu>\n    <ram>${r.ram ?? ''}</ram>\n    <wifi>${r.wifi_rssi ?? ''}</wifi>\n  </kayit>\n`
    })
    xml += '</kolla_rapor>'
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `kolla_rapor_${Date.now()}.xml`
    a.click(); URL.revokeObjectURL(url)
  }

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
              {cihazlar.map(c => <option key={c} value={c}>{c}</option>)}
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
      </div>

      {hata && <p className="text-red-400 mb-4">{hata}</p>}

      {data.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">{toplam} kayıt bulundu</p>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">CSV</button>
              <button onClick={exportJSON} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">JSON</button>
              <button onClick={exportXML} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">XML</button>
              <button onClick={exportPrint} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs">Yazdır / PDF</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Tarih</th>
                  <th className="text-left px-3 py-2">Saat</th>
                  <th className="text-left px-3 py-2">Cihaz</th>
                  <th className="text-left px-3 py-2">MAC</th>
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
                {data.map(r => (
                  <tr key={r.id || r.recorded_at} className="border-t border-gray-700/50 hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{new Date(r.recorded_at).toLocaleDateString('tr-TR')}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(r.recorded_at).toLocaleTimeString('tr-TR')}</td>
                    <td className="px-3 py-2 text-emerald-300">{r.device_id}</td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{r.mac || '-'}</td>
                    <td className="px-3 py-2 text-right text-red-300">{r.sicaklik?.toFixed(1)}°C</td>
                    <td className="px-3 py-2 text-right text-sky-300">{r.nem?.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{r.basinc?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-yellow-300">{r.ses?.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{r.cpu?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{(r.ram / 1024).toFixed(0)}K</td>
                    <td className="px-3 py-2 text-right text-gray-400">{r.wifi_rssi ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && data.length === 0 && !hata && (
        <p className="text-gray-500 text-center mt-10">Filtreleri seçip "Getir" butonuna tıklayın</p>
      )}

      <style jsx>{`
        @media print {
          aside, nav, button, select, input { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  )
}
