import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const client = createServiceRoleClient()
    const profile = await client.from('profiles').select('role').eq('id', user.id).single()
    if (profile.data?.role !== 'admin') return res.status(403).json({ error: '无权限' })

    const { data } = await client.from('articles')
      .select('*, profiles!inner(email), reviews(count)')
      .order('created_at', { ascending: false }).limit(100)

    const statusLabels = { pending: '待审', reviewing: '审稿中', reviewed: '已回复', closed: '已完成' }

    res.json((data || []).map(r => ({
      id: r.id, email: r.profiles?.email || '-', title: r.title,
      fileName: r.file_name || '-', round: r.current_round || 0,
      status: statusLabels[r.status] || r.status, statusRaw: r.status,
      createdAt: new Date(r.created_at).toLocaleString('zh-CN'),
    })))
  } catch (e) {
    console.error('Admin articles error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
