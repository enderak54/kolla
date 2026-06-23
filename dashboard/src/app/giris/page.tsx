'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function GirisPage() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState('')
  const [mod, setMod] = useState<'giris' | 'kayit'>('giris')

  const sessionCookieye = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setHata('')
    try {
      if (mod === 'giris') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
        if (error) throw error
        await sessionCookieye()
        window.location.href = '/'
      } else {
        const { error } = await supabase.auth.signUp({ email, password: sifre })
        if (error) throw error
        setHata('Kayıt başarılı! E-postanızı kontrol edin.')
      }
    } catch (err: any) { setHata(err.message || 'Hata') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-emerald-400 text-center mb-2">Kolla</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Ortam Takip Sistemi</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Şifre</label>
            <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} required minLength={6}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white border border-gray-600" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'İşleniyor...' : mod === 'giris' ? 'Giriş Yap' : 'Kaydol'}
          </button>
        </form>

        {hata && <p className={`text-sm mt-4 text-center ${hata.includes('başarılı') ? 'text-emerald-400' : 'text-red-400'}`}>{hata}</p>}

        <p className="text-xs text-gray-500 text-center mt-6">
          {mod === 'giris' ? (
            <>Hesabınız yok mu? <button onClick={() => setMod('kayit')} className="text-emerald-400 hover:underline">Kaydol</button></>
          ) : (
            <>Zaten hesabınız var mı? <button onClick={() => setMod('giris')} className="text-emerald-400 hover:underline">Giriş Yap</button></>
          )}
        </p>
      </div>
    </div>
  )
}
