'use client'

import Link from 'next/link'

export default function AyarlarPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Ayarlar</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/ayarlar/birimler"
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700 transition-colors">
          <span className="text-2xl">🏠</span>
          <h2 className="text-lg font-semibold mt-2 text-gray-200">Birimler</h2>
          <p className="text-sm text-gray-500 mt-1">Bina, kat, oda ve birim tanımlamaları</p>
        </Link>
        <Link href="/ayarlar/esik-sablonlari"
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700 transition-colors">
          <span className="text-2xl">📋</span>
          <h2 className="text-lg font-semibold mt-2 text-gray-200">Eşik Şablonları</h2>
          <p className="text-sm text-gray-500 mt-1">Ortam şartları için hazır profiller (eczane, depo, server odası...)</p>
        </Link>
        <Link href="/ayarlar/bildirim"
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700 transition-colors">
          <span className="text-2xl">🔔</span>
          <h2 className="text-lg font-semibold mt-2 text-gray-200">Bildirim Kanalları</h2>
          <p className="text-sm text-gray-500 mt-1">Telegram Bot, e-posta ve diğer bildirim ayarları</p>
        </Link>
        <Link href="/ayarlar/saklama"
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700 transition-colors">
          <span className="text-2xl">🗄</span>
          <h2 className="text-lg font-semibold mt-2 text-gray-200">Veri Saklama</h2>
          <p className="text-sm text-gray-500 mt-1">Telemetry saklama süreleri ve temizleme politikası</p>
        </Link>
        <Link href="/ayarlar/kamera"
          className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-emerald-700 transition-colors">
          <span className="text-2xl">📷</span>
          <h2 className="text-lg font-semibold mt-2 text-gray-200">Kamera Ayarları</h2>
          <p className="text-sm text-gray-500 mt-1">ESP32-CAM snapshot aralığı ve alarm tetikleme</p>
        </Link>
      </div>
    </div>
  )
}
