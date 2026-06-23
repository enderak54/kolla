'use client'

import { useEffect, useState, useRef } from 'react'

interface KameraKayit {
  id: number
  device_id: string
  dosya_adi: string
  storage_path: string
  boyut: number
  tetikleyici: string
  etiket: string
  captured_at: string
}

const SUPABASE_URL = 'https://fpcvwfqhungfeukgophd.supabase.co'

export default function KameraPage() {
  const [kayitlar, setKayitlar] = useState<KameraKayit[]>([])
  const [cihazlar, setCihazlar] = useState<string[]>([])
  const [cihazAdMap, setCihazAdMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [deviceId, setDeviceId] = useState('')
  const [secili, setSecili] = useState<KameraKayit | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const getir = async (did?: string) => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (did || deviceId) params.set('device_id', did || deviceId)
      const res = await fetch(`/api/kamera?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setKayitlar(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    fetch('/api/cihazlar').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setCihazlar(d.map((c: any) => c.device_id))
        const map = new Map<string, string>()
        d.forEach((c: any) => map.set(c.device_id, c.ad || c.device_id))
        setCihazAdMap(map)
      }
    })
    getir()
  }, [])

  const sil = async (id: number) => {
    if (!confirm('Bu fotoğrafı sil?')) return
    await fetch(`/api/kamera?id=${id}`, { method: 'DELETE' })
    setKayitlar(prev => prev.filter(k => k.id !== id))
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('device_id', deviceId || cihazlar[0] || 'KOLLA-000001')
    await fetch('/api/kamera/yukle', { method: 'POST', body: formData })
    setUploading(false)
    getir()
  }

  const storageUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/kamera/${path}`

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Kamera Galerisi</h1>
        <div className="flex items-center gap-3">
          <select value={deviceId} onChange={e => { setDeviceId(e.target.value); getir(e.target.value) }}
            className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600">
            <option value="">Tüm Cihazlar</option>
            {cihazlar.map(c => <option key={c} value={c}>{cihazAdMap.get(c) || c}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Yükleniyor...</p> : kayitlar.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Henüz fotoğraf yok</p>
          <p className="text-gray-600 text-sm mt-1">ESP32-CAM'den gelen snapshotlar veya manuel yüklemeler burada görünecek</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {kayitlar.map(k => (
            <div key={k.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-emerald-700 transition-colors group">
              <button onClick={() => setSecili(k)} className="w-full aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                <img src={storageUrl(k.storage_path)} alt={k.dosya_adi}
                  className="w-full h-full object-cover" loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23374151" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239CA3AF" font-size="10">Yüklenemedi</text></svg>' }} />
              </button>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 truncate">{cihazAdMap.get(k.device_id) || k.device_id}</span>
                  <span className="text-[10px] text-gray-500">{k.tetikleyici}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">{new Date(k.captured_at).toLocaleString('tr-TR')}</p>
                {k.etiket && <p className="text-[10px] text-gray-500 mt-1 truncate">{k.etiket}</p>}
                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => sil(k.id)} className="text-[10px] text-red-400 hover:text-red-300">Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {secili && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSecili(null)}>
          <div className="max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-emerald-400 text-sm">{cihazAdMap.get(secili.device_id) || secili.device_id}</span>
                <span className="text-gray-500 text-xs ml-3">{new Date(secili.captured_at).toLocaleString('tr-TR')}</span>
                <span className="text-gray-600 text-xs ml-3">{secili.tetikleyici}</span>
              </div>
              <button onClick={() => setSecili(null)} className="text-white text-xl">&times;</button>
            </div>
            <img src={storageUrl(secili.storage_path)} alt={secili.dosya_adi}
              className="max-h-[80vh] rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
