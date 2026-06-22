'use client'

import { useEffect, useState, use } from 'react'

interface Cihaz {
  device_id: string; mac: string | null; sonGuncelleme: number
  sicaklik: number; nem: number; wifiRssi: number | null
  mqttLokal: boolean; mqttAio: boolean; kayitSayisi: number
  ad: string | null; konum: string | null
  kayitli: boolean; esikVar: boolean; aktif: boolean
}

export default function CihazYonetimi({ params }: { params: Promise<{}> }) {
  use(params)
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')
  const [ekleAd, setEkleAd] = useState('')
  const [ekleId, setEkleId] = useState('')
  const [ekleKonum, setEkleKonum] = useState('')

  const fetchCihazlar = async () => {
    try {
      const res = await fetch('/api/cihazlar')
      const data = await res.json()
      if (Array.isArray(data)) setCihazlar(data)
    } catch { setMesaj('Yukleme hatasi') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCihazlar() }, [])

  const sil = async (deviceId: string) => {
    if (!confirm(`${deviceId} silinsin mi? Telemetry ve threshold verileri de silinir.`)) return
    setMesaj('Siliniyor...')
    const res = await fetch(`/api/cihazlar?device_id=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
    if (res.ok) { setMesaj(`${deviceId} silindi`); fetchCihazlar() }
    else setMesaj('Silme hatasi')
  }

  const ekle = async (deviceId: string, ad: string, konum: string) => {
    setMesaj('Ekleniyor...')
    const res = await fetch('/api/cihazlar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, ad, location: konum }),
    })
    if (res.ok) { setMesaj(`${deviceId} eklendi`); fetchCihazlar(); setEkleAd(''); setEkleId(''); setEkleKonum('') }
    else setMesaj('Ekleme hatasi')
  }

  const hizliEkle = async (c: Cihaz) => {
    setMesaj(`${c.device_id} kaydediliyor...`)
    const res = await fetch('/api/cihazlar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: c.device_id, ad: c.device_id, location: '' }),
    })
    if (res.ok) { setMesaj(`${c.device_id} kaydedildi`); fetchCihazlar() }
    else setMesaj('Kayit hatasi')
  }

  const tara = async () => {
    setMesaj('Telemetry taranıyor...')
    fetchCihazlar()
    setTimeout(() => setMesaj('Tarama tamam'), 1500)
  }

  const kayitli = cihazlar.filter(c => c.kayitli)
  const kesfedilen = cihazlar.filter(c => !c.kayitli && c.device_id !== 'BILINMEYEN')

  return (
    <div className="max-w-4xl mx-auto">
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Cihaz Listesi</a>
        <h1 className="text-3xl font-bold mt-2 mb-6 text-emerald-400">Cihaz Yönetimi</h1>

        {mesaj && <p className="text-sm text-gray-400 mb-4">{mesaj}</p>}

        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold mb-4">Yeni Cihaz Ekle</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Cihaz ID</label>
              <input value={ekleId} onChange={e => setEkleId(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-44" placeholder="KOLLA-XXXXXX" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ad</label>
              <input value={ekleAd} onChange={e => setEkleAd(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-36" placeholder="Cihaz adi" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Konum</label>
              <input value={ekleKonum} onChange={e => setEkleKonum(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-36" placeholder="Oda / Bolge" />
            </div>
            <button onClick={() => ekle(ekleId, ekleAd || ekleId, ekleKonum)}
              disabled={!ekleId}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm">
              Ekle
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button onClick={tara}
            className="bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <span>⟳</span> Tara (Keşfet)
          </button>
          <span className="text-xs text-gray-500">{cihazlar.length} cihaz bulundu</span>
        </div>

        {kesfedilen.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-amber-400 mb-3">Keşfedilen Cihazlar ({kesfedilen.length})</h2>
            <p className="text-xs text-gray-500 mb-3">Telemetry'de veri gönderen ama kayıtlı olmayan cihazlar</p>
            <div className="space-y-2">
              {kesfedilen.map(c => (
                <div key={c.device_id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3 border border-amber-800/30">
                  <div>
                    <span className="font-medium">{c.device_id}</span>
                    {c.mac && <span className="text-[10px] text-gray-500 ml-2 font-mono">{c.mac}</span>}
                    <span className="text-xs text-gray-500 ml-2">{c.kayitSayisi} kayit</span>
                    {c.aktif && <span className="text-[10px] text-emerald-400 ml-2">AKTIF</span>}
                  </div>
                  <button onClick={() => hizliEkle(c)}
                    className="bg-amber-700 hover:bg-amber-600 px-3 py-1 rounded-lg text-xs">
                    Hizli Kaydet
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <h2 className="text-lg font-semibold p-5 pb-0">Kayıtlı Cihazlar ({kayitli.length})</h2>
          {loading ? (
            <p className="text-gray-400 p-5">Yükleniyor...</p>
          ) : kayitli.length === 0 ? (
            <p className="text-gray-500 p-5">Henüz kayıtlı cihaz yok</p>
          ) : (
            <div className="p-5 space-y-2">
              {kayitli.map(c => (
                <div key={c.device_id} className="flex items-center justify-between bg-gray-700/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${c.aktif ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    <div>
                      <a href={`/cihaz/${encodeURIComponent(c.device_id)}`} className="font-medium hover:text-emerald-300">
                        {c.ad || c.device_id}
                      </a>
                      <div className="text-xs text-gray-500">
                        {c.device_id}{c.mac && ` · ${c.mac}`}{c.konum && ` · ${c.konum}`}{c.esikVar && ' · Esikli'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{c.kayitSayisi} kayit</span>
                    <a href={`/cihaz/${encodeURIComponent(c.device_id)}/yapilandirma`}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1">✎</a>
                    <button onClick={() => sil(c.device_id)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-6">
          Silme islemi: thresholds + telemetry + devices tablosundan kayitlari siler.
        </p>
      </div>
  )
}