import { supabase } from '@/lib/supabase'

export async function auditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  detay?: Record<string, unknown>,
  userId?: string,
  userEmail?: string,
  ipAddress?: string
) {
  try {
    await supabase.from('kolla_audit_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      detay,
      user_id: userId || null,
      user_email: userEmail || null,
      ip_address: ipAddress || null,
    })
  } catch (e) {
    console.error('Audit log yazılamadı:', e)
  }
}