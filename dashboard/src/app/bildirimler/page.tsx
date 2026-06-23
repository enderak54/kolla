'use client'

import { useEffect, useState } from 'react'

interface Bildirim {
  id: number
  device_id: string | null
  tip: string
  baslik: string
  mesaj: string
  kanal: string
  durum: string
  created_at: string
}

const tipIkon: Record<string, string> = { esik_ihlali: '⚠', kapi_acik: '🚪', cihaz_kopma: '📡', uyari: '⚡', bilgi: 'ℹ' }
const tipRenk: Record<string, string> = {
  esik_ihlali: 'bg-red-900/20 border-red-700/40 text-red-300',
  kapi_acik: 'bg-amber-900/20 border-amber-700/40 text-amber-300',
  cihaz_kopma: 'bg-orange-900/20 border-orange-700/40 text-orange-300',
  uyari: 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300',
  bilgi: 'bg-blue-900/20 border-blue-700/40 text-blue-300',
}

export default function BildirimlerPage() {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('')

  const fetchBildirimler = async (durum?: string) => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (durum) params.set('durum', durum)
      const res = await fetch(`/api/bildirim?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setBildirimler(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchBildirimler() }, [])

  const onayla = async (id: number) => {
    await fetch('/api/bildirim', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, durum: 'onaylandi' }),
    })
    setBildirimler(prev => prev.map(b => b.id === id ? { ...b, durum: 'onaylandi' } : b))
  }

  const filtrelenmis = filtre ? bildirimler.filter(b => b.tip === filtre || b.durum === filtre) : bildirimler

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Bildirimler</h1>
        <div className="flex gap-2">
          <button onClick={() => { setFiltre(''); fetchBildirimler() }} className={`px-3 py-1.5 rounded-lg text-xs ${!filtre ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>Tümü</button>
          <button onClick={() => setFiltre('bekliyor')} className={`px-3 py-1.5 rounded-lg text-xs ${filtre === 'bekliyor' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>Bekleyen</button>
          <button onClick={() => setFiltre('onaylandi')} className={`px-3 py-1.5 rounded-lg text-xs ${filtre === 'onaylandi' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>Onaylanan</button>
          <button onClick={() => setFiltre('esik_ihlali')} className={`px-3 py-1.5 rounded-lg text-xs ${filtre === 'esik_ihlali' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>Eşik İhlali</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Yükleniyor...</p>
      ) : filtrelenmis.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Bildirim bulunmuyor</p>
      ) : (
        <div className="space-y-2">
          {filtrelenmis.map(b => (
            <div key={b.id} className={`rounded-xl px-4 py-3 border ${tipRenk[b.tip] || 'bg-gray-800 border-gray-700 text-gray-300'} ${b.durum === 'bekliyor' ? 'ring-1 ring-red-500/30' : 'opacity-70'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tipIkon[b.tip] || '📋'}</span>
                  <div>
                    <span className="font-medium text-sm">{b.baslik}</span>
                    {b.device_id && <span className="text-[10px] text-gray-500 ml-2">{b.device_id}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{new Date(b.created_at).toLocaleString('tr-TR')}</span>
                  {b.durum === 'bekliyor' && (
                    <button onClick={() => onayla(b.id)} className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] px-2 py-1 rounded">Onayla</button>
                  )}
                </div>
              </div>
              {b.mesaj && <p className="text-xs text-gray-400 mt-1 ml-7">{b.mesaj}</p>}
              <div className="flex gap-2 mt-1 ml-7">
                <span className="text-[10px] text-gray-600">{b.kanal}</span>
                <span className={`text-[10px] ${b.durum === 'bekliyor' ? 'text-red-400' : 'text-gray-500'}`}>{b.durum}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
