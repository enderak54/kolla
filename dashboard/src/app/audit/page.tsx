'use client'

import { useEffect, useState } from 'react'

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setLogs(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Denetim Günlüğü</h1>

      {loading ? <p className="text-gray-500">Yükleniyor...</p> : logs.length === 0 ? (
        <p className="text-gray-500 text-center py-10">Kayıt bulunamadı</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2">Tarih</th>
                <th className="text-left px-3 py-2">Kullanıcı</th>
                <th className="text-left px-3 py-2">İşlem</th>
                <th className="text-left px-3 py-2">Nesne</th>
                <th className="text-left px-3 py-2">Detay</th>
                <th className="text-left px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(r => (
                <tr key={r.id} className="border-t border-gray-700/50 hover:bg-gray-800/50">
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{new Date(r.created_at).toLocaleString('tr-TR')}</td>
                  <td className="px-3 py-2 text-emerald-300">{r.user_email || r.user_id || '-'}</td>
                  <td className="px-3 py-2 text-gray-200">{r.action}</td>
                  <td className="px-3 py-2 text-gray-400">{r.entity_type || r.table_name}{r.entity_id || r.record_id ? ` #${r.entity_id || r.record_id}` : ''}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{r.detay ? JSON.stringify(r.detay) : r.action === 'UPDATE' ? JSON.stringify(r.new_values) : ''}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{r.ip_address || r.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
