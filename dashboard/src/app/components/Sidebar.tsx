'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const menu = [
  { label: 'Cihazlar', href: '/', icon: '📡' },
  { label: 'Cihaz Yönetimi', href: '/cihaz-yonetimi', icon: '⚙' },
  { label: 'Raporlar', href: '/raporlar', icon: '📊' },
  { label: 'Birimler', href: '/ayarlar/birimler', icon: '🏠' },
  { label: 'Eşik Şablonları', href: '/ayarlar/esik-sablonlari', icon: '📋' },
  { label: 'Firmware', href: '/firmware', icon: '📦' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-emerald-400 font-bold text-lg">Kolla</h1>
        <p className="text-[10px] text-gray-500 mt-0.5">Medikal Takip Sistemi</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menu.map(item => {
          const aktif = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                aktif ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-700">
        <p className="text-[10px] text-gray-600 text-center">KOLLA v1.0</p>
      </div>
    </aside>
  )
}
