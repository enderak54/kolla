'use client'

import { useEffect, useState } from 'react'

interface TelemetryData {
  sicaklik: number
  nem: number
  basinc: number
  ses: number
  cpu: number
  ram: number
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 text-emerald-400">Medikal Takip</h1>
      {error && <p className="text-red-400">{error}</p>}
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
          <p className="text-xs text-gray-500 mt-6">
            Son güncelleme: {new Date(data.timestamp).toLocaleTimeString('tr-TR')}
          </p>
        </>
      ) : (
        <p className="text-gray-400">Veri bekleniyor...</p>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col items-center shadow-lg border border-gray-700">
      <span className="text-sm text-gray-400 mb-1">{label}</span>
      <span className="text-2xl font-semibold text-emerald-300">{value}</span>
    </div>
  )
}
