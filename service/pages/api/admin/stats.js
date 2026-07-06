import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const client = createServiceRoleClient()
    const profile = await client.from('profiles').select('role').eq('id', user.id).single()
    if (profile.data?.role !== 'admin') return res.status(403).json({ error: '无权限' })

    const [ordersRes, articlesRes, subsRes, usersRes] = await Promise.all([
      client.from('orders').select('type,amount_cents,status').eq('status', 'paid'),
      client.from('articles').select('status'),
      client.from('subscriptions').select('plan_type,status').eq('status', 'active'),
      client.from('profiles').select('id,role').eq('role', 'user'),
    ])

    const orders = ordersRes.data || []
    const totalRevenue = orders.reduce((s, o) => s + o.amount_cents, 0)
    const counts = { single: 0, '3month': 0, '6month': 0, '12month': 0 }
    orders.forEach(o => { counts[o.type] = (counts[o.type] || 0) + 1 })

    const articleStatus = { pending: 0, reviewing: 0, reviewed: 0, closed: 0 }
    ;(articlesRes.data || []).forEach(a => { articleStatus[a.status] = (articleStatus[a.status] || 0) + 1 })

    res.json({
      totalRevenue,
      totalOrders: orders.length,
      activeSubscriptions: (subsRes.data || []).length,
      totalUsers: (usersRes.data || []).length,
      orderCounts: counts,
      articleStatus,
    })
  } catch (e) {
    console.error('Admin stats error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
