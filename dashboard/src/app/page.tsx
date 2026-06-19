'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface TelemetryData {
  sicaklik: number; nem: number; basinc: number; ses: number; cpu: number; ram: number
  wifiRssi?: number; mqttLokal?: number; mqttAio?: number; timestamp: number
}

interface Threshold { metric: string; min_val: number; max_val: number; enabled: boolean }

export default function Home() {
  const [data, setData] = useState<TelemetryData | null>(null)
  const [history, setHistory] = useState<TelemetryData[]>([])
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [timeRange, setTimeRange] = useState(3600)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tr, tr2] = await Promise.all([
          fetch('/api/telemetry').then(r => r.json()),
          fetch('/api/thresholds').then(r => r.json()),
        ])
        if (tr.latest) setData(tr.latest)
        if (tr.history) setHistory(tr.history)
        if (Array.isArray(tr2)) setThresholds(tr2)
      } catch { setError('Veri alinamadi') }
    }
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  const aktif = data && (Date.now() - data.timestamp) < 15000
  const now = Date.now()
  const filteredHistory = history.filter(d => (now - d.timestamp) < timeRange * 1000)
  const thresholdMap = Object.fromEntries(thresholds.map(t => [t.metric, t]))
  const alertSicaklik = thresholdMap.sicaklik?.enabled && data && (data.sicaklik < thresholdMap.sicaklik.min_val || data.sicaklik > thresholdMap.sicaklik.max_val)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">Kolla Medikal Takip</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="w-full max-w-4xl flex flex-wrap gap-3 justify-center mb-6">
        <StatusBadge label="ESP32" active={!!aktif} />
        <StatusBadge label="Wi-Fi" active={!!aktif} detail={data?.wifiRssi !== undefined ? `${data.wifiRssi} dBm` : undefined} />
        <StatusBadge label="MQTT Lokal" active={data?.mqttLokal === 1} />
        <StatusBadge label="Adafruit IO" active={data?.mqttAio === 1} />
      </div>
      {alertSicaklik && (
        <div className="w-full max-w-4xl bg-red-900/50 border border-red-500 rounded-xl px-5 py-3 mb-4 text-center text-red-300 font-semibold">
          ⚠ Sıcaklık uyarısı! {data!.sicaklik.toFixed(1)}°C (limit: {thresholdMap.sicaklik.min_val}-{thresholdMap.sicaklik.max_val}°C)
        </div>
      )}
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
          <div className="flex gap-2 mb-4">
            {[[3600,'1s'], [21600,'6s'], [86400,'24s']].map(([s, l]) => (
              <button key={s} onClick={() => setTimeRange(s as number)}
                className={`px-4 py-1 rounded-full text-sm ${timeRange === s ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredHistory.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString('tr-TR') }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="sicaklik" stroke="#EF4444" name="Sıcaklık °C" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="nem" stroke="#0EA5E9" name="Nem %" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="basinc" stroke="#10B981" name="Basınç hPa" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="w-full max-w-4xl mb-8">
        <h2 className="text-xl font-semibold mb-4 text-emerald-400">Eşik Değerler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {thresholds.map(t => (
            <ThresholdCard key={t.metric} threshold={t} onUpdate={(upd) => {
              fetch('/api/thresholds', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(upd) })
              setThresholds(prev => prev.map(p => p.metric === upd.metric ? { ...p, ...upd } : p))
            }} />
          ))}
        </div>
      </div>
      {data && (
        <p className="text-xs text-gray-500">Son: {new Date(data.timestamp).toLocaleTimeString('tr-TR')}</p>
      )}
    </div>
  )
}

function SensorCard({ label, value, color, threshold, val }: { label: string; value: string; color: string; threshold?: Threshold; val: number }) {
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

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = cardColors[color ?? 'green'] ?? cardColors.green
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center shadow-lg border ${c.border} ${c.bg}`}>
      <span className="text-sm text-gray-400 mb-1">{label}</span>
      <span className={`text-2xl font-semibold ${c.text}`}>{value}</span>
    </div>
  )
}

function ThresholdCard({ threshold, onUpdate }: { threshold: Threshold; onUpdate: (t: any) => void }) {
  const [min, setMin] = useState(threshold.min_val)
  const [max, setMax] = useState(threshold.max_val)
  const [enabled, setEnabled] = useState(threshold.enabled)
  const [saving, setSaving] = useState(false)
  const labels: Record<string, string> = { sicaklik: 'Sıcaklık °C', nem: 'Nem %', basinc: 'Basınç hPa' }

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

function StatusBadge({ label, active, detail }: { label: string; active: boolean; detail?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${active ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-red-400'}`} />
      <span>{label}</span>
      {detail && <span className="text-xs opacity-70">({detail})</span>}
    </div>
  )
}

const cardColors: Record<string, { border: string; bg: string; text: string }> = {
  red:    { border: 'border-red-600',       bg: 'bg-red-950/30',    text: 'text-red-300' },
  blue:   { border: 'border-sky-500',        bg: 'bg-sky-950/30',    text: 'text-sky-300' },
  green:  { border: 'border-emerald-500',    bg: 'bg-emerald-950/30',text: 'text-emerald-300' },
  yellow: { border: 'border-yellow-500',     bg: 'bg-yellow-950/30', text: 'text-yellow-300' },
  orange: { border: 'border-orange-500',     bg: 'bg-orange-950/30', text: 'text-orange-300' },
  purple: { border: 'border-purple-500',     bg: 'bg-purple-950/30', text: 'text-purple-300' },
}
