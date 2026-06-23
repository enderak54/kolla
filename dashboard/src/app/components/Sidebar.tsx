'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const menu = [
  { label: 'Cihazlar', href: '/', icon: '📡' },
  { label: 'Cihaz Yönetimi', href: '/cihaz-yonetimi', icon: '⚙' },
  { label: 'Raporlar', href: '/raporlar', icon: '📊' },
  { label: 'Karşılaştırma', href: '/karsilastirma', icon: '📈' },
  { label: 'Isı Haritası', href: '/isi-haritasi', icon: '🔥' },
  { label: 'Bildirimler', href: '/bildirimler', icon: '🔔' },
  { label: 'Birimler', href: '/ayarlar/birimler', icon: '🏠' },
  { label: 'Eşik Şablonları', href: '/ayarlar/esik-sablonlari', icon: '📋' },
  { label: 'Kamera', href: '/kamera', icon: '📷' },
  { label: 'Firmware', href: '/firmware', icon: '📦' },
  { label: 'Denetim', href: '/audit', icon: '📋' },
  { label: 'Ayarlar', href: '/ayarlar', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [bekleyen, setBekleyen] = useState(0)
  const [kullanici, setKullanici] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setKullanici(session.user)
    })
  }, [])

  const cikis = async () => {
    await supabase.auth.signOut()
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/giris')
  }

  useEffect(() => {
    const fetchBildirim = async () => {
      try {
        const res = await fetch('/api/bildirim?durum=bekliyor&limit=1')
        const data = await res.json()
        if (Array.isArray(data)) setBekleyen(data.length > 0 ? data.length : 0)
      } catch {}
    }
    fetchBildirim()
    const interval = setInterval(fetchBildirim, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-emerald-400 font-bold text-lg">Kolla</h1>
        <p className="text-[10px] text-gray-500 mt-0.5">Ortam Takip Sistemi</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menu.map(item => {
          const aktif = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const bildirimVar = item.href === '/bildirimler' && bekleyen > 0
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                aktif ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}>
              <span className="text-base relative">
                {item.icon}
                {bildirimVar && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_4px_#ef4444]" />
                )}
              </span>
              <span>{item.label}</span>
              {bildirimVar && <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{bekleyen}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-700 space-y-2">
        {kullanici && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{kullanici.email}</span>
            <button onClick={cikis} className="text-[10px] text-red-400 hover:text-red-300">Çıkış</button>
          </div>
        )}
        <p className="text-[10px] text-gray-600 text-center">KOLLA v2.0</p>
      </div>
    </aside>
  )
}
