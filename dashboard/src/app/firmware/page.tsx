'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Firmware {
  id: number
  version: string
  dosya_url: string
  changelog: string
  target_device: string
  zorunlu: boolean
  boyut: number
  created_at: string
}

function FirmwareContent() {
  const searchParams = useSearchParams()
  const deviceIdParam = searchParams.get('device_id') || ''

  const [list, setList] = useState<Firmware[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState('')
  const [dosyaUrl, setDosyaUrl] = useState('')
  const [changelog, setChangelog] = useState('')
  const [zorunlu, setZorunlu] = useState(false)
  const [targetDevice, setTargetDevice] = useState(deviceIdParam)
  const [ekliyor, setEkliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')

  const fetchList = async () => {
    try {
      const res = await fetch('/api/firmware')
      const data = await res.json()
      if (Array.isArray(data)) setList(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { setTargetDevice(deviceIdParam) }, [deviceIdParam])
  useEffect(() => { fetchList() }, [])

  const ekle = async () => {
    if (!version || !dosyaUrl) return
    setEkliyor(true)
    try {
      const body: Record<string, unknown> = { version, dosya_url: dosyaUrl, changelog, zorunlu }
      if (targetDevice) body.target_device = targetDevice
      await fetch('/api/firmware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setVersion(''); setDosyaUrl(''); setChangelog(''); setZorunlu(false)
      setMesaj('Firmware eklendi')
      fetchList()
    } catch { setMesaj('Hata oluştu') } finally { setEkliyor(false) }
  }

  const sil = async (id: number) => {
    try {
      await fetch(`/api/firmware?id=${id}`, { method: 'DELETE' })
      setList(prev => prev.filter(f => f.id !== id))
      setMesaj('Firmware silindi')
    } catch { setMesaj('Silme hatası') }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <a href={targetDevice ? `/cihaz/${encodeURIComponent(targetDevice)}` : '/'} className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Geri</a>
      <h1 className="text-3xl font-bold mt-4 mb-6 text-emerald-400">Firmware Yönetimi</h1>
      {targetDevice && <p className="text-sm text-gray-400 mb-4">Hedef cihaz: <span className="text-emerald-300">{targetDevice}</span></p>}

      {mesaj && <p className="text-emerald-300 mb-4">{mesaj}</p>}

      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-8">
        <h2 className="text-lg font-semibold mb-4">Yeni Firmware Ekle</h2>
        <div className="space-y-3">
          <input placeholder="Versiyon (örn: 1.2.0)" value={version} onChange={e => setVersion(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <input placeholder="Dosya URL (GitHub release / raw .bin URL)" value={dosyaUrl} onChange={e => setDosyaUrl(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <input placeholder="Hedef cihaz (boş = tüm cihazlar)" value={targetDevice} onChange={e => setTargetDevice(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <textarea placeholder="Değişiklik notları" value={changelog} onChange={e => setChangelog(e.target.value)} rows={3}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={zorunlu} onChange={e => setZorunlu(e.target.checked)} className="accent-emerald-500" />
            Zorunlu güncelleme
          </label>
          <button onClick={ekle} disabled={ekliyor}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {ekliyor ? 'Ekleniyor...' : 'Firmware Ekle'}
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Yayınlanan Sürümler</h2>
      {loading ? (
        <p className="text-gray-500">Yükleniyor...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">Henüz firmware eklenmemiş</p>
      ) : (
        <div className="space-y-3">
          {list.map(f => (
            <div key={f.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">v{f.version}</span>
                  {f.zorunlu && <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">ZORUNLU</span>}
                  {f.target_device && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">{f.target_device}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{new Date(f.created_at).toLocaleDateString('tr-TR')}</span>
                  <button onClick={() => sil(f.id)} className="text-xs text-red-400 hover:text-red-300">Sil</button>
                </div>
              </div>
              {f.changelog && <p className="text-xs text-gray-400 mb-2 whitespace-pre-wrap">{f.changelog}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {f.boyut > 0 && <span>{(f.boyut / 1024).toFixed(0)} KB</span>}
                <a href={f.dosya_url} target="_blank" className="text-emerald-400 hover:underline">İndir</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gray-800 rounded-2xl p-5 border border-gray-700">
        <h2 className="text-lg font-semibold mb-3">OTA Güncelleme Talimatı</h2>
        <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
          <li>Firmware .bin dosyasını GitHub Releases sayfasına yükleyin</li>
          <li>Yukarıdaki form ile versiyon bilgisini ve URL&apos;yi ekleyin</li>
          <li>ESP32, her gönderimde <code className="text-emerald-300 bg-gray-900 px-1 rounded">/api/firmware/check</code> adresini sorgular</li>
          <li>Yeni sürüm varsa OTA başlar, tamamlanınca cihaz yeniden başlar</li>
        </ol>
      </div>
    </div>
  )
}

export default function FirmwarePage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Yükleniyor...</p>}>
      <FirmwareContent />
    </Suspense>
  )
}
