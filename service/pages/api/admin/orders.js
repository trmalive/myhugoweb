import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const client = createServiceRoleClient()
  const profile = await client.from('profiles').select('role').eq('id', user.id).single()
  if (profile.data?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

  const { data } = await client.from('orders').select('*, profiles!inner(email)').order('created_at', { ascending: false }).limit(100)

  const statusLabels = { pending: '待支付', paid: '已支付', used: '已使用', expired: '已过期' }
  const planLabels = { single: '单篇', '3month': '3个月', '6month': '6个月', '12month': '1年' }

  res.json((data || []).map(r => ({
    id: r.id.slice(0, 8), email: r.profiles?.email || '-',
    plan: planLabels[r.type] || r.type, amount: (r.amount_cents / 100).toFixed(0),
    status: statusLabels[r.status] || r.status,
    paidAt: r.paid_at ? new Date(r.paid_at).toLocaleString('zh-CN') : '-',
    createdAt: new Date(r.created_at).toLocaleString('zh-CN'),
  })))
}
