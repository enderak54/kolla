'use client'

import { useEffect, useState } from 'react'

interface EsikSablonu {
  id: number
  ad: string
  aciklama: string
  esikler: { metric: string; min_val: number; max_val: number; enabled: boolean }[]
  aktif_saat_bas: number
  aktif_saat_bit: number
  created_at: string
}

const metricAdlari: Record<string, string> = {
  sicaklik: 'Sıcaklık (°C)', nem: 'Nem (%)', basinc: 'Basınç (hPa)',
  gaz: 'Gaz (ppm)', gaz_lpg: 'LPG (ppm)', gaz_co: 'CO (ppm)', gaz_duman: 'Duman (ppm)', gaz_metan: 'Metan (ppm)', gaz_hidrojen: 'Hidrojen (ppm)',
}
const metricVarsayilan: Record<string, { min: number; max: number }> = {
  sicaklik: { min: 18, max: 30 }, nem: { min: 30, max: 70 }, basinc: { min: 980, max: 1030 },
  gaz: { min: 0, max: 500 }, gaz_lpg: { min: 0, max: 1000 }, gaz_co: { min: 0, max: 300 }, gaz_duman: { min: 0, max: 1000 }, gaz_metan: { min: 0, max: 1000 }, gaz_hidrojen: { min: 0, max: 1000 },
}

const hazirSablonlar = [
  { ad: 'Eczane', aciklama: 'İlaç saklama ortamı (8-23 arası, max 22°C)', esikler: [{ metric: 'sicaklik', min_val: 18, max_val: 22, enabled: true }, { metric: 'nem', min_val: 30, max_val: 60, enabled: true }, { metric: 'basinc', min_val: 980, max_val: 1030, enabled: false }], aktif_saat_bas: 8, aktif_saat_bit: 23 },
  { ad: 'Server Odası', aciklama: 'BT ekipman odası (7/24, max 24°C)', esikler: [{ metric: 'sicaklik', min_val: 18, max_val: 24, enabled: true }, { metric: 'nem', min_val: 20, max_val: 55, enabled: true }, { metric: 'basinc', min_val: 980, max_val: 1030, enabled: false }], aktif_saat_bas: 0, aktif_saat_bit: 24 },
  { ad: 'Depo (Kuru)', aciklama: 'Kuru depo ortamı', esikler: [{ metric: 'sicaklik', min_val: 10, max_val: 30, enabled: true }, { metric: 'nem', min_val: 20, max_val: 50, enabled: true }, { metric: 'basinc', min_val: 980, max_val: 1030, enabled: false }], aktif_saat_bas: 0, aktif_saat_bit: 24 },
  { ad: 'Depo (Soğuk)', aciklama: 'Soğuk hava deposu', esikler: [{ metric: 'sicaklik', min_val: 2, max_val: 8, enabled: true }, { metric: 'nem', min_val: 60, max_val: 90, enabled: false }, { metric: 'basinc', min_val: 980, max_val: 1030, enabled: false }], aktif_saat_bas: 0, aktif_saat_bit: 24 },
  { ad: 'Ofis', aciklama: 'Standart ofis ortamı', esikler: [{ metric: 'sicaklik', min_val: 20, max_val: 26, enabled: true }, { metric: 'nem', min_val: 30, max_val: 65, enabled: true }, { metric: 'basinc', min_val: 980, max_val: 1030, enabled: false }], aktif_saat_bas: 8, aktif_saat_bit: 19 },
  { ad: 'Temiz Oda', aciklama: 'Laboratuvar / temiz oda', esikler: [{ metric: 'sicaklik', min_val: 20, max_val: 22, enabled: true }, { metric: 'nem', min_val: 40, max_val: 60, enabled: true }, { metric: 'basinc', min_val: 990, max_val: 1020, enabled: true }], aktif_saat_bas: 0, aktif_saat_bit: 24 },
]

export default function EsikSablonlariPage() {
  const [list, setList] = useState<EsikSablonu[]>([])
  const [loading, setLoading] = useState(true)
  const [ad, setAd] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [esikler, setEsikler] = useState<{ metric: string; min_val: number; max_val: number; enabled: boolean }[]>(
    Object.entries(metricVarsayilan).map(([k, v]) => ({ metric: k, min_val: v.min, max_val: v.max, enabled: true }))
  )
  const [aktifSaatBas, setAktifSaatBas] = useState(0)
  const [aktifSaatBit, setAktifSaatBit] = useState(24)
  const [mesaj, setMesaj] = useState('')

  const fetchList = async () => {
    try {
      const res = await fetch('/api/esik-sablonlari')
      setList(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [])

  const sablonuYukle = (s: typeof hazirSablonlar[0]) => {
    setAd(s.ad); setAciklama(s.aciklama); setAktifSaatBas(s.aktif_saat_bas); setAktifSaatBit(s.aktif_saat_bit)
    setEsikler(esikler.map(e => {
      const bul = s.esikler.find(se => se.metric === e.metric)
      return bul || e
    }))
  }

  const ekle = async () => {
    if (!ad) return
    try {
      await fetch('/api/esik-sablonlari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad, aciklama, esikler, aktif_saat_bas: aktifSaatBas, aktif_saat_bit: aktifSaatBit }),
      })
      setAd(''); setAciklama(''); setMesaj('Eklendi')
      fetchList()
    } catch { setMesaj('Hata') }
  }

  const sil = async (id: number) => {
    try {
      await fetch(`/api/esik-sablonlari?id=${id}`, { method: 'DELETE' })
      setList(prev => prev.filter(s => s.id !== id))
    } catch { setMesaj('Silme hatasi') }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <a href="/ayarlar" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Ayarlar</a>
      <h1 className="text-2xl font-bold mt-4 mb-6 text-emerald-400">Eşik Şablonları</h1>

      {mesaj && <p className="text-emerald-300 mb-4">{mesaj}</p>}

      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Hazır Şablonlar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {hazirSablonlar.map(s => (
            <button key={s.ad} onClick={() => sablonuYukle(s)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-xs text-left text-gray-300 transition-colors">
              <span className="font-medium">{s.ad}</span>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.aciklama}</p>
            </button>
          ))}
        </div>

        <h2 className="text-sm font-semibold text-gray-300 mb-3">Yeni Şablon</h2>
        <div className="space-y-3">
          <input placeholder="Şablon adı (örn: Eczane)" value={ad} onChange={e => setAd(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <input placeholder="Açıklama" value={aciklama} onChange={e => setAciklama(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          <div className="flex gap-2 items-center text-sm text-gray-400">
            <span>Aktif saat:</span>
            <input type="number" min={0} max={24} value={aktifSaatBas} onChange={e => setAktifSaatBas(Number(e.target.value))}
              className="w-16 bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 text-center" />
            <span>-</span>
            <input type="number" min={0} max={24} value={aktifSaatBit} onChange={e => setAktifSaatBit(Number(e.target.value))}
              className="w-16 bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 text-center" />
          </div>
          {esikler.map(e => (
            <div key={e.metric} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">{metricAdlari[e.metric]}</span>
              <input type="number" step="0.1" value={e.min_val} onChange={v => setEsikler(prev => prev.map(p => p.metric === e.metric ? { ...p, min_val: Number(v.target.value) } : p))}
                className="w-20 bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 text-center" />
              <span className="text-gray-600">-</span>
              <input type="number" step="0.1" value={e.max_val} onChange={v => setEsikler(prev => prev.map(p => p.metric === e.metric ? { ...p, max_val: Number(v.target.value) } : p))}
                className="w-20 bg-gray-700 rounded px-2 py-1 text-sm text-white border border-gray-600 text-center" />
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input type="checkbox" checked={e.enabled} onChange={v => setEsikler(prev => prev.map(p => p.metric === e.metric ? { ...p, enabled: v.target.checked } : p))} className="accent-emerald-500" />
                Aktif
              </label>
            </div>
          ))}
          <button onClick={ekle} className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Kaydet</button>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3 text-gray-300">Kayıtlı Şablonlar</h2>
      {loading ? <p className="text-gray-500">Yükleniyor...</p> : list.length === 0 ? (
        <p className="text-gray-500">Henüz şablon eklenmemiş</p>
      ) : (
        <div className="space-y-3">
          {list.map(s => (
            <div key={s.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-emerald-300 font-semibold">{s.ad}</span>
                  {s.aciklama && <p className="text-xs text-gray-500">{s.aciklama}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{s.aktif_saat_bas}-{s.aktif_saat_bit}</span>
                  <button onClick={() => sil(s.id)} className="text-xs text-red-400 hover:text-red-300">Sil</button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                {s.esikler.filter(e => e.enabled).map(e => (
                  <span key={e.metric}>{metricAdlari[e.metric].split(' ')[0]}: {e.min_val}-{e.max_val}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
