import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: '请先登录' })

  const { title, fileName, filePath } = req.body
  if (!title?.trim() || !filePath) return res.status(400).json({ error: '参数不完整' })

  const client = createServiceRoleClient()

  const [artRes, subRes] = await Promise.all([
    client.from('articles').select('id,status,order_id,subscription_id').eq('user_id', user.id),
    client.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
  ])

  const articles = artRes.data || []
  const sub = subRes.data
  const activeCount = articles.filter(a => a.status !== 'closed').length
  const maxConcurrent = sub?.max_concurrent || 1

  if (sub) {
    if (sub.end_date && new Date(sub.end_date) < new Date()) return res.status(400).json({ error: '包月已过期' })
    if (activeCount >= maxConcurrent) return res.status(400).json({ error: `已达同时上传上限 (${maxConcurrent}篇)` })
  } else {
    if (activeCount > 0) return res.status(400).json({ error: '单篇用户一次只能处理 1 篇稿件' })
    const paidOrders = await client.from('orders').select('id').eq('user_id', user.id).eq('type', 'single').eq('status', 'paid')
    if (!paidOrders.data?.length) {
      const hasUsed = articles.some(a => a.order_id && !a.subscription_id && a.status === 'closed')
      if (!hasUsed && articles.length > 0) return res.status(400).json({ error: '请先购买单篇服务' })
    }
  }

  const { data: article, error } = await client.from('articles').insert({
    user_id: user.id, title: title.trim(), file_name: fileName, file_path: filePath, status: 'pending', current_round: 0,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  if (!sub) {
    await client.from('orders').update({ status: 'used' }).eq('user_id', user.id).eq('type', 'single').eq('status', 'paid').limit(1)
  }

  res.json({ success: true, article })
}
