import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export interface TelemetryData {
  device_id?: string; mac?: string; sicaklik: number; nem: number; basinc: number; ses: number; cpu: number; ram: number
  wifiRssi?: number; mqttLokal?: number; mqttAio?: number; timestamp: number; kapi?: boolean | null
}

export interface Threshold { metric: string; min_val: number; max_val: number; enabled: boolean }
export interface Ayar { anahtar: string; deger: string; kategori: string; aciklama: string }

const cardColors: Record<string, { border: string; bg: string; text: string }> = {
  red:    { border: 'border-red-600',       bg: 'bg-red-950/30',    text: 'text-red-300' },
  blue:   { border: 'border-sky-500',        bg: 'bg-sky-950/30',    text: 'text-sky-300' },
  green:  { border: 'border-emerald-500',    bg: 'bg-emerald-950/30',text: 'text-emerald-300' },
  yellow: { border: 'border-yellow-500',     bg: 'bg-yellow-950/30', text: 'text-yellow-300' },
  orange: { border: 'border-orange-500',     bg: 'bg-orange-950/30', text: 'text-orange-300' },
  purple: { border: 'border-purple-500',     bg: 'bg-purple-950/30', text: 'text-purple-300' },
}

export function SensorCard({ label, value, color, threshold, val }: { label: string; value: string; color: string; threshold?: Threshold; val: number }) {
  const c = cardColors[color] ?? cardColors.green
  const alert = threshold?.enabled && (val < threshold.min_val || val > threshold.max_val)
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center shadow-lg border ${alert ? 'border-red-500 bg-red-950/40' : `${c.border} ${c.bg}`}`}>
      <span className="text-sm text-gray-400 mb-1">{label}</span>
      <span className={`text-2xl font-semibold ${alert ? 'text-red-400' : c.text}`}>{value}</span>
      {threshold?.enabled && (
        <span className="text-[10px] text-gray-500 mt-1">limit: {threshold.min_val}-{threshold.max_val}</span>
      )}
    </div>
  )
}

export function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = cardColors[color ?? 'green'] ?? cardColors.green
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center shadow-lg border ${c.border} ${c.bg}`}>
      <span className="text-sm text-gray-400 mb-1">{label}</span>
      <span className={`text-2xl font-semibold ${c.text}`}>{value}</span>
    </div>
  )
}

export function ThresholdCard({ threshold, onUpdate }: { threshold: Threshold; onUpdate: (t: any) => void }) {
  const [min, setMin] = useState(threshold.min_val)
  const [max, setMax] = useState(threshold.max_val)
  const [enabled, setEnabled] = useState(threshold.enabled)
  const [saving, setSaving] = useState(false)
  const labels: Record<string, string> = {
    sicaklik: 'Sıcaklık °C', nem: 'Nem %', basinc: 'Basınç hPa',
    gaz: 'Gaz ppm', gaz_lpg: 'LPG ppm', gaz_co: 'CO ppm', gaz_duman: 'Duman ppm', gaz_metan: 'Metan ppm', gaz_hidrojen: 'Hidrojen ppm',
  }

  const save = async () => {
    setSaving(true)
    onUpdate({ metric: threshold.metric, min_val: min, max_val: max, enabled })
    setTimeout(() => setSaving(false), 1000)
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{labels[threshold.metric] || threshold.metric}</h3>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500">Min</label>
          <input type="number" step="0.1" value={min} onChange={e => setMin(parseFloat(e.target.value))}
            className="w-full bg-gray-700 rounded-lg px-2 py-1 text-sm text-white border border-gray-600" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500">Max</label>
          <input type="number" step="0.1" value={max} onChange={e => setMax(parseFloat(e.target.value))}
            className="w-full bg-gray-700 rounded-lg px-2 py-1 text-sm text-white border border-gray-600" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
            className="accent-emerald-500" />
          Aktif
        </label>
        <button onClick={save} disabled={saving}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1 rounded-lg disabled:opacity-50">
          {saving ? 'Kaydedildi' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}

export function AyarSatir({ ayar, secenekler, onUpdate }: { ayar: Ayar; secenekler: Record<string, string[]>; onUpdate: (k: string, v: string) => void }) {
  const opts = secenekler[ayar.anahtar]
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400 flex-1">{ayar.aciklama || ayar.anahtar}</span>
      {opts ? (
        <select value={ayar.deger} onChange={e => onUpdate(ayar.anahtar, e.target.value)}
          className="w-28 bg-gray-700 rounded px-2 py-1 text-xs text-white text-right border border-gray-600">
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={ayar.deger} onChange={e => onUpdate(ayar.anahtar, e.target.value)}
          className="w-24 bg-gray-700 rounded px-2 py-1 text-xs text-white text-right border border-gray-600" />
      )}
    </div>
  )
}

export function MiniChart({ data, dataKey, color, name }: { data: TelemetryData[]; dataKey: string; color: string; name: string }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-2">{name}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString('tr-TR') }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#9CA3AF', fontSize: 9 }} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} name={name} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StatusBadge({ label, active, detail }: { label: string; active: boolean; detail?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${active ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-red-400'}`} />
      <span>{label}</span>
      {detail && <span className="text-xs opacity-70">({detail})</span>}
    </div>
  )
}

export function SinyalGosterge({ rssi }: { rssi: number | undefined }) {
  if (rssi === undefined) return <span className="text-xs text-gray-500">--</span>
  const seviye = rssi >= -50 ? 4 : rssi >= -65 ? 3 : rssi >= -80 ? 2 : 1
  const renk = seviye >= 3 ? 'bg-emerald-400' : seviye === 2 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-[2px] h-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-[3px] rounded-sm ${i <= seviye ? renk : 'bg-gray-600'}`}
            style={{ height: `${i * 4}px` }} />
        ))}
      </div>
      <span className="text-xs text-gray-400">{rssi} dBm</span>
    </div>
  )
}

export function OzetKarti({ data }: { data: TelemetryData[] }) {
  if (data.length === 0) return null
  const vals = data.map(d => d.sicaklik).filter((v): v is number => v !== undefined)
  const min = Math.min(...vals); const max = Math.max(...vals); const ort = vals.reduce((a, b) => a + b, 0) / vals.length
  const nemVals = data.map(d => d.nem).filter((v): v is number => v !== undefined)
  const nemMin = Math.min(...nemVals); const nemMax = Math.max(...nemVals)
  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Son 24s Özet</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <span className="text-[10px] text-gray-500">Sıcaklık</span>
          <p className="text-emerald-300 text-lg font-semibold">{ort.toFixed(1)}°C</p>
          <p className="text-[10px] text-gray-600">{min.toFixed(1)} - {max.toFixed(1)}</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500">Nem</span>
          <p className="text-sky-300 text-lg font-semibold">{nemMin.toFixed(0)}-{nemMax.toFixed(0)}%</p>
        </div>
        <div>
          <span className="text-[10px] text-gray-500">Veri</span>
          <p className="text-gray-300 text-lg font-semibold">{data.length}</p>
          <p className="text-[10px] text-gray-600">kayıt</p>
        </div>
      </div>
    </div>
  )
}

export function AlarmPaneli({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null
  return (
    <div className="w-full max-w-4xl space-y-2 mb-4">
      {alerts.map((a, i) => (
        <div key={i} className="bg-red-900/30 border border-red-600/50 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-3">
          <span>⚠</span>
          <span>{a}</span>
        </div>
      ))}
    </div>
  )
}

export function CSVExport({ data, filename }: { data: TelemetryData[]; filename: string }) {
  const exportCSV = () => {
    if (data.length === 0) return
    const headers = ['Tarih', 'Saat', 'Sicaklik', 'Nem', 'Basinc', 'Ses', 'CPU', 'RAM', 'WiFi']
    const rows = data.map(d => [
      new Date(d.timestamp).toLocaleDateString('tr-TR'),
      new Date(d.timestamp).toLocaleTimeString('tr-TR'),
      d.sicaklik?.toFixed(1) ?? '', d.nem?.toFixed(0) ?? '', d.basinc?.toFixed(0) ?? '',
      d.ses?.toFixed(3) ?? '', d.cpu?.toFixed(1) ?? '', d.ram?.toString() ?? '',
      d.wifiRssi?.toString() ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    a.click(); URL.revokeObjectURL(url)
  }
  return (
    <button onClick={exportCSV} disabled={data.length === 0}
      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-xs flex items-center gap-2">
      <span>↓</span> CSV
    </button>
  )
}
