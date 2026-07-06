import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const client = createServiceRoleClient()
    const profile = await client.from('profiles').select('role').eq('id', user.id).single()
    if (profile.data?.role !== 'admin') return res.status(403).json({ error: '无权限' })

    const [profiles, subscriptions, orders] = await Promise.all([
      client.from('profiles').select('*').order('created_at', { ascending: false }),
      client.from('subscriptions').select('*').eq('status', 'active'),
      client.from('orders').select('user_id,amount_cents').eq('status', 'paid'),
    ])

    const subMap = {}
    ;(subscriptions.data || []).forEach(s => {
      if (!subMap[s.user_id]) subMap[s.user_id] = []
      subMap[s.user_id].push(s)
    })

    const orderTotals = {}
    ;(orders.data || []).forEach(o => { orderTotals[o.user_id] = (orderTotals[o.user_id] || 0) + o.amount_cents })

    res.json((profiles.data || []).filter(p => p.role === 'user').map(p => {
      const subs = subMap[p.id] || []
      return {
        email: p.email,
        totalPaid: ((orderTotals[p.id] || 0) / 100).toFixed(2),
        subscription: subs.length > 0 ? `${subs[0].plan_type} 至 ${new Date(subs[0].end_date).toLocaleDateString('zh-CN')}` : '无',
        createdAt: new Date(p.created_at).toLocaleDateString('zh-CN'),
      }
    }))
  } catch (e) {
    console.error('Admin users error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
