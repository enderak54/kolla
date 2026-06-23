'use client'

import { useEffect, useState } from 'react'

interface Kanal {
  id: number
  kanal: string
  etiket: string
  ayarlar: Record<string, string>
  aktif: boolean
}

export default function BildirimAyarlariPage() {
  const [kanallar, setKanallar] = useState<Kanal[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    fetch('/api/bildirim/kanallar').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setKanallar(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const guncelle = async (kanal: string, alan: string, deger: any) => {
    setKanallar(prev => prev.map(k => k.kanal === kanal ? { ...k, [alan]: alan === 'ayarlar' ? { ...k.ayarlar, ...deger } : deger } : k))
  }

  const kaydet = async (kanal: string) => {
    setKaydediliyor(true)
    const k = kanallar.find(x => x.kanal === kanal)
    if (!k) return
    try {
      const res = await fetch('/api/bildirim/kanallar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanal: k.kanal, ayarlar: k.ayarlar, aktif: k.aktif }),
      })
      setMesaj(res.ok ? `${k.etiket} kaydedildi` : 'Hata')
    } catch { setMesaj('Hata') }
    finally { setKaydediliyor(false) }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <a href="/ayarlar" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Ayarlar</a>
      <h1 className="text-2xl font-bold mt-4 mb-6 text-emerald-400">Bildirim Ayarları</h1>

      {mesaj && <p className="text-emerald-300 mb-4">{mesaj}</p>}

      {loading ? <p className="text-gray-500">Yükleniyor...</p> : (
        <div className="space-y-4">
          {kanallar.map(k => (
            <div key={k.kanal} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-200">{k.etiket}</h2>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" checked={k.aktif} onChange={e => guncelle(k.kanal, 'aktif', e.target.checked)}
                    className="accent-emerald-500" />
                  Aktif
                </label>
              </div>

              {k.kanal === 'telegram' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Bot Token</label>
                    <input type="password" value={k.ayarlar.bot_token || ''} onChange={e => guncelle(k.kanal, 'ayarlar', { bot_token: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 font-mono"
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Chat ID</label>
                    <input value={k.ayarlar.chat_id || ''} onChange={e => guncelle(k.kanal, 'ayarlar', { chat_id: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600"
                      placeholder="-1001234567890" />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    @BotFather ile bot oluştur, token al. /start yapıp chat ID'yi öğrenmek için @userinfobot kullan.
                  </p>
                </div>
              )}

              {k.kanal === 'ekran' && (
                <p className="text-sm text-gray-400">Dashboard ekranı bildirimleri her zaman aktiftir.</p>
              )}

              <button onClick={() => kaydet(k.kanal)} disabled={kaydediliyor}
                className="mt-4 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                Kaydet
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
