'use client'

import { useEffect, useState } from 'react'

interface TelemetryData {
  sicaklik: number
  nem: number
  basinc: number
  ses: number
  cpu: number
  ram: number
  wifiRssi?: number
  mqttLokal?: number
  mqttAio?: number
  timestamp: number
}

export default function Home() {
  const [data, setData] = useState<TelemetryData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/telemetry')
        const json = await res.json()
        if (json.latest) setData(json.latest)
      } catch {
        setError('Veri alinamadi')
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const aktif = data && (Date.now() - data.timestamp) < 15000

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">Medikal Takip</h1>
      {error && <p className="text-red-400">{error}</p>}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <StatusBadge label="ESP32" active={!!aktif} />
          <StatusBadge label="Wi-Fi" active={!!aktif} detail={data?.wifiRssi !== undefined ? `${data.wifiRssi} dBm` : undefined} />
          <StatusBadge label="MQTT Lokal" active={data?.mqttLokal === 1} />
          <StatusBadge label="Adafruit IO" active={data?.mqttAio === 1} />
        </div>
      </div>
      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            <Card label="Sıcaklık" value={`${data.sicaklik.toFixed(1)}°C`} />
            <Card label="Nem" value={`${data.nem.toFixed(0)}%`} />
            <Card label="Basınç" value={`${data.basinc.toFixed(0)} hPa`} />
            <Card label="Ses" value={data.ses.toFixed(3)} />
            <Card label="CPU Sıcaklık" value={`${data.cpu.toFixed(1)}°C`} />
            <Card label="Boş RAM" value={`${(data.ram / 1024).toFixed(0)} KB`} />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Son güncelleme: {new Date(data.timestamp).toLocaleTimeString('tr-TR')}
          </p>
        </>
      ) : (
        <p className="text-gray-400">Veri bekleniyor...</p>
      )}
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
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col items-center shadow-lg border border-gray-700">
      <span className="text-sm text-gray-400 mb-1">{label}</span>
      <span className="text-2xl font-semibold text-emerald-300">{value}</span>
    </div>
  )
}
