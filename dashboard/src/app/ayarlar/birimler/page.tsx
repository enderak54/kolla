'use client'

import { useEffect, useState } from 'react'

interface Birim {
  id: number
  tip: string
  ad: string
  parent_id: number | null
}

const tipEtiket: Record<string, string> = { bina: 'Bina', kat: 'Kat', oda: 'Oda', birim: 'Birim' }
const tipRenk: Record<string, string> = { bina: 'text-purple-300', kat: 'text-blue-300', oda: 'text-emerald-300', birim: 'text-yellow-300' }

export default function BirimlerPage() {
  const [list, setList] = useState<Birim[]>([])
  const [loading, setLoading] = useState(true)
  const [tip, setTip] = useState('bina')
  const [ad, setAd] = useState('')
  const [parentId, setParentId] = useState<number | null>(null)
  const [mesaj, setMesaj] = useState('')

  const fetchList = async () => {
    try {
      const res = await fetch('/api/birimler')
      setList(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [])

  const ekle = async () => {
    if (!ad) return
    try {
      await fetch('/api/birimler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip, ad, parent_id: parentId || null }),
      })
      setAd(''); setMesaj('Eklendi')
      fetchList()
    } catch { setMesaj('Hata') }
  }

  const sil = async (id: number) => {
    try {
      await fetch(`/api/birimler?id=${id}`, { method: 'DELETE' })
      setList(prev => prev.filter(b => b.id !== id))
    } catch { setMesaj('Silme hatasi') }
  }

  const parentSecenek = (tip === 'kat' ? list.filter(b => b.tip === 'bina') :
    tip === 'oda' ? list.filter(b => b.tip === 'kat') :
    tip === 'birim' ? list.filter(b => b.tip === 'oda') : [])

  return (
    <div className="max-w-3xl mx-auto">
      <a href="/ayarlar" className="text-emerald-400 hover:text-emerald-300 text-sm">&larr; Ayarlar</a>
      <h1 className="text-2xl font-bold mt-4 mb-6 text-emerald-400">Birim Tanımlamaları</h1>

      {mesaj && <p className="text-emerald-300 mb-4">{mesaj}</p>}

      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-8">
        <div className="flex gap-2 mb-3 flex-wrap">
          {['bina','kat','oda','birim'].map(t => (
            <button key={t} onClick={() => { setTip(t); setParentId(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs ${tip === t ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {tipEtiket[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            {parentSecenek.length > 0 && (
              <select value={parentId ?? ''} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600 mb-2">
                <option value="">Üst birim seçin</option>
                {parentSecenek.map(b => <option key={b.id} value={b.id}>{b.ad}</option>)}
              </select>
            )}
            <input placeholder={`${tipEtiket[tip]} adı`} value={ad} onChange={e => setAd(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <button onClick={ekle} className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">Ekle</button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Yükleniyor...</p> : list.length === 0 ? (
        <p className="text-gray-500">Henüz birim eklenmemiş</p>
      ) : (
        <div className="space-y-1">
          {['bina','kat','oda','birim'].map(t => {
            const filtre = list.filter(b => b.tip === t)
            if (filtre.length === 0) return null
            return (
              <div key={t}>
                <h3 className={`text-sm font-semibold mb-1 ${tipRenk[t]}`}>{tipEtiket[t]}ler</h3>
                {filtre.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200">{b.ad}</span>
                      {b.parent_id && <span className="text-[10px] text-gray-600">→ {list.find(p => p.id === b.parent_id)?.ad || '?'}</span>}
                    </div>
                    <button onClick={() => sil(b.id)} className="text-xs text-red-400 hover:text-red-300">Sil</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
